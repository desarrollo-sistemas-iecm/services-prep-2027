/**
 * Replica `number_format((($valor/$total)*100), 4, '.', ',')` de PHP — 4 decimales, separador de miles
 * `,`, sin símbolo `%`. Usado en la fila de estadísticas del CSV del export INE. No es el mismo formato
 * que `resultados-explotacion/utils/porcentaje.util.ts::formatearPorcentaje` (ese usa 2 decimales y `%`).
 */
export function formatoPorcentajeIne(valor: number, total: number): string {
  const porcentaje = total ? (valor * 100) / total : 0;
  return porcentaje.toLocaleString('en-US', {
    minimumFractionDigits: 4,
    maximumFractionDigits: 4,
  });
}
