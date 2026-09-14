import { CorteLegacyEntity } from '../../resultados-legacy/entities/corte-legacy.entity';

/**
 * `${dia}/${mes}/${anio} ${hora}:${minuto}(UTC-6)` — confirmado sin espacio antes de "(UTC-6)"
 * (`$v_fecha_corte.' '.$v_corte.'(UTC-6)'` en el PHP real), usado en la segunda línea del CSV.
 */
export function formatearFechaCorteTexto(corte: CorteLegacyEntity): string {
  return `${corte.dia}/${corte.mes}/${corte.anio} ${corte.hora}:${corte.minuto}(UTC-6)`;
}
