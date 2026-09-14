/**
 * Replica el `CASE` hardcodeado de 16 ramas de `export_ine_alc.php` a partir de
 * `cain_cat_delegacion.nombre_delegacion`, en vez de duplicarlo. El legado no lleva acentos ni periodos
 * (`'GUSTAVO A MADERO'`, sin punto, aunque la BD tiene `'Gustavo A. Madero'`) — verificado contra las 16
 * alcaldías reales y las 16 ramas del CASE original.
 */
export function normalizarAlcaldia(
  nombreDelegacion: string | null | undefined,
): string {
  if (!nombreDelegacion) return 'N/A';
  return nombreDelegacion
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/\./g, '')
    .toUpperCase();
}
