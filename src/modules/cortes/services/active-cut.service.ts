import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CorteReleaseEntity } from '../entities/corte-release.entity';
import { CorteStatus } from '../enums/corte-status.enum';

/**
 * Indica si ya existe un corte activo (dataset de resultados publicado).
 *
 * Una vez activado el primer corte siempre hay uno activo (una activación
 * fallida restaura el anterior), así que el resultado positivo se conserva en
 * memoria y las rutas públicas no consultan `control.db3` en cada petición.
 * El negativo no se conserva: mientras no haya corte se vuelve a consultar.
 */
@Injectable()
export class ActiveCutService {
  private activeCutConfirmed = false;

  constructor(
    @InjectRepository(CorteReleaseEntity, 'control')
    private readonly corteReleaseRepository: Repository<CorteReleaseEntity>,
  ) {}

  async hasActiveCut(): Promise<boolean> {
    if (this.activeCutConfirmed) return true;

    this.activeCutConfirmed = await this.corteReleaseRepository.exists({
      where: { status: CorteStatus.ACTIVATED },
    });

    return this.activeCutConfirmed;
  }
}
