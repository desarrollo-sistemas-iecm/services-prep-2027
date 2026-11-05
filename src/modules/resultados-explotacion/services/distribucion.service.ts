import { Injectable } from '@nestjs/common';
import { TipoEleccion } from '../enums/tipo-eleccion.enum';
import { TipoEleccionCatalogoService } from './tipo-eleccion-catalogo.service';
import { ActasGridService } from './actas-grid.service';

/**
 * Equivalente a `actas_grid_data.php` (docs/CONSULTAS_SQL_PREP2024.md §4),
 * filtrado únicamente por distrito/delegación + sección — `ApiPrepService
 * .obtenederDetalleVotosCasilla` no envía `casilla` (item_3) en el body pese
 * a aceptarlo como parámetro, así que ese filtro no se replica aquí.
 *
 * El SELECT y el post-proceso viven en `ActasGridService`, compartidos con
 * `ActasModalidadService` (RP y voto en el extranjero).
 */
@Injectable()
export class DistribucionService {
  constructor(
    private readonly catalogo: TipoEleccionCatalogoService,
    private readonly actasGrid: ActasGridService,
  ) {}

  async obtener(type: TipoEleccion, seleccion: number, seccion: number) {
    const candidatos = await this.catalogo.getCandidatos(type, seleccion);
    const participantes = await this.catalogo.getParticipantes(type, seleccion);

    return this.actasGrid.obtener({
      type,
      // `titulo` son las siglas para que el front pinte el logo del partido o coalición.
      columnasVotos: candidatos.map(({ campoVotos, siglas }) => ({
        columna: campoVotos,
        titulo: siglas ?? campoVotos,
      })),
      participantes,
      filtros: {
        geo: { columna: this.catalogo.geoColumn(type), valor: seleccion },
        seccion,
      },
      idGeoValueFields: seleccion,
    });
  }
}
