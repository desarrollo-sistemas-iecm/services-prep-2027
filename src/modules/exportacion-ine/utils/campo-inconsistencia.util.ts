/**
 * Fragmento SQL que envuelve un campo numérico de acta según `P.inconsistencia`, repetido ~20 veces en
 * cada export_ine_*.php real: `SIN DATO` si inconsistencia IN (6,7), `SIN ACTA` si IN (4,11,12,13,14),
 * `ILEGIBLE ` (con espacio final) si IN (1,2), el valor tal cual en cualquier otro caso.
 *
 * Excepción confirmada en los dos PHP reales: el campo `NULOS` (`votos_nulos`) usa `'ILEGIBLE'` SIN
 * espacio final — inconsistencia/typo del original que se preserva vía el parámetro `ilegibleTexto`.
 */
export function campoInconsistencia(
  campoSql: string,
  alias: string,
  ilegibleTexto = 'ILEGIBLE ',
): string {
  return `(CASE WHEN ${campoSql} IS NULL AND P.inconsistencia IN (6,7) THEN 'SIN DATO'
    WHEN ${campoSql} IS NULL AND P.inconsistencia IN (4,11,12,13,14) THEN 'SIN ACTA'
    WHEN ${campoSql} IS NULL AND P.inconsistencia IN (1,2) THEN '${ilegibleTexto}'
    ELSE ${campoSql} END) AS ${alias}`;
}
