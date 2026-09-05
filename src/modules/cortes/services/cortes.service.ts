import { ConflictException, Injectable, Logger } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import * as crypto from 'crypto';
import * as fs from 'fs';
import { CorteReleaseEntity } from '../entities/corte-release.entity';
import { BitacoraEntryEntity } from '../entities/bitacora-entry.entity';
import { CorteStatus } from '../enums/corte-status.enum';
import { UploadCorteDto } from '../dto/upload-corte.dto';
import { ManifestVerificationService } from './manifest-verification.service';
import { SqliteFileValidationService } from './sqlite-file-validation.service';

export interface UploadCorteOutcome {
  cutId: string;
  status: CorteStatus;
  reused: boolean;
}

@Injectable()
export class CortesService {
  private readonly logger = new Logger(CortesService.name);

  constructor(
    @InjectDataSource('control') private readonly controlDataSource: DataSource,
    @InjectRepository(CorteReleaseEntity, 'control')
    private readonly corteReleaseRepository: Repository<CorteReleaseEntity>,
    private readonly manifestVerificationService: ManifestVerificationService,
    private readonly sqliteFileValidationService: SqliteFileValidationService,
  ) {}

  async upload(
    dto: UploadCorteDto,
    stagedFilePath: string,
    issuedBySubject: string | null,
  ): Promise<UploadCorteOutcome> {
    const fileSha256 = await this.sha256File(stagedFilePath);

    const existing = await this.corteReleaseRepository.findOne({
      where: { cutId: dto.cutId },
    });
    if (existing) {
      if (existing.fileSha256 === fileSha256) {
        return { cutId: existing.cutId, status: existing.status, reused: true };
      }
      throw new ConflictException(
        `El cutId ${dto.cutId} ya existe con un archivo distinto`,
      );
    }

    this.manifestVerificationService.verify(dto.manifest, dto, fileSha256);

    const release = await this.controlDataSource.transaction(
      async (manager) => {
        const created = manager.getRepository(CorteReleaseEntity).create({
          cutId: dto.cutId,
          version: dto.version,
          activationAt: new Date(dto.activationAt),
          status: CorteStatus.UPLOADED,
          fileSha256,
          stagedFilePath,
          issuedBySubject,
        });
        const saved = await manager
          .getRepository(CorteReleaseEntity)
          .save(created);

        await manager.getRepository(BitacoraEntryEntity).save(
          manager.getRepository(BitacoraEntryEntity).create({
            action: 'cortes.upload',
            cutId: dto.cutId,
            actorSubject: issuedBySubject,
            detail: null,
          }),
        );

        return saved;
      },
    );

    setImmediate(() => {
      this.runValidationPipeline(release.cutId).catch((error) => {
        this.logger.error(
          `Fallo el pipeline de validación de ${release.cutId}`,
          error,
        );
      });
    });

    return { cutId: release.cutId, status: release.status, reused: false };
  }

  async getStatus(cutId: string): Promise<CorteReleaseEntity | null> {
    return this.corteReleaseRepository.findOne({ where: { cutId } });
  }

  async getActive(): Promise<CorteReleaseEntity | null> {
    return this.corteReleaseRepository.findOne({
      where: { status: CorteStatus.ACTIVATED },
    });
  }

  private async runValidationPipeline(cutId: string): Promise<void> {
    const release = await this.corteReleaseRepository.findOne({
      where: { cutId },
    });
    if (!release) return;

    await this.transitionStatus(release, CorteStatus.VALIDATING);

    const result = await this.sqliteFileValidationService.validate(
      release.stagedFilePath,
    );

    if (!result.valid) {
      release.failureReason = result.reason ?? 'Archivo inválido';
      await this.transitionStatus(release, CorteStatus.FAILED, result.reason);
      return;
    }

    // TODO: activación automática al llegar `activationAt` (intercambio del
    // DataSource 'resultados') queda fuera de esta entrega — ver contrato.
    await this.transitionStatus(release, CorteStatus.VALIDATED);
  }

  private async transitionStatus(
    release: CorteReleaseEntity,
    status: CorteStatus,
    detail?: string,
  ): Promise<void> {
    await this.controlDataSource.transaction(async (manager) => {
      await manager
        .getRepository(CorteReleaseEntity)
        .update(
          { id: release.id },
          { status, failureReason: release.failureReason ?? null },
        );
      await manager.getRepository(BitacoraEntryEntity).save(
        manager.getRepository(BitacoraEntryEntity).create({
          action: `cortes.${status}`,
          cutId: release.cutId,
          actorSubject: null,
          detail: detail ?? null,
        }),
      );
    });
  }

  private sha256File(filePath: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const hash = crypto.createHash('sha256');
      const stream = fs.createReadStream(filePath);
      stream.on('error', reject);
      stream.on('data', (chunk) => hash.update(chunk));
      stream.on('end', () => resolve(hash.digest('hex')));
    });
  }
}
