/** `"12.34%"`, o `"0.00%"` si `total` es 0/nulo (evita división por cero). */
export function formatearPorcentaje(valor: number, total: number): string {
  if (!total) return '0.00%';
  return `${((valor * 100) / total).toFixed(2)}%`;
}

/** Igual que `formatearPorcentaje` pero como número (sin el símbolo `%`), para consumidores que lo agregan ellos mismos. */
export function porcentajeNumerico(valor: number, total: number): number {
  if (!total) return 0;
  return Number(((valor * 100) / total).toFixed(2));
}

/** `"65.6653"`: 4 decimales y sin `%`, como `number_format(..., 4)` del Avance Entidad de 2024; el front agrega el símbolo. */
export function porcentajeCuatroDecimales(
  valor: number,
  total: number,
): string {
  if (!total) return '0.0000';
  return ((valor * 100) / total).toFixed(4);
}
