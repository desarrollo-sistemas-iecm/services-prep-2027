import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PrepVotosEntity } from '../../resultados-legacy/entities/prep-votos.entity';
import { TipoEleccion } from '../enums/tipo-eleccion.enum';
import {
  asColumnaVotosSegura,
  TipoEleccionCatalogoService,
} from './tipo-eleccion-catalogo.service';
import { condicionActaValidada } from '../utils/acta-validada.util';

export interface ParticipanteMapa {
  id_participante: number;
  campo_votos: string;
  siglas: string | null;
  descripcion: string | null;
  total_demarcaciones: number;
  ganador: boolean;
}

export interface ResultVotoMapa {
  [columnaVotos: string]: number | string | null;
  id_distrito: number;
  total: number;
  siglas_ganador: string | null;
}

/**
 * Equivalente a `getSQLsum()`/`getSQLsumJoinLN()` en `funciones.php`
 * (docs/CONSULTAS_SQL_PREP2024.md §1.11), usado por `getRecordSetMap()` para
 * armar el mapa de ganador por distrito/delegación.
 *
 * TODO: el doc fuente no detalla la fórmula exacta para decidir `ganador`
 * (¿el que más votos totales acumula en toda la entidad?) ni
 * `total_demarcaciones` de forma completamente inequívoca (los campos
 * `rank_dto_*`/`win_*` de la respuesta original de 2024 no se conservaron
 * literales en este contrato, que es la versión simplificada consumida hoy
 * por `ApiPrepService.obtenerInformacionMapas`). Aquí `ganador` = el
 * participante con más votos sumados en toda la entidad, y
 * `total_demarcaciones` = número de distritos/delegaciones donde ese
 * participante tiene el mayor conteo. Confirmar contra un corte real.
 * PREP Coahuila 2026 resalta en cambio al de más demarcaciones obtenidas; ver
 * `publicador-prep-2027/docs/mapa-ganador-distritos.md`.
 */
@Injectable()
export class MapasService {
  constructor(
    @InjectRepository(PrepVotosEntity, 'resultados')
    private readonly votosRepo: Repository<PrepVotosEntity>,
    private readonly catalogo: TipoEleccionCatalogoService,
  ) {}

  async obtener(type: TipoEleccion): Promise<{
    success: boolean;
    msg: string;
    data: { participantes: ParticipanteMapa[]; result_votos: ResultVotoMapa[] };
  }> {
    const candidatos = await this.catalogo.getCandidatos(type);
    const geoColumn = this.catalogo.geoColumn(type);
    const tiposEleccion =
      type === TipoEleccion.DIPUTACION_MR
        ? [TipoEleccion.DIPUTACION_MR, TipoEleccion.REPRESENTACION_PROPORCIONAL]
        : [type];

    if (candidatos.length === 0) {
      return {
        success: true,
        msg: 'La información se obtuvo correctamente.',
        data: { participantes: [], result_votos: [] },
      };
    }

    const columnas = candidatos.map((c) => asColumnaVotosSegura(c.campoVotos));
    const sumasSql = columnas.map((col) => `SUM(${col}) as ${col}`).join(', ');
    const placeholdersTipos = tiposEleccion.map(() => '?').join(', ');

    const sql = `
      SELECT ${geoColumn} as geo, ${sumasSql}
      FROM prep_votos
      WHERE contabilizar = 'T' AND ${condicionActaValidada('validado')} AND id_tipo_eleccion IN (${placeholdersTipos}) AND ${geoColumn} > 0
      GROUP BY ${geoColumn}
    `;

    const filas: Record<string, number>[] = await this.votosRepo.query(
      sql,
      tiposEleccion,
    );

    const totalesGlobales = new Map<string, number>(
      columnas.map((c) => [c, 0]),
    );
    const demarcacionesGanadas = new Map<string, number>(
      columnas.map((c) => [c, 0]),
    );

    const siglasPorColumna = new Map(
      candidatos.map((c) => [asColumnaVotosSegura(c.campoVotos), c.siglas]),
    );

    const resultVotos: ResultVotoMapa[] = filas.map((fila) => {
      let total = 0;
      let mejorColumna: string | null = null;
      let mejorValor = -Infinity;

      for (const col of columnas) {
        const valor = Number(fila[col] ?? 0);
        total += valor;
        totalesGlobales.set(col, (totalesGlobales.get(col) ?? 0) + valor);
        if (valor > mejorValor) {
          mejorValor = valor;
          mejorColumna = col;
        }
      }
      const columnaGanadoraDemarcacion = mejorValor > 0 ? mejorColumna : null;
      if (columnaGanadoraDemarcacion) {
        demarcacionesGanadas.set(
          columnaGanadoraDemarcacion,
          (demarcacionesGanadas.get(columnaGanadoraDemarcacion) ?? 0) + 1,
        );
      }

      const fila_result: ResultVotoMapa = {
        id_distrito: Number(fila.geo),
        total,
        siglas_ganador: columnaGanadoraDemarcacion
          ? (siglasPorColumna.get(columnaGanadoraDemarcacion) ?? null)
          : null,
      };
      for (const col of columnas) {
        fila_result[col] = Number(fila[col] ?? 0);
      }
      return fila_result;
    });

    let columnaGanadora: string | null = null;
    let mejorTotal = -Infinity;
    for (const [col, valor] of totalesGlobales) {
      if (valor > mejorTotal) {
        mejorTotal = valor;
        columnaGanadora = col;
      }
    }

    const participantes: ParticipanteMapa[] = candidatos.map((c) => ({
      id_participante: c.idParticipante,
      campo_votos: c.campoVotos,
      siglas: c.siglas,
      descripcion: c.descripcion,
      total_demarcaciones: demarcacionesGanadas.get(c.campoVotos) ?? 0,
      ganador: c.campoVotos === columnaGanadora,
    }));

    return {
      success: true,
      msg: 'La información se obtuvo correctamente.',
      data: { participantes, result_votos: resultVotos },
    };
  }
}
