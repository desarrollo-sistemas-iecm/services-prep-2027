import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PrepVotosEntity } from '../../resultados-legacy/entities/prep-votos.entity';
import { TipoEleccion } from '../enums/tipo-eleccion.enum';
import {
  asColumnaVotosSegura,
  CandidatoCatalogo,
  TipoEleccionCatalogoService,
} from './tipo-eleccion-catalogo.service';
import { porcentajeNumerico } from '../utils/porcentaje.util';
import { distribuirVotosCombinaciones } from '../utils/distribucion-votos.util';
import { condicionActaValidada } from '../utils/acta-validada.util';

/**
 * Grupos de distritos de coalición para Diputación MR, hardcodeados en el
 * proceso electoral CDMX 2024 (docs/CONSULTAS_SQL_PREP2024.md §5.4).
 *
 * TODO (pendiente, decisión explícita del equipo): esta agrupación es
 * específica del proceso 2024 y NO se ha confirmado como vigente para el
 * proceso actual. Se preserva literal (en vez de omitirla) porque el equipo
 * decidió mantenerla mientras se define su implementación definitiva — antes
 * de usarse en un corte real, mover estos 3 grupos a una tabla de
 * configuración (`coalicion_distrito(distrito_id, grupo)`) en vez de listas
 * fijas en código, tal como recomienda el propio documento fuente.
 */
const COALICION_DMR_GRUPO_1 = [
  0, 1, 2, 3, 4, 5, 6, 8, 9, 10, 11, 15, 16, 18, 19, 22, 23, 24, 27, 28, 32, 33,
];
const COALICION_DMR_GRUPO_2 = [7, 14, 29, 31];
const COALICION_DMR_GRUPO_3 = [12, 13, 17, 20, 21, 25, 26, 30];

export interface ResumenGraficaFila {
  [campoVotos: string]: number | string | undefined;
  votos_cand_no_reg: number;
  votos_nulos: number;
  votacion_total: number;
}

/** Una fila de `agrupado`: votos de un candidato/partido (o de los pseudo-candidatos `no_registrados`/`votos_nulos`) ya emparejados con su catálogo. */
export interface CandidatoGraficaFila {
  siglas: string;
  descripcion: string;
  total_votos: number;
  porcentaje: number;
  ganador: boolean;
}

/** `solo`: únicamente voto en el extranjero (`tipo_casilla` `M*`); `excluir`: todo lo demás; sin filtro: ambos. */
type FiltroExtranjero = 'solo' | 'excluir';

interface FiltrosResumen {
  tiposEleccion: TipoEleccion[];
  geoColumn: 'id_distrito' | 'id_delegacion';
  distOAlcaldia: number;
  seccion: number;
  casilla: string | null;
  extranjero?: FiltroExtranjero;
}

/** Diputación MR se consulta junto con RP (`id_tipo_eleccion IN (2, 3)`), como `api_distribucion_partido.php`/`funciones_grafica.php`. */
const tiposEleccionConRp = (type: TipoEleccion): TipoEleccion[] =>
  type === TipoEleccion.DIPUTACION_MR
    ? [TipoEleccion.DIPUTACION_MR, TipoEleccion.REPRESENTACION_PROPORCIONAL]
    : [type];

@Injectable()
export class GraficaService {
  constructor(
    @InjectRepository(PrepVotosEntity, 'resultados')
    private readonly votosRepo: Repository<PrepVotosEntity>,
    private readonly catalogo: TipoEleccionCatalogoService,
  ) {}

  /**
   * Equivalente a `actas_grid_data_todo.php` (docs/CONSULTAS_SQL_PREP2024.md
   * §5): resumen agregado (no por casilla) usado por `grafica`/`moving-cards`
   * /`resumen-votacion` en el front. Como en el PHP, sin distrito/alcaldía
   * (`0`) no se filtra por geografía y se suma toda la entidad.
   */
  async grafica(
    type: TipoEleccion,
    distOAlcaldia: number,
    seccion: number,
    casilla: string | null,
    esDistribucion = false,
  ): Promise<{
    resumen: ResumenGraficaFila;
    agrupado: CandidatoGraficaFila[];
    coalicionPendiente: boolean;
  }> {
    const filtros: FiltrosResumen = {
      tiposEleccion: [type],
      geoColumn: this.catalogo.geoColumn(type),
      distOAlcaldia,
      seccion,
      casilla,
    };

    if (esDistribucion) {
      // Como `consigueDatosDMR()` de 2024, diputaciones suma también actas RP.
      const { partidos, resumen } = await this.resumenPorPartido(type, {
        ...filtros,
        tiposEleccion: tiposEleccionConRp(type),
      });
      return {
        resumen,
        agrupado: this.construirAgrupado(partidos, resumen),
        coalicionPendiente: false,
      };
    }

    const candidatos = await this.catalogo.getCandidatos(type);

    if (type === TipoEleccion.DIPUTACION_MR) {
      const resumen = await this.resumenCoalicionDmr();
      return {
        resumen,
        agrupado: this.construirAgrupado(candidatos, resumen),
        coalicionPendiente: true,
      };
    }

    const resumen = await this.sumarResumen(
      candidatos.map((c) => asColumnaVotosSegura(c.campoVotos)),
      filtros,
    );

    return {
      resumen,
      agrupado: this.construirAgrupado(candidatos, resumen),
      coalicionPendiente: false,
    };
  }

  /**
   * Empareja cada candidato/partido del catálogo con sus votos en `resumen`
   * (por `campo_votos`) y agrega las filas de `no_registrados`/`votos_nulos`
   * que el front pinta junto a los candidatos (`grafica.component.html`).
   * `ganador` solo se marca entre candidatos reales, nunca en esas dos filas,
   * y como en `ChartJG.vue` de 2024 no hay ganador si el máximo está empatado.
   */
  private construirAgrupado(
    candidatos: CandidatoCatalogo[],
    resumen: ResumenGraficaFila,
  ): CandidatoGraficaFila[] {
    const filasCandidatos = candidatos.map((c) => ({
      siglas: c.siglas ?? '',
      descripcion: c.descripcion ?? '',
      total_votos: Number(resumen[asColumnaVotosSegura(c.campoVotos)] ?? 0),
    }));

    const maxVotos = filasCandidatos.reduce(
      (max, c) => Math.max(max, c.total_votos),
      0,
    );
    const hayGanadorUnico =
      maxVotos > 0 &&
      filasCandidatos.filter((c) => c.total_votos === maxVotos).length === 1;

    const conPorcentaje = (
      fila: { siglas: string; descripcion: string; total_votos: number },
      esCandidato: boolean,
    ): CandidatoGraficaFila => ({
      ...fila,
      porcentaje: porcentajeNumerico(fila.total_votos, resumen.votacion_total),
      ganador: esCandidato && hayGanadorUnico && fila.total_votos === maxVotos,
    });

    return [
      ...filasCandidatos.map((fila) => conPorcentaje(fila, true)),
      conPorcentaje(
        {
          siglas: 'no_registrados',
          descripcion: 'Candidaturas no registradas',
          total_votos: resumen.votos_cand_no_reg,
        },
        false,
      ),
      conPorcentaje(
        {
          siglas: 'votos_nulos',
          descripcion: 'Votos nulos',
          total_votos: resumen.votos_nulos,
        },
        false,
      ),
    ];
  }

  /**
   * §5.4: rama exclusiva de Diputación MR — reemplaza por completo la
   * agregación genérica. Ver TODO de la constante `COALICION_DMR_GRUPO_*`.
   */
  private async resumenCoalicionDmr(): Promise<ResumenGraficaFila> {
    const sql = `
      WITH suma_votos AS (
        SELECT V.id_distrito as id_distrito,
          0 as votos_part_1, 0 as votos_part_2, 0 as votos_part_3, 0 as votos_part_4, 0 as votos_part_5,
          sum(V.votos_part_6) as votos_part_6, 0 as votos_part_7, sum(V.votos_part_8) as votos_part_8,
          sum(V.votos_part_9) as votos_part_9, sum(V.total_votos_cc1) as votos_part_10, sum(V.total_votos_cc5) as votos_part_14,
          sum(votos_cand_no_reg) as votos_cand_no_reg, sum(votos_nulos) as votos_nulos,
          sum(votacion_total) as votacion_total
        FROM prep_votos as V
        WHERE V.id_distrito IN (${COALICION_DMR_GRUPO_1.join(',')})
          AND V.id_tipo_eleccion IN (2) AND ${condicionActaValidada('V.validado')} AND V.contabilizar='T'
        GROUP BY V.id_distrito
        UNION ALL
        SELECT V.id_distrito as id_distrito,
          0 as votos_part_1, 0 as votos_part_2, 0 as votos_part_3,
          sum(V.votos_part_4) as votos_part_4, sum(V.votos_part_5) as votos_part_5, sum(V.votos_part_6) as votos_part_6,
          sum(V.votos_part_7) as votos_part_7, sum(V.votos_part_8) as votos_part_8, sum(V.votos_part_9) as votos_part_9,
          sum(V.total_votos_cc1) as votos_part_10, 0 as votos_part_14,
          sum(votos_cand_no_reg) as votos_cand_no_reg, sum(votos_nulos) as votos_nulos,
          sum(votacion_total) as votacion_total
        FROM prep_votos as V
        WHERE V.id_distrito IN (${COALICION_DMR_GRUPO_2.join(',')})
          AND V.id_tipo_eleccion IN (2) AND ${condicionActaValidada('V.validado')} AND V.contabilizar='T'
        GROUP BY V.id_distrito
        UNION ALL
        SELECT V.id_distrito as id_distrito,
          sum(V.votos_part_1) as votos_part_1, sum(V.votos_part_2) as votos_part_2, sum(V.votos_part_3) as votos_part_3,
          0 as votos_part_4, 0 as votos_part_5, sum(V.votos_part_6) as votos_part_6, 0 as votos_part_7,
          sum(V.votos_part_8) as votos_part_8, sum(V.votos_part_9) as votos_part_9, 0 as votos_part_10,
          sum(V.total_votos_cc5) as votos_part_14,
          sum(votos_cand_no_reg) as votos_cand_no_reg, sum(votos_nulos) as votos_nulos,
          sum(votacion_total) as votacion_total
        FROM prep_votos as V
        WHERE V.id_distrito IN (${COALICION_DMR_GRUPO_3.join(',')})
          AND V.id_tipo_eleccion IN (2) AND ${condicionActaValidada('V.validado')} AND V.contabilizar='T'
        GROUP BY V.id_distrito
      )
      SELECT sum(votos_part_1) as votos_part_1, sum(votos_part_2) as votos_part_2, sum(votos_part_3) as votos_part_3,
        sum(votos_part_4) as votos_part_4, sum(votos_part_5) as votos_part_5, sum(votos_part_6) as votos_part_6,
        sum(votos_part_7) as votos_part_7, sum(votos_part_8) as votos_part_8, sum(votos_part_9) as votos_part_9,
        sum(votos_part_10) as votos_part_10, sum(votos_part_14) as votos_part_14,
        sum(votos_cand_no_reg) as votos_cand_no_reg, sum(votos_nulos) as votos_nulos,
        sum(votacion_total) as votacion_total
      FROM suma_votos
    `;

    const rows =
      await this.votosRepo.query<Record<string, string | number | null>[]>(sql);
    const fila = rows[0] ?? {};

    return {
      votos_part_1: Number(fila.votos_part_1 ?? 0),
      votos_part_2: Number(fila.votos_part_2 ?? 0),
      votos_part_3: Number(fila.votos_part_3 ?? 0),
      votos_part_4: Number(fila.votos_part_4 ?? 0),
      votos_part_5: Number(fila.votos_part_5 ?? 0),
      votos_part_6: Number(fila.votos_part_6 ?? 0),
      votos_part_7: Number(fila.votos_part_7 ?? 0),
      votos_part_8: Number(fila.votos_part_8 ?? 0),
      votos_part_9: Number(fila.votos_part_9 ?? 0),
      votos_part_10: Number(fila.votos_part_10 ?? 0),
      votos_part_14: Number(fila.votos_part_14 ?? 0),
      votos_cand_no_reg: Number(fila.votos_cand_no_reg ?? 0),
      votos_nulos: Number(fila.votos_nulos ?? 0),
      votacion_total: Number(fila.votacion_total ?? 0),
    };
  }

  /**
   * Equivalente a `api_distribucion_partido.php` (docs/CONSULTAS_SQL_PREP2024.md
   * §13): votos crudos (sin agregar) por casilla de un distrito/alcaldía en
   * `datosMSSQL`. A diferencia del PHP original (que siempre regresaba
   * `error: "Valores no implementados"` incluso en éxito — bug de
   * copy/paste señalado en el propio documento de migración), aquí se usa
   * un `success: boolean` real. Sin distrito/alcaldía (nivel entidad) no se
   * devuelven filas crudas.
   *
   * Además arma `agrupado`/`dataExtranjero`: los mismos candidatos que
   * `grafica()`, pero separados entre casillas normales y voto en el
   * extranjero. El criterio para "extranjero" es `tipo_casilla` con prefijo
   * `M` (ej. `M01`) — confirmado cruzando 3 fuentes independientes: (1) en
   * los datos reales, las filas `tipo_casilla='M01'` no están atadas a una
   * sección/casilla geográfica real (id_distrito/id_delegacion/id_seccion en
   * 0), consistente con ser un canal de votación aparte; (2) los campos
   * `ue_*` (que podrían confundirse con "urna electrónica" = voto foráneo)
   * en realidad solo aparecen en casillas `S` (Casilla Especial), un
   * concepto distinto; (3) `publicador-prep-2027/interfaces/detalle-casilla
   * .interface.ts` (generado desde una respuesta real de producción 2024)
   * trae literalmente `CaracterCas.VotoEnElExtranjero = "Voto en el
   * extranjero"` como valor observado, el mismo texto que ya usaba
   * `DistribucionService.caracterCasilla()` para el prefijo `M`.
   */
  async pruebaDistribucion(
    type: TipoEleccion,
    distOAlcaldia: number,
    seccion: number,
    casilla: string | null,
    esDistribucion = false,
  ): Promise<{
    datosMSSQL: Record<string, unknown>[];
    agrupado: CandidatoGraficaFila[];
    dataExtranjero: CandidatoGraficaFila[];
    success: boolean;
  }> {
    const tiposEleccion = tiposEleccionConRp(type);
    const geoColumn = this.catalogo.geoColumn(type);
    const placeholders = tiposEleccion.map(() => '?').join(', ');

    const columnasVotos = Array.from(
      { length: 35 },
      (_, i) => `votos_part_${i + 1}`,
    );
    const columnasCc = Array.from(
      { length: 9 },
      (_, i) => `total_votos_cc${i + 1}`,
    );

    const sql = `
      SELECT id_distrito, id_delegacion, ${columnasVotos.join(', ')}, ${columnasCc.join(', ')}, votacion_total
      FROM prep_votos
      WHERE ${geoColumn} = ? AND contabilizar = 'T' AND ${condicionActaValidada('validado')} AND id_tipo_eleccion IN (${placeholders})
    `;

    const datosMSSQL = distOAlcaldia
      ? await this.votosRepo.query<Record<string, unknown>[]>(sql, [
          distOAlcaldia,
          ...tiposEleccion,
        ])
      : [];

    const filtros: FiltrosResumen = {
      tiposEleccion,
      geoColumn,
      distOAlcaldia,
      seccion,
      casilla,
    };

    if (esDistribucion) {
      const [total, extranjero] = await Promise.all([
        this.resumenPorPartido(type, filtros),
        this.resumenPorPartido(type, { ...filtros, extranjero: 'solo' }),
      ]);
      // Como en `Chart.vue` (2024), "En Territorio Estatal" es el total menos
      // el extranjero: repartir cada subconjunto por separado podría no
      // cuadrar con el total por el residuo de las combinaciones.
      return {
        datosMSSQL,
        agrupado: this.construirAgrupado(
          total.partidos,
          this.restarResumen(total.resumen, extranjero.resumen),
        ),
        dataExtranjero: this.construirAgrupado(
          total.partidos,
          extranjero.resumen,
        ),
        success: true,
      };
    }

    const candidatos = await this.catalogo.getCandidatos(type);
    const columnas = candidatos.map((c) => asColumnaVotosSegura(c.campoVotos));

    const [resumenCasillas, resumenExtranjero] = await Promise.all([
      this.sumarResumen(columnas, { ...filtros, extranjero: 'excluir' }),
      this.sumarResumen(columnas, { ...filtros, extranjero: 'solo' }),
    ]);

    return {
      datosMSSQL,
      agrupado: this.construirAgrupado(candidatos, resumenCasillas),
      dataExtranjero: this.construirAgrupado(candidatos, resumenExtranjero),
      success: true,
    };
  }

  /**
   * Votos por partido individual (`funciones_grafica.php` de 2024): suma las
   * columnas de partidos y de combinaciones de coalición, y reparte estas
   * últimas entre sus integrantes. `resumen` queda indexado por la columna
   * `votos_part_N` de cada partido, listo para `construirAgrupado()`.
   */
  private async resumenPorPartido(
    type: TipoEleccion,
    filtros: FiltrosResumen,
  ): Promise<{ partidos: CandidatoCatalogo[]; resumen: ResumenGraficaFila }> {
    const { partidos, combinaciones } =
      await this.catalogo.getCatalogoDistribucion(type);
    const sumado = await this.sumarResumen(
      [...partidos, ...combinaciones].map(({ campoVotos }) => campoVotos),
      filtros,
    );

    const repartidos = distribuirVotosCombinaciones(
      new Map(
        partidos.map(({ idParticipante, campoVotos }) => [
          idParticipante,
          Number(sumado[campoVotos] ?? 0),
        ]),
      ),
      combinaciones.map(({ campoVotos, integrantes, porcentajes }) => ({
        integrantes,
        votos: Number(sumado[campoVotos] ?? 0),
        porcentajes,
      })),
    );

    const resumen: ResumenGraficaFila = {
      votos_cand_no_reg: sumado.votos_cand_no_reg,
      votos_nulos: sumado.votos_nulos,
      votacion_total: sumado.votacion_total,
    };
    for (const { idParticipante, campoVotos } of partidos) {
      resumen[campoVotos] = repartidos.get(idParticipante) ?? 0;
    }
    return { partidos, resumen };
  }

  private restarResumen(
    minuendo: ResumenGraficaFila,
    sustraendo: ResumenGraficaFila,
  ): ResumenGraficaFila {
    const resultado: ResumenGraficaFila = {
      votos_cand_no_reg:
        minuendo.votos_cand_no_reg - sustraendo.votos_cand_no_reg,
      votos_nulos: minuendo.votos_nulos - sustraendo.votos_nulos,
      votacion_total: minuendo.votacion_total - sustraendo.votacion_total,
    };
    for (const [columna, valor] of Object.entries(minuendo)) {
      if (!(columna in resultado)) {
        resultado[columna] =
          Number(valor ?? 0) - Number(sustraendo[columna] ?? 0);
      }
    }
    return resultado;
  }

  /** Suma de `columnas` (ya validadas) más no registrados, nulos y votación total sobre actas validadas y contabilizadas. */
  private async sumarResumen(
    columnas: string[],
    {
      tiposEleccion,
      geoColumn,
      distOAlcaldia,
      seccion,
      casilla,
      extranjero,
    }: FiltrosResumen,
  ): Promise<ResumenGraficaFila> {
    const qb = this.votosRepo
      .createQueryBuilder('v')
      .where(condicionActaValidada('v.validado'))
      .andWhere('v.contabilizar = :contabilizar', { contabilizar: 'T' })
      .andWhere('v.idTipoEleccion IN (:...tipos)', { tipos: tiposEleccion });

    if (extranjero) {
      qb.andWhere(
        extranjero === 'solo'
          ? 'v.tipoCasilla LIKE :prefijoExtranjero'
          : 'v.tipoCasilla NOT LIKE :prefijoExtranjero',
        { prefijoExtranjero: 'M%' },
      );
    }
    if (distOAlcaldia) {
      qb.andWhere(`v.${this.entityColumn(geoColumn)} = :distOAlcaldia`, {
        distOAlcaldia,
      });
    }
    if (seccion) qb.andWhere('v.idSeccion = :seccion', { seccion });
    if (casilla) qb.andWhere('v.tipoCasilla = :casilla', { casilla });

    for (const col of columnas) {
      qb.addSelect(`SUM(v.${this.entityColumnVotos(col)})`, col);
    }
    qb.addSelect('SUM(v.votosCandNoReg)', 'votos_cand_no_reg');
    qb.addSelect('SUM(v.votosNulos)', 'votos_nulos');
    qb.addSelect('SUM(v.votacionTotal)', 'votacion_total');

    const fila = await qb.getRawOne<Record<string, string | number | null>>();
    const resumen: ResumenGraficaFila = {
      votos_cand_no_reg: Number(fila?.votos_cand_no_reg ?? 0),
      votos_nulos: Number(fila?.votos_nulos ?? 0),
      votacion_total: Number(fila?.votacion_total ?? 0),
    };
    for (const col of columnas) {
      resumen[col] = Number(fila?.[col] ?? 0);
    }
    return resumen;
  }

  /** camelCase de la columna geográfica cruda ('id_distrito'/'id_delegacion') como propiedad de entidad. */
  private entityColumn(
    column: 'id_distrito' | 'id_delegacion',
  ): 'idDistrito' | 'idDelegacion' {
    return column === 'id_distrito' ? 'idDistrito' : 'idDelegacion';
  }

  /** camelCase de una columna `votos_part_N`/`total_votos_ccN` como propiedad de entidad. */
  private entityColumnVotos(column: string): string {
    if (column.startsWith('votos_part_')) {
      return `votosPart${column.replace('votos_part_', '')}`;
    }
    return `totalVotosCc${column.replace('total_votos_cc', '')}`;
  }
}
