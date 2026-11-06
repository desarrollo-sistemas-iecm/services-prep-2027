import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PrepVotosEntity } from '../../resultados-legacy/entities/prep-votos.entity';
import { ScdCasillasEntity } from '../../resultados-legacy/entities/scd-casillas.entity';
import { CorteLegacyEntity } from '../../resultados-legacy/entities/corte-legacy.entity';
import { TipoEleccion } from '../enums/tipo-eleccion.enum';
import { porcentajeCuatroDecimales } from '../utils/porcentaje.util';

export interface AvancePayload {
  actas_capturadas: number;
  actas_capturadas_de: number;
  actas_cap_porcen: string;
  participacion_porcen: string;
  ln: number;
  ln_capturadas: number;
}

export interface CortePayload {
  corte_fecha: string | null;
  corte_hora: string | null;
  dia: string | null;
  mes: string | null;
  anio: number | null;
  hora: string | null;
  minuto: string | null;
  segundo: string | null;
}

interface AgregadoActas {
  cuantos: string | number | null;
  lnCapturadas: string | number | null;
}

interface AgregadoCasillas {
  cuantos: string | number | null;
  ln: string | number | null;
  especiales: string | number | null;
  extranjero: string | number | null;
  lnExtranjero: string | number | null;
}

/**
 * "Avance Entidad" (`avance_jg/_dmr/_alc` de `api_avance_entidad.php`,
 * `getAvanceContabilizadaResumen()` en `funciones.php` de 2024). Verificado
 * contra la BD de producción 2024: JG 65.6653, DMR 65.5782 y ALC 65.9132.
 *
 * Participación ciudadana:
 *
 *   SUM(prep_votos.votacion_total del tipo de elección) × 100
 *   / SUM(scd_casillas.lista_nominal de todas las casillas aprobadas)
 *
 * - Numerador: todas las actas capturadas del tipo de elección (sin filtrar
 *   `contabilizar` ni `validado`, como 2024). Diputaciones usa solo MR: las
 *   actas RP de casilla especial no entran en la participación.
 * - Denominador: lista nominal de todas las casillas con `estatus = 'T'`, no
 *   solo las que ya tienen acta; por eso la participación crece conforme
 *   llegan actas. En alcaldías se resta la lista nominal de las casillas de
 *   voto en el extranjero (`tipo_casilla` `M*`), que no votan esa elección.
 * - No confundir con la participación de "Estadística" por distrito, que
 *   divide entre la lista nominal de las casillas con actas contabilizadas
 *   (`ln_capturadas` aquí).
 *
 * Actas: capturadas = filas de `prep_votos` del tipo (diputaciones suma las
 * RP); esperadas = casillas aprobadas, más las casillas especiales (`S*`) en
 * diputaciones (el `+44` fijo de 2024) y menos las de voto en el extranjero
 * en alcaldías (2024 restaba 1 dos veces al pedir `type=4`; aquí una sola).
 *
 * Los porcentajes van con 4 decimales y sin `%`: el front agrega el símbolo y
 * usa `actas_cap_porcen` como ancho de la barra de avance.
 */
@Injectable()
export class AvanceService {
  constructor(
    @InjectRepository(PrepVotosEntity, 'resultados')
    private readonly votosRepo: Repository<PrepVotosEntity>,
    @InjectRepository(ScdCasillasEntity, 'resultados')
    private readonly casillasRepo: Repository<ScdCasillasEntity>,
    @InjectRepository(CorteLegacyEntity, 'resultados')
    private readonly corteRepo: Repository<CorteLegacyEntity>,
  ) {}

  async obtener(
    type: TipoEleccion,
  ): Promise<{ succes: boolean; avance: AvancePayload; corte: CortePayload }> {
    const tiposActas =
      type === TipoEleccion.DIPUTACION_MR
        ? [TipoEleccion.DIPUTACION_MR, TipoEleccion.REPRESENTACION_PROPORCIONAL]
        : [type];

    const [actas, votacion, casillas] = await Promise.all([
      this.votosRepo
        .createQueryBuilder('p')
        .leftJoin(
          ScdCasillasEntity,
          'c',
          'p.idDistrito = c.idDistrito AND p.idDelegacion = c.idDelegacion AND p.idSeccion = c.idSeccion AND p.tipoCasilla = c.tipoCasilla',
        )
        .select('COUNT(c.idDistrito)', 'cuantos')
        .addSelect('SUM(c.listaNominal)', 'lnCapturadas')
        .where('p.idTipoEleccion IN (:...tipos)', { tipos: tiposActas })
        .getRawOne<AgregadoActas>(),
      this.votosRepo
        .createQueryBuilder('p')
        .select('SUM(p.votacionTotal)', 'votacionTotal')
        .where('p.idTipoEleccion = :type', { type })
        .getRawOne<{ votacionTotal: string | number | null }>(),
      this.casillasRepo
        .createQueryBuilder('c')
        .select('COUNT(c.rowid)', 'cuantos')
        .addSelect('SUM(c.listaNominal)', 'ln')
        .addSelect(
          'SUM(CASE WHEN c.tipoCasilla LIKE :especial THEN 1 ELSE 0 END)',
          'especiales',
        )
        .addSelect(
          'SUM(CASE WHEN c.tipoCasilla LIKE :extranjero THEN 1 ELSE 0 END)',
          'extranjero',
        )
        .addSelect(
          'SUM(CASE WHEN c.tipoCasilla LIKE :extranjero THEN c.listaNominal ELSE 0 END)',
          'lnExtranjero',
        )
        .where('c.estatus = :estatus', { estatus: 'T' })
        .setParameters({ especial: 'S%', extranjero: 'M%' })
        .getRawOne<AgregadoCasillas>(),
    ]);

    const esAlcaldia = type === TipoEleccion.ALCALDIA;
    const actasCapturadas = Number(actas?.cuantos ?? 0);
    const actasCapturadasDe =
      Number(casillas?.cuantos ?? 0) +
      (type === TipoEleccion.DIPUTACION_MR
        ? Number(casillas?.especiales ?? 0)
        : 0) -
      (esAlcaldia ? Number(casillas?.extranjero ?? 0) : 0);
    const ln =
      Number(casillas?.ln ?? 0) -
      (esAlcaldia ? Number(casillas?.lnExtranjero ?? 0) : 0);
    const votacionTotal = Number(votacion?.votacionTotal ?? 0);

    const corteRow = await this.corteRepo.createQueryBuilder('c').getOne();

    return {
      succes: true,
      avance: {
        actas_capturadas: actasCapturadas,
        actas_capturadas_de: actasCapturadasDe,
        actas_cap_porcen: porcentajeCuatroDecimales(
          actasCapturadas,
          actasCapturadasDe,
        ),
        participacion_porcen: porcentajeCuatroDecimales(votacionTotal, ln),
        ln,
        ln_capturadas: Number(actas?.lnCapturadas ?? 0),
      },
      corte: {
        corte_fecha: corteRow?.corteFecha ?? null,
        corte_hora: corteRow?.corteHora ?? null,
        dia: corteRow?.dia ?? null,
        mes: corteRow?.mes ?? null,
        anio: corteRow?.anio ?? null,
        hora: corteRow?.hora ?? null,
        minuto: corteRow?.minuto ?? null,
        segundo: corteRow?.segundo ?? null,
      },
    };
  }
}
