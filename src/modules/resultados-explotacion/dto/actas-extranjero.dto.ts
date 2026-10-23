import { TipoEleccionDto } from './tipo-eleccion.dto';

/**
 * Las actas de voto en el extranjero no pertenecen a un distrito operativo
 * (`scd_casillas` las registra con `id_distrito = 0`), así que solo se
 * filtran por tipo de elección.
 */
export class ActasExtranjeroDto extends TipoEleccionDto {}
