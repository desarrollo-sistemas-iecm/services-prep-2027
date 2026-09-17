/**
 * Fragmento SQL para la columna OBSERVACIONES, confirmado idéntico en `export_ine_dip.php` y
 * `export_ine_alc.php` reales. NO reutiliza `resultados-explotacion/utils/observaciones.util.ts`: ese
 * archivo implementa la regla de `actas_grid_data.php`, que combina "EXCEDE LISTA NOMINAL, ..." en los
 * casos 1/2 cuando `excede_ln='T'` — esta regla, en cambio, devuelve solo 'EXCEDE LISTA NOMINAL' en esos
 * casos. Son reglas de negocio distintas de archivos PHP distintos.
 */
export const OBSERVACIONES_INE_SQL = `CASE
    WHEN P.inconsistencia = 1 THEN CASE WHEN P.excede_ln = 'T' THEN 'EXCEDE LISTA NOMINAL' ELSE 'ALGUN CAMPO ILEGIBLE O SIN DATOS' END
    WHEN P.inconsistencia = 2 THEN CASE WHEN P.excede_ln = 'T' THEN 'EXCEDE LISTA NOMINAL' ELSE 'ALGUN CAMPO ILEGIBLE O SIN DATOS' END
    WHEN P.inconsistencia = 3 THEN 'EXCEDE LISTA NOMINAL'
    WHEN P.inconsistencia = 4 THEN 'SIN ACTA'
    WHEN P.inconsistencia = 5 THEN 'FUERA DE CATALOGO'
    WHEN P.inconsistencia = 6 THEN CASE WHEN P.excede_ln = 'T' THEN 'EXCEDE LISTA NOMINAL, TODOS ILEGIBLES O SIN DATO' ELSE 'TODOS ILEGIBLES O SIN DATO' END
    WHEN P.inconsistencia = 7 THEN CASE WHEN P.excede_ln = 'T' THEN 'EXCEDE LISTA NOMINAL, TODOS ILEGIBLES O SIN DATO' ELSE 'TODOS ILEGIBLES O SIN DATO' END
    WHEN P.inconsistencia = 11 THEN 'SIN ACTA POR PAQUETE NO ENTREGADO'
    WHEN P.inconsistencia = 12 THEN 'SIN ACTA POR CASILLA NO INSTALADA'
    WHEN P.inconsistencia = 13 THEN 'SIN ACTA POR PAQUETE ENTREGADO SIN BOLSA'
    WHEN P.inconsistencia = 14 THEN 'SIN ACTA POR CONTINGENCIA EN URNA ELECTRONICA'
    ELSE '--' END AS OBSERVACIONES`;
