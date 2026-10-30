/**
 * Aqui se cambia esa bandera
 *
 * `true`: todos los endpoints de resultados (gráfica por candidatura y por
 * partido, distribución, resumen de votación, estadística, mapas y grillas de
 * actas) solo consideran actas con `prep_votos.validado = 'T'`, para que todas
 * las vistas publiquen las mismas cifras. `false`: se quita esa condición en
 * todos ellos a la vez (el filtro `contabilizar = 'T'` se mantiene donde ya
 * existía).
 */
export const SOLO_ACTAS_VALIDADAS = true;

/**
 * Condición SQL para `SOLO_ACTAS_VALIDADAS`, apta para QueryBuilder o SQL
 * crudo. `columna` siempre es un identificador fijo escrito en el código
 * (p. ej. `'v.validado'`), nunca entrada del cliente.
 */
export function condicionActaValidada(columna: string): string {
  return SOLO_ACTAS_VALIDADAS ? `${columna} = 'T'` : '1 = 1';
}
