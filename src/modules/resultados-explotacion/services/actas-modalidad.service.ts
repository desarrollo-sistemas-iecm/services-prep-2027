import { Injectable } from '@nestjs/common';
import { TipoEleccion } from '../enums/tipo-eleccion.enum';
import {
  ParticipanteCatalogo,
  TipoEleccionCatalogoService,
} from './tipo-eleccion-catalogo.service';
import {
  ActasGridService,
  ColumnaVotos,
  PrefijoTipoCasilla,
} from './actas-grid.service';

/**
 * Grillas de actas por modalidad de casilla, equivalentes a
 * `actas_grid_data_rp.php` (docs/CONSULTAS_SQL_PREP2024.md §6) y
 * `actas_grid_data_voto_prision_ant.php` (§8) — en 2024 eran código casi
 * duplicado; aquí comparten `ActasGridService` y solo cambian el prefijo de
 * `tipo_casilla` y el filtro geográfico.
 *
 * Ninguno de los dos PHP exigía `validado = 'T'`; aquí, como en el resto de
 * los endpoints, lo decide `SOLO_ACTAS_VALIDADAS`
 * (`utils/acta-validada.util.ts`). `resumen` solo suma las de
 * `contabilizar = 'T'`.
 */
@Injectable()
export class ActasModalidadService {
  constructor(
    private readonly catalogo: TipoEleccionCatalogoService,
    private readonly actasGrid: ActasGridService,
  ) {}

  /** Actas de RP: casillas especiales (`S*`), opcionalmente de un distrito. */
  rp(seleccion?: number) {
    return this.obtener(
      TipoEleccion.REPRESENTACION_PROPORCIONAL,
      'S',
      seleccion,
    );
  }

  /** Actas de voto en el extranjero (`M*`) del tipo de elección pedido. */
  extranjero(type: TipoEleccion) {
    return this.obtener(type, 'M');
  }

  private async obtener(
    type: TipoEleccion,
    prefijoTipoCasilla: PrefijoTipoCasilla,
    seleccion?: number,
  ) {
    const participantes = await this.catalogo.getParticipantesDistintos(type);
    const columnasVotos = await this.columnasVotos(type, participantes);

    return this.actasGrid.obtener({
      type,
      columnasVotos,
      participantes,
      filtros: {
        prefijoTipoCasilla,
        geo:
          seleccion == null
            ? undefined
            : { columna: this.catalogo.geoColumn(type), valor: seleccion },
      },
      idGeoValueFields: seleccion ?? null,
    });
  }

  /**
   * RP no tiene `scd_candidatos_rp`: sus columnas son `votos_part_<id>` de
   * cada participante RP (§6.1). El resto usa el catálogo de candidatos,
   * igual que `distribucion`.
   */
  private async columnasVotos(
    type: TipoEleccion,
    participantes: ParticipanteCatalogo[],
  ): Promise<ColumnaVotos[]> {
    const columnas =
      type === TipoEleccion.REPRESENTACION_PROPORCIONAL
        ? participantes.map(({ idParticipante, siglas, descripcion }) => ({
            columna: `votos_part_${idParticipante}`,
            titulo: siglas ?? descripcion ?? `votos_part_${idParticipante}`,
          }))
        : (await this.catalogo.getCandidatos(type)).map(
            ({ campoVotos, siglas, descripcion }) => ({
              columna: campoVotos,
              titulo: siglas ?? descripcion ?? campoVotos,
            }),
          );

    const vistas = new Set<string>();
    return columnas.filter(({ columna }) => {
      if (vistas.has(columna)) {
        return false;
      }
      vistas.add(columna);
      return true;
    });
  }
}
