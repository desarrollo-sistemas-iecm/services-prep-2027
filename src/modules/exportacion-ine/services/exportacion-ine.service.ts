import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { OnEvent } from '@nestjs/event-emitter';
import { Repository } from 'typeorm';
import { CorteLegacyEntity } from '../../resultados-legacy/entities/corte-legacy.entity';
import { CortesService } from '../../cortes/services/cortes.service';
import { ExportDipService } from './export-dip.service';
import { ExportAlcService } from './export-alc.service';
import { crearZipBuffer } from '../utils/zip-buffer.util';
import { CORTE_ACTIVATED_EVENT } from '../../cortes/events/corte-activated.event';
import type { CorteActivatedPayload } from '../../cortes/events/corte-activated.event';

interface CacheZipIne {
  cutId: string;
  fechacorte: string;
  buffer: Buffer;
}

/**
 * Orquesta la exportación INE: al activarse un corte (evento `corte.activated`) o al arrancar el proceso
 * con un corte ya `ACTIVATED`, corre los generadores dip/alc en paralelo y cachea el ZIP anidado en
 * memoria. El `GET` solo sirve esta caché — nunca recalcula por petición (los cortes ocurren cada
 * 10-20 minutos, no tiene caso recomputar en cada descarga).
 */
@Injectable()
export class ExportacionIneService implements OnModuleInit {
  private readonly logger = new Logger(ExportacionIneService.name);
  private cache: CacheZipIne | null = null;

  constructor(
    @InjectRepository(CorteLegacyEntity, 'resultados')
    private readonly corteLegacyRepository: Repository<CorteLegacyEntity>,
    private readonly exportDipService: ExportDipService,
    private readonly exportAlcService: ExportAlcService,
    private readonly cortesService: CortesService,
  ) {}

  async onModuleInit(): Promise<void> {
    const activo = await this.cortesService.getActive();
    if (activo) {
      await this.regenerar(activo.cutId);
    }
  }

  @OnEvent(CORTE_ACTIVATED_EVENT)
  async manejarCorteActivado(payload: CorteActivatedPayload): Promise<void> {
    await this.regenerar(payload.cutId);
  }

  obtenerZipActual(): { fechacorte: string; buffer: Buffer } | null {
    if (!this.cache) return null;
    return { fechacorte: this.cache.fechacorte, buffer: this.cache.buffer };
  }

  private async regenerar(cutId: string): Promise<void> {
    try {
      const [corte] = await this.corteLegacyRepository.find();
      if (!corte) {
        this.logger.error(
          `No hay fila en la tabla "corte" para generar la exportación INE del corte ${cutId}`,
        );
        return;
      }

      const fechacorte = `${corte.anio}${corte.mes}${corte.dia}_${corte.hora}${corte.minuto}`;

      const [dip, alc] = await Promise.all([
        this.exportDipService.generar(fechacorte, corte),
        this.exportAlcService.generar(fechacorte, corte),
      ]);

      const buffer = await crearZipBuffer([
        { name: dip.filename, content: dip.zipBuffer },
        { name: alc.filename, content: alc.zipBuffer },
      ]);

      this.cache = { cutId, fechacorte, buffer };
      this.logger.log(
        `Exportación INE regenerada para el corte ${cutId} (${fechacorte})`,
      );
    } catch (error) {
      this.logger.error(
        `Fallo generando la exportación INE para el corte ${cutId}, se conserva la anterior`,
        error instanceof Error ? error.stack : undefined,
      );
    }
  }
}
