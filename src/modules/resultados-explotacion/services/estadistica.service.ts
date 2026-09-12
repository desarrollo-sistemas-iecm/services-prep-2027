import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PrepVotosEntity } from '../../resultados-legacy/entities/prep-votos.entity';
import { ScdCasillasEntity } from '../../resultados-legacy/entities/scd-casillas.entity';
import { NourbanasEntity } from '../../resultados-legacy/entities/nourbanas.entity';
import { TipoEleccion } from '../enums/tipo-eleccion.enum';
import { formatearPorcentaje } from '../utils/porcentaje.util';

export interface EstadisticaPayload {
  actas: {
    esperadas: number;
    computadas: number;
    esperadas_por: string;
    computadas_por: string;
  };
  cantidades_urbanas: { urbanas: number; no_urbanas: number };
  lista_nominal: {
    lista_nominal_oficial: number;
    actas_contabilizadas: number;
  };
  votos: {
    votos_casillas_normales: number;
    votos_casillas_especiales: number;
    total_votos: number;
    suma_total_votos: number;
    total_votos_query: number;
  };
}

/**
 * Equivalente a la sección estadística de `api_avance_entidad.php`
 * (docs/CONSULTAS_SQL_PREP2024.md §1.1 "esperadas", §1.2 "computadas") y a
 * `test_nourbanas.php`/`urbanasNoUrbanasENTIDAD()` (§1.16/§15, duplicadas en
 * el PHP original — aquí unificadas en un solo método).
 *
 * CORRECCIÓN: igual que en `ResumenVotacionService`, `votos_casillas_normales`
 * / `votos_casillas_especiales` invierten la etiqueta que trae el doc fuente
 * para el prefijo `S` de `tipo_casilla` — `S` es Casilla Especial, no normal
 * (confirmado contra `cat_tipo_casilla` y contra un corte real en
 * `data/database.db3`, donde la condición del doc daba 0 votos "normales").
 *
 * TODO: el doc fuente no especifica la fórmula de `esperadas_por` ni la
 * diferencia real entre `total_votos` y `total_votos_query` (el PHP original
 * trae ambos con el mismo valor aparente) — aquí `esperadas_por` se fija en
 * `100.00%` (referencia) y `total_votos_query` se iguala a `total_votos`.
 * Confirmar contra un corte real de 2024 antes de usarse en producción.
 */
@Injectable()
export class EstadisticaService {
  constructor(
    @InjectRepository(PrepVotosEntity, 'resultados')
    private readonly votosRepo: Repository<PrepVotosEntity>,
    @InjectRepository(ScdCasillasEntity, 'resultados')
    private readonly casillasRepo: Repository<ScdCasillasEntity>,
    @InjectRepository(NourbanasEntity, 'resultados')
    private readonly nourbanasRepo: Repository<NourbanasEntity>,
  ) {}

  async obtener(
    type: TipoEleccion,
  ): Promise<{ succes: boolean; msg: string; data: EstadisticaPayload }> {
    const esperadas = await this.casillasRepo
      .createQueryBuilder('c')
      .select('COUNT(c.estatus)', 'cuantos')
      .addSelect('SUM(c.listaNominal)', 'ln')
      .where("c.estatus = 'T'")
      .getRawOne<{ cuantos: string | number; ln: string | number | null }>();

    const computadasBase = () =>
      this.votosRepo
        .createQueryBuilder('p')
        .leftJoin(
          ScdCasillasEntity,
          'c',
          'p.idDistrito = c.idDistrito AND p.idDelegacion = c.idDelegacion AND p.idSeccion = c.idSeccion AND p.tipoCasilla = c.tipoCasilla',
        )
        .where('p.contabilizar = :contabilizar', { contabilizar: 'T' })
        .andWhere('p.idTipoEleccion = :type', { type });

    const computadas = await computadasBase()
      .select('COUNT(c.idDistrito)', 'cuantos')
      .getRawOne<{ cuantos: string | number }>();

    // `S` = Casilla Especial (ver corrección documentada en la clase).
    const votosEspeciales = await computadasBase()
      .andWhere("substr(p.tipoCasilla, 1, 1) = 'S'")
      .select('SUM(p.votacionTotal)', 'total')
      .getRawOne<{ total: string | number | null }>();

    const votosNormales = await computadasBase()
      .andWhere("substr(p.tipoCasilla, 1, 1) <> 'S'")
      .select('SUM(p.votacionTotal)', 'total')
      .getRawOne<{ total: string | number | null }>();

    const totalVotos = await computadasBase()
      .select('SUM(p.votacionTotal)', 'total')
      .getRawOne<{ total: string | number | null }>();

    const clavesNourbanas = this.nourbanasRepo
      .createQueryBuilder('n')
      .select('n.claveMdc', 'claveMdc');

    const urbanas = await this.votosRepo
      .createQueryBuilder('p')
      .select('COUNT(p.idDistrito)', 'cuantos')
      .where('p.idTipoEleccion = :type', { type })
      .andWhere("p.contabilizar = 'T'")
      .andWhere(`p.claveMdc NOT IN (${clavesNourbanas.getQuery()})`)
      .setParameters(clavesNourbanas.getParameters())
      .getRawOne<{ cuantos: string | number }>();

    const noUrbanas = await this.votosRepo
      .createQueryBuilder('p')
      .select('COUNT(p.idDistrito)', 'cuantos')
      .where('p.idTipoEleccion = :type', { type })
      .andWhere("p.contabilizar = 'T'")
      .andWhere(`p.claveMdc IN (${clavesNourbanas.getQuery()})`)
      .setParameters(clavesNourbanas.getParameters())
      .getRawOne<{ cuantos: string | number }>();

    const esperadasCuantos = Number(esperadas?.cuantos ?? 0);
    const computadasCuantos = Number(computadas?.cuantos ?? 0);
    const total = Number(totalVotos?.total ?? 0);
    const normales = Number(votosNormales?.total ?? 0);
    const especiales = Number(votosEspeciales?.total ?? 0);

    return {
      succes: true,
      msg: 'La información se obtuvo correctamente.',
      data: {
        actas: {
          esperadas: esperadasCuantos,
          computadas: computadasCuantos,
          esperadas_por: '100.00%',
          computadas_por: formatearPorcentaje(
            computadasCuantos,
            esperadasCuantos,
          ),
        },
        cantidades_urbanas: {
          urbanas: Number(urbanas?.cuantos ?? 0),
          no_urbanas: Number(noUrbanas?.cuantos ?? 0),
        },
        lista_nominal: {
          lista_nominal_oficial: Number(esperadas?.ln ?? 0),
          actas_contabilizadas: computadasCuantos,
        },
        votos: {
          votos_casillas_normales: normales,
          votos_casillas_especiales: especiales,
          total_votos: total,
          suma_total_votos: normales + especiales,
          total_votos_query: total,
        },
      },
    };
  }
}
