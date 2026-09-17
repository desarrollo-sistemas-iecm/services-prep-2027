import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PrepVotosEntity } from '../../resultados-legacy/entities/prep-votos.entity';
import { TipoEleccion } from '../enums/tipo-eleccion.enum';
import {
  asColumnaVotosSegura,
  TipoEleccionCatalogoService,
} from './tipo-eleccion-catalogo.service';
import { calcularObservaciones } from '../utils/observaciones.util';
import { formatearPorcentaje } from '../utils/porcentaje.util';

const CAMPO_IMAGEN_POR_TIPO: Record<
  TipoEleccion,
  { nombre: string; md5: string }
> = {
  [TipoEleccion.JEFATURA_GOBIERNO]: {
    nombre: 'img_nombre_jgob',
    md5: 'md5_img_jgob',
  },
  [TipoEleccion.DIPUTACION_MR]: {
    nombre: 'img_nombre_dmr',
    md5: 'md5_img_dmr',
  },
  [TipoEleccion.REPRESENTACION_PROPORCIONAL]: {
    nombre: 'img_nombre_rp',
    md5: 'md5_img_rp',
  },
  [TipoEleccion.ALCALDIA]: { nombre: 'img_nombre_alc', md5: 'md5_img_alc' },
};

export interface ColumnaGrid {
  dataIndex: string;
  title: string;
  key: number | string;
  resizable: 'resizable';
  width: number;
  minWidth: number;
  maxWidth: number;
}

/** Forma de cada fila cruda que regresa el SQL de `obtener()` (ver abajo). */
interface FilaDistribucion {
  [columna: string]: string | number | null;
}

/**
 * Equivalente a `actas_grid_data.php` (docs/CONSULTAS_SQL_PREP2024.md §4),
 * filtrado únicamente por distrito/delegación + sección — `ApiPrepService
 * .obtenederDetalleVotosCasilla` no envía `casilla` (item_3) en el body pese
 * a aceptarlo como parámetro, así que ese filtro no se replica aquí.
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
export class DistribucionService {
  constructor(
    @InjectRepository(PrepVotosEntity, 'resultados')
    private readonly votosRepo: Repository<PrepVotosEntity>,
    private readonly catalogo: TipoEleccionCatalogoService,
  ) { }

  async obtener(type: TipoEleccion, seleccion: number, seccion: number) {
    const candidatos = await this.catalogo.getCandidatos(type);
    const participantesCatalogo = await this.catalogo.getParticipantes(
      type,
      seleccion,
    );
    const geoColumn = this.catalogo.geoColumn(type);
    const { nombre: campoImgNombre, md5: campoImgMd5 } =
      CAMPO_IMAGEN_POR_TIPO[type];
    const columnasVotos = candidatos.map((c) =>
      asColumnaVotosSegura(c.campoVotos),
    );

    const selectVotos =
      columnasVotos.length > 0
        ? columnasVotos.map((c) => `V.${c} as ${c}`).join(', ') + ','
        : '';

    const sql = `
      SELECT V.id_delegacion, V.id_seccion, V.tipo_casilla, V.id_distrito, V.clave_mdc,
        ${selectVotos}
        V.votos_cand_no_reg, V.votos_nulos, V.votacion_total, V.boletas_sob,
        V.ciudadanos_votaron, V.representantes_votaron, V.total_votaron,
        C.lista_nominal as lista_nominal, V.contabilizar, V.validado,
        V.inconsistencia, V.excede_ln,
        D.${campoImgNombre} as nombre_img, D.${campoImgMd5} as md5_img,
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
      WHERE V.validado = 'T' AND V.id_tipo_eleccion = ?
        AND V.${geoColumn} = ? AND V.id_seccion = ?
    `;

    const filas = await this.votosRepo.query<FilaDistribucion[]>(sql, [
      type,
      seleccion,
      seccion,
    ]);

    const data = filas.map((fila) => ({
      ...fila,
      observaciones: calcularObservaciones(
        fila.inconsistencia == null ? null : Number(fila.inconsistencia),
        fila.excede_ln == null ? null : String(fila.excede_ln),
      ),
    }));

    const participacion = filas.map((fila) => {
      const tipoCasilla = String(fila.tipo_casilla ?? '');
      const totalVotaron = Number(fila.total_votaron ?? 0);
      const listaNominal = Number(fila.lista_nominal ?? 0);
      return {
        id_delegacion: fila.id_delegacion,
        id_distrito: fila.id_distrito,
        id_seccion: fila.id_seccion,
        tipo_casilla: tipoCasilla,
        num_casilla: tipoCasilla.replace(/^[A-Za-z]+/, '') || '01',
        caracter_cas: this.caracterCasilla(tipoCasilla),
        total_votaron: totalVotaron,
        lista_nominal: listaNominal,
        participacion: formatearPorcentaje(totalVotaron, listaNominal),
        votacion_total: Number(fila.votacion_total ?? 0),
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

    const columns: ColumnaGrid[] = this.buildColumns(columnasVotos);

    return {
      success: true,
      msg: 'La información se obtuvo correctamente.',
      itemRecords: {
        value_fields: participantesCatalogo.map((p) => ({
          id_participante: p.idParticipante,
          descripcion: p.descripcion,
          siglas: p.siglas,
          id_delegacion: seleccion,
          tipo_participante: p.tipoParticipante,
          prelacion: p.prelacion,
          integrantes: p.integrantes,
        })),
        columns,
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

  private buildColumns(columnasVotos: string[]): ColumnaGrid[] {
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
    const votos: ColumnaGrid[] = columnasVotos.map((col, index) => ({
      dataIndex: col,
      title: col,
      key: 100 + index,
      resizable: 'resizable',
      width: 110,
      minWidth: 80,
      maxWidth: 160,
    }));
    return [...base, ...votos];
  }
}
