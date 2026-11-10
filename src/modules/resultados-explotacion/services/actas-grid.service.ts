import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PrepVotosEntity } from '../../resultados-legacy/entities/prep-votos.entity';
import { TipoEleccion } from '../enums/tipo-eleccion.enum';
import {
  asColumnaVotosSegura,
  ParticipanteCatalogo,
} from './tipo-eleccion-catalogo.service';
import { calcularObservaciones } from '../utils/observaciones.util';
import {
  formatearPorcentaje,
  porcentajeCuatroDecimales,
} from '../utils/porcentaje.util';
import { condicionActaValidada } from '../utils/acta-validada.util';

const CAMPO_IMAGEN_POR_TIPO: Record<
  TipoEleccion,
  { nombre: string; sha: string }
> = {
  [TipoEleccion.JEFATURA_GOBIERNO]: {
    nombre: 'img_nombre_jgob',
    sha: 'sha_img_jgob',
  },
  [TipoEleccion.DIPUTACION_MR]: {
    nombre: 'img_nombre_dmr',
    sha: 'sha_img_dmr',
  },
  [TipoEleccion.REPRESENTACION_PROPORCIONAL]: {
    nombre: 'img_nombre_rp',
    sha: 'sha_img_rp',
  },
  [TipoEleccion.ALCALDIA]: { nombre: 'img_nombre_alc', sha: 'sha_img_alc' },
};

/**
 * Primer carácter de `tipo_casilla` que identifica la modalidad del acta
 * (`tipo_acta` en `actas_grid_data_rp.php`/`_voto_prision_ant.php`):
 * `S` = casilla especial (RP), `M` = voto en el extranjero.
 */
export type PrefijoTipoCasilla = 'S' | 'M';

export interface ColumnaGrid {
  dataIndex: string;
  title: string;
  key: number | string;
  resizable: 'resizable';
  width: number;
  minWidth: number;
  maxWidth: number;
}

/** Columna de votos a seleccionar y el título con que se expone en `columns`. */
export interface ColumnaVotos {
  columna: string;
  titulo: string;
}

export interface FiltrosActasGrid {
  prefijoTipoCasilla?: PrefijoTipoCasilla;
  geo?: { columna: 'id_distrito' | 'id_delegacion'; valor: number };
  seccion?: number;
}

export interface ActasGridParams {
  type: TipoEleccion;
  columnasVotos: ColumnaVotos[];
  participantes: ParticipanteCatalogo[];
  filtros: FiltrosActasGrid;
  /** Valor que se repite en `value_fields[].id_delegacion` (contrato heredado). */
  idGeoValueFields: number | null;
}

/** Forma de cada fila cruda que regresa el SQL de `obtener()` (ver abajo). */
interface FilaActa {
  [columna: string]: string | number | null;
}

/** Fila de `itemRecords.data`: la fila cruda más el texto de observaciones. */
export type FilaActaGrid = FilaActa & { observaciones: string };

/**
 * SELECT de detalle de actas (docs/CONSULTAS_SQL_PREP2024.md §4.2), común a
 * `actas_grid_data.php`, `actas_grid_data_rp.php` (§6.2) y
 * `actas_grid_data_voto_prision_ant.php` (§8.2) — los tres solo difieren en
 * el `WHERE` y en el origen de las columnas de votos, así que aquí se
 * unifican tal como sugiere la nota de duplicación del documento.
 *
 * El `WHERE` se arma solo con fragmentos fijos y placeholders; lo único
 * interpolado son nombres de columna de `geoColumn()` (unión cerrada) y de
 * `asColumnaVotosSegura` (allowlist).
 *
 * TODO:
 * - `columns` es la definición de columnas de una grilla en el frontend
 *   original (ant-design-vue): anchos/orden no son datos electorales, se
 *   dejan con valores por defecto razonables — no se encontró en los docs
 *   extraídos el arreglo exacto de columnas de 2024.
 * - `caracter_cas`/`num_casilla` en `participacion` se derivan de
 *   `tipo_casilla` con una heurística propia (no está en el SQL extraído);
 *   confirmar contra el catálogo real de tipos de casilla
 *   (`cat_tipo_casilla`) antes de usarse en producción.
 */
@Injectable()
export class ActasGridService {
  constructor(
    @InjectRepository(PrepVotosEntity, 'resultados')
    private readonly votosRepo: Repository<PrepVotosEntity>,
  ) {}

  async obtener({
    type,
    columnasVotos,
    participantes,
    filtros,
    idGeoValueFields,
  }: ActasGridParams) {
    const { nombre: campoImgNombre, sha: campoImgSha } =
      CAMPO_IMAGEN_POR_TIPO[type];
    const columnas = columnasVotos.map(({ columna, titulo }) => ({
      columna: asColumnaVotosSegura(columna),
      titulo,
    }));

    const selectVotos =
      columnas.length > 0
        ? columnas
            .map(({ columna }) => `V.${columna} as ${columna}`)
            .join(', ') + ','
        : '';

    const condiciones: string[] = [];
    const parametros: (string | number)[] = [];
    condiciones.push(condicionActaValidada('V.validado'));
    condiciones.push('V.id_tipo_eleccion = ?');
    parametros.push(type);
    if (filtros.prefijoTipoCasilla) {
      condiciones.push('substr(V.tipo_casilla, 1, 1) = ?');
      parametros.push(filtros.prefijoTipoCasilla);
    }
    if (filtros.geo) {
      condiciones.push(`V.${filtros.geo.columna} = ?`);
      parametros.push(filtros.geo.valor);
    }
    if (filtros.seccion != null) {
      condiciones.push('V.id_seccion = ?');
      parametros.push(filtros.seccion);
    }

    const sql = `
      SELECT V.id_delegacion, V.id_seccion, V.tipo_casilla, V.id_distrito, V.clave_mdc,
        ${selectVotos}
        V.votos_cand_no_reg, V.votos_nulos, V.votacion_total, V.boletas_sob,
        V.ciudadanos_votaron, V.representantes_votaron, V.total_votaron,
        C.lista_nominal as lista_nominal, V.contabilizar, V.validado,
        V.inconsistencia, V.excede_ln,
        D.${campoImgNombre} as nombre_img, D.${campoImgSha} as sha_img,
        V.ue_identificador_comprobante, V.ue_circunscripcion_federal, V.ue_id_casilla,
        V.ue_tipo_casilla, V.ue_id_ext_contigua, V.ue_tipo_documento, V.ue_personas_votaron,
        V.ue_identificacion, V.ue_votos_partidos, V.ue_version_software, V.ue_fecha_impresion,
        V.ue_codigo_integridad, V.ue_qr
      FROM prep_votos V
      LEFT JOIN scd_casillas C
        ON V.id_distrito = C.id_distrito AND V.id_delegacion = C.id_delegacion
       AND V.id_seccion = C.id_seccion AND V.tipo_casilla = C.tipo_casilla
      LEFT JOIN dig_actas_prep D
        ON V.id_distrito = D.id_distrito AND V.clave_mdc = D.acta
      WHERE ${condiciones.join(' AND ')}
      ORDER BY V.id_seccion, V.tipo_casilla
    `;

    const filas = await this.votosRepo.query<FilaActa[]>(sql, parametros);

    const data: FilaActaGrid[] = filas.map((fila) => ({
      ...fila,
      observaciones: calcularObservaciones(
        fila.inconsistencia == null ? null : Number(fila.inconsistencia),
        fila.excede_ln == null ? null : String(fila.excede_ln),
      ),
    }));

    // Como `actas_grid_data.php`: votación total del acta sobre su lista
    // nominal, 4 decimales y sin `%` (el front lo agrega).
    // TODO: se listan todas las actas, contabilizadas o no (criterio PREP2024).
    // PREP Coahuila 2026 muestra "Sin Acta" y 0.0000% en las no contabilizadas;
    // reportarlo para confirmar el criterio vigente antes de exponer
    // `contabilizar` aquí.
    const participacion = filas.map((fila) => {
      const tipoCasilla = String(fila.tipo_casilla ?? '');
      const totalVotaron = Number(fila.total_votaron ?? 0);
      const listaNominal = Number(fila.lista_nominal ?? 0);
      const votacionTotal = Number(fila.votacion_total ?? 0);
      return {
        id_delegacion: fila.id_delegacion,
        id_distrito: fila.id_distrito,
        id_seccion: fila.id_seccion,
        tipo_casilla: tipoCasilla,
        num_casilla: tipoCasilla.replace(/^[A-Za-z]+/, '') || '01',
        caracter_cas: this.caracterCasilla(tipoCasilla),
        total_votaron: totalVotaron,
        lista_nominal: listaNominal,
        participacion: porcentajeCuatroDecimales(votacionTotal, listaNominal),
        votacion_total: votacionTotal,
      };
    });

    const filasContabilizadas = filas.filter((f) => f.contabilizar === 'T');
    const total = filasContabilizadas.reduce(
      (acc, f) => acc + Number(f.votacion_total ?? 0),
      0,
    );
    const candidatosNoReg = filasContabilizadas.reduce(
      (acc, f) => acc + Number(f.votos_cand_no_reg ?? 0),
      0,
    );
    const nulos = filasContabilizadas.reduce(
      (acc, f) => acc + Number(f.votos_nulos ?? 0),
      0,
    );
    const votosAcumulados = total - candidatosNoReg - nulos;

    return {
      success: true,
      msg: 'La información se obtuvo correctamente.',
      itemRecords: {
        value_fields: participantes.map((p) => ({
          id_participante: p.idParticipante,
          descripcion: p.descripcion,
          siglas: p.siglas,
          id_delegacion: idGeoValueFields,
          tipo_participante: p.tipoParticipante,
          prelacion: p.prelacion,
          integrantes: p.integrantes,
        })),
        columns: this.buildColumns(columnas),
        data,
        participacion,
        resumen: {
          votos_acumulados: votosAcumulados,
          candidatos_no_reg: candidatosNoReg,
          nulos,
          total,
          votos_acumulados_por: formatearPorcentaje(votosAcumulados, total),
          candidatos_no_reg_por: formatearPorcentaje(candidatosNoReg, total),
          nulos_por: formatearPorcentaje(nulos, total),
          total_por: formatearPorcentaje(total, total),
        },
      },
    };
  }

  /**
   * Deriva la etiqueta de `caracter_cas` a partir del prefijo de
   * `tipo_casilla`, según el catálogo real `cat_tipo_casilla` (B, C, S, P, A,
   * M) y la terminología electoral estándar del IECM — no según el prefijo
   * "S = normal" que trae (mal etiquetado) `docs/CONSULTAS_SQL_PREP2024.md`
   * §1.5/§1.6 (ver corrección documentada en `ResumenVotacionService`).
   *
   * TODO: no se encontró en los documentos fuente una tabla explícita
   * prefijo→etiqueta; este mapeo se reconstruyó cruzando `cat_tipo_casilla`,
   * el enum `CaracterCas`/`TipoCasilla` de `publicador-prep-2027` y los
   * nombres de componentes de voto en condiciones especiales (prisión
   * preventiva, anticipado, extranjero). Confirmar con el equipo.
   */
  private caracterCasilla(tipoCasilla: string): string {
    const prefijo = tipoCasilla.charAt(0).toUpperCase();
    switch (prefijo) {
      case 'B':
        return 'Básica';
      case 'C':
        return 'Contigua';
      case 'S':
        return 'S';
      case 'E':
        return 'E';
      case 'P':
        return 'Voto en prisión preventiva';
      case 'A':
        return 'Voto anticipado';
      case 'M':
        return 'Voto en el extranjero';
      default:
        return prefijo;
    }
  }

  private buildColumns(columnasVotos: ColumnaVotos[]): ColumnaGrid[] {
    const base: ColumnaGrid[] = [
      {
        dataIndex: 'id_seccion',
        title: 'Sección',
        key: 1,
        resizable: 'resizable',
        width: 90,
        minWidth: 70,
        maxWidth: 120,
      },
      {
        dataIndex: 'tipo_casilla',
        title: 'Casilla',
        key: 2,
        resizable: 'resizable',
        width: 90,
        minWidth: 70,
        maxWidth: 120,
      },
    ];
    const votos: ColumnaGrid[] = columnasVotos.map(
      ({ columna, titulo }, index) => ({
        dataIndex: columna,
        title: titulo,
        key: 100 + index,
        resizable: 'resizable',
        width: 110,
        minWidth: 80,
        maxWidth: 160,
      }),
    );
    return [...base, ...votos];
  }
}
