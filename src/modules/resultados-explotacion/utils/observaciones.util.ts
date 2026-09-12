/**
 * CASE de 8 ramas de `actas_grid_data.php`/`_rp.php`/`_voto_prision_ant.php`
 * (docs/CONSULTAS_SQL_PREP2024.md §4.2, idéntico en los 3 endpoints — aquí
 * unificado en un solo lugar, tal como sugiere la nota de "Duplicación de
 * queries" punto 2 del documento).
 */
export function calcularObservaciones(
  inconsistencia: number | null,
  excedeLn: string | null,
): string {
  const excede = excedeLn === 'T';
  switch (inconsistencia) {
    case 1:
    case 2:
    case 6:
    case 7:
      return excede
        ? `EXCEDE LISTA NOMINAL, ${inconsistencia <= 2 ? 'ALGUN CAMPO ILEGIBLE O SIN DATOS' : 'TODOS ILEGIBLES O SIN DATO'} `
        : inconsistencia <= 2
          ? 'ALGUN CAMPO ILEGIBLE O SIN DATOS'
          : 'TODOS ILEGIBLES O SIN DATO';
    case 3:
      return 'EXCEDE LISTA NOMINAL';
    case 4:
      return 'SIN ACTA';
    case 5:
      return 'FUERA DE CATALOGO';
    case 11:
      return 'SIN ACTA POR PAQUETE NO ENTREGADO';
    case 12:
      return 'SIN ACTA POR CASILLA NO INSTALADA';
    case 13:
      return 'SIN ACTA POR PAQUETE ENTREGADO SIN BOLSA';
    case 14:
      return 'SIN ACTA POR CONTINGENCIA EN URNA ELECRONICA';
    default:
      return '--';
  }
}
