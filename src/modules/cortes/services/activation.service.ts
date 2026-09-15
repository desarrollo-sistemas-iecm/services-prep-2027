import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import * as fs from 'fs';
import * as path from 'path';
import { CorteReleaseEntity } from '../entities/corte-release.entity';
import { BitacoraEntryEntity } from '../entities/bitacora-entry.entity';
import { CorteStatus } from '../enums/corte-status.enum';
import { RESULTADOS_LEGACY_TABLE_NAMES } from '../../resultados-legacy/resultados-legacy.module';
import {
  CORTE_ACTIVATED_EVENT,
  CorteActivatedPayload,
} from '../events/corte-activated.event';

const ARCHIVE_RETENTION = 2;

/**
 * Activa de forma atómica un corte ya `VALIDATED`: reemplaza el archivo vivo
 * (`DB_STORAGE`) por el corte subido, reabre el DataSource `resultados` y, si
 * algo falla, restaura el corte anterior desde `data/archive`. Mono-instancia
 * a propósito: SQLite es de un solo escritor, igual que el resto del sistema.
 */
@Injectable()
export class ActivationService implements OnModuleInit {
  private readonly logger = new Logger(ActivationService.name);
  private activating = false;
  private readonly timers = new Map<string, NodeJS.Timeout>();

  constructor(
    @InjectDataSource('control')
    private readonly controlDataSource: DataSource,
    @InjectRepository(CorteReleaseEntity, 'control')
    private readonly corteReleaseRepository: Repository<CorteReleaseEntity>,
    @InjectDataSource('resultados')
    private readonly resultadosDataSource: DataSource,
    private readonly configService: ConfigService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  /**
   * Recupera activaciones programadas que quedaron pendientes tras un
   * reinicio del contenedor (rule 11.4 del contrato de cortes).
   */
  async onModuleInit(): Promise<void> {
    const pending = await this.corteReleaseRepository.find({
      where: { status: CorteStatus.VALIDATED },
    });
    for (const release of pending) {
      try {
        await this.scheduleOrActivate(release.cutId, release.activationAt);
      } catch (error) {
        this.logger.error(
          `No se pudo reprogramar la activación de ${release.cutId}`,
          error instanceof Error ? error.stack : undefined,
        );
      }
    }
  }

  async scheduleOrActivate(cutId: string, activationAt: Date): Promise<void> {
    const delayMs = activationAt.getTime() - Date.now();
    if (delayMs <= 0) {
      await this.activate(cutId);
      return;
    }

    this.clearTimer(cutId);
    const timer = setTimeout(() => {
      this.activate(cutId).catch((error: Error) =>
        this.logger.error(`Fallo al activar ${cutId}`, error.stack),
      );
    }, delayMs);
    timer.unref();
    this.timers.set(cutId, timer);
  }

  async activate(cutId: string): Promise<void> {
    if (this.activating) {
      this.logger.warn(
        `Activación de ${cutId} pospuesta: ya hay una activación en curso`,
      );
      setTimeout(() => {
        this.activate(cutId).catch((error: Error) =>
          this.logger.error(
            `Fallo al reintentar activar ${cutId}`,
            error.stack,
          ),
        );
      }, 2000).unref();
      return;
    }

    this.activating = true;
    try {
      await this.doActivate(cutId);
    } finally {
      this.activating = false;
    }
  }

  private async doActivate(cutId: string): Promise<void> {
    this.clearTimer(cutId);

    const release = await this.corteReleaseRepository.findOne({
      where: { cutId },
    });
    if (!release || release.status !== CorteStatus.VALIDATED) {
      return;
    }

    const currentActive = await this.corteReleaseRepository.findOne({
      where: { status: CorteStatus.ACTIVATED },
    });
    if (
      currentActive &&
      this.compareVersions(release.version, currentActive.version) <= 0
    ) {
      await this.markFailed(
        release,
        `La versión ${release.version} no es posterior a la versión activa ${currentActive.version}`,
      );
      return;
    }

    const dbStoragePath = path.resolve(
      process.cwd(),
      this.configService.getOrThrow<string>('DB_STORAGE'),
    );
    const archiveDir = path.join(path.dirname(dbStoragePath), 'archive');
    fs.mkdirSync(archiveDir, { recursive: true });

    let archivedPath: string | null = null;

    try {
      if (fs.existsSync(dbStoragePath)) {
        archivedPath = path.join(
          archiveDir,
          `${Date.now()}-${currentActive?.cutId ?? 'previo'}.db3`,
        );
        fs.copyFileSync(dbStoragePath, archivedPath);
      }

      if (this.resultadosDataSource.isInitialized) {
        await this.resultadosDataSource.destroy();
      }

      fs.renameSync(release.stagedFilePath, dbStoragePath);

      await this.resultadosDataSource.initialize();
      await this.sanityCheck();

      await this.controlDataSource.transaction(async (manager) => {
        if (currentActive) {
          await manager
            .getRepository(CorteReleaseEntity)
            .update({ id: currentActive.id }, { status: CorteStatus.ARCHIVED });
        }
        await manager
          .getRepository(CorteReleaseEntity)
          .update(
            { id: release.id },
            { status: CorteStatus.ACTIVATED, failureReason: null },
          );
        await manager.getRepository(BitacoraEntryEntity).save(
          manager.getRepository(BitacoraEntryEntity).create({
            action: 'cortes.activated',
            cutId: release.cutId,
            actorSubject: null,
            detail: null,
          }),
        );
      });

      this.eventEmitter.emit(CORTE_ACTIVATED_EVENT, {
        cutId: release.cutId,
      } satisfies CorteActivatedPayload);

      fs.rmSync(path.dirname(release.stagedFilePath), {
        recursive: true,
        force: true,
      });
      this.pruneArchive(archiveDir);
    } catch (error) {
      const reason =
        error instanceof Error ? error.message : 'Error desconocido';
      this.logger.error(
        `Fallo activando ${cutId}, restaurando corte anterior`,
        error instanceof Error ? error.stack : undefined,
      );

      if (archivedPath && fs.existsSync(archivedPath)) {
        fs.copyFileSync(archivedPath, dbStoragePath);
      }
      if (this.resultadosDataSource.isInitialized) {
        await this.resultadosDataSource.destroy().catch(() => undefined);
      }
      await this.resultadosDataSource.initialize().catch((reinitError) => {
        this.logger.error(
          'No se pudo reabrir el DataSource de resultados tras el rollback',
          reinitError instanceof Error ? reinitError.stack : undefined,
        );
      });

      await this.markFailed(release, reason);
    }
  }

  private async sanityCheck(): Promise<void> {
    const [firstTable] = RESULTADOS_LEGACY_TABLE_NAMES;
    await this.resultadosDataSource.query(
      `SELECT COUNT(*) as count FROM ${firstTable}`,
    );
  }

  private async markFailed(
    release: CorteReleaseEntity,
    reason: string,
  ): Promise<void> {
    await this.controlDataSource.transaction(async (manager) => {
      await manager
        .getRepository(CorteReleaseEntity)
        .update(
          { id: release.id },
          { status: CorteStatus.FAILED, failureReason: reason },
        );
      await manager.getRepository(BitacoraEntryEntity).save(
        manager.getRepository(BitacoraEntryEntity).create({
          action: 'cortes.activation_failed',
          cutId: release.cutId,
          actorSubject: null,
          detail: reason,
        }),
      );
    });
  }

  private pruneArchive(archiveDir: string): void {
    const files = fs
      .readdirSync(archiveDir)
      .filter((name) => name.endsWith('.db3'))
      .sort();
    const excess = files.length - ARCHIVE_RETENTION;
    for (let i = 0; i < excess; i += 1) {
      fs.rmSync(path.join(archiveDir, files[i]), { force: true });
    }
  }

  private clearTimer(cutId: string): void {
    const existing = this.timers.get(cutId);
    if (existing) {
      clearTimeout(existing);
    }
    this.timers.delete(cutId);
  }

  /**
   * Compara versiones por segmentos numéricos (`1.10` > `1.2`); si algún
   * segmento no es numérico, cae a comparación de cadena de ese segmento.
   */
  private compareVersions(a: string, b: string): number {
    const segmentsA = a.split('.');
    const segmentsB = b.split('.');
    const length = Math.max(segmentsA.length, segmentsB.length);

    for (let i = 0; i < length; i += 1) {
      const segA = segmentsA[i] ?? '0';
      const segB = segmentsB[i] ?? '0';
      const numA = Number(segA);
      const numB = Number(segB);

      if (!Number.isNaN(numA) && !Number.isNaN(numB)) {
        if (numA !== numB) return numA - numB;
      } else if (segA !== segB) {
        return segA < segB ? -1 : 1;
      }
    }
    return 0;
  }
}
