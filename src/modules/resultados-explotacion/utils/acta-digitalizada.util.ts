/**
 * URL base del repositorio de imágenes de actas PREP. Equivale a `hostactas`
 * de la tabla `configura` (`tipo = 'PREP'`) que PREP2024 enviaba en
 * `api_avance_entidad.php`; esa tabla no existe en la base de 2027.
 *
 * TODO: definir la URL del repositorio de imágenes de 2027. Mientras esté
 * vacía ninguna acta expone `url_acta` y el botón "Ver" queda deshabilitado.
 */
export const URL_REPOSITORIO_ACTAS = '';

/** Origen de la imagen del acta que muestra la leyenda "Imagen procedente de". */
export type OrigenActa =
  'proceso' | 'escaner' | 'movil' | 'urna' | 'movil-catd';

/**
 * URL de la imagen de un acta: `<repositorio>/<id_distrito>/<nombre_img>`,
 * como `IconImageView` de PREP2024 (`hostactas + "/" + dto + "/" + nombreImg`).
 * Regresa `null` si no hay repositorio configurado o el acta no tiene imagen.
 */
export function construirUrlActa(
  repositorio: string,
  idDistrito: number | string | null,
  nombreImg: string | null,
): string | null {
  if (!repositorio || !nombreImg || idDistrito == null) return null;

  return `${repositorio.replace(/\/+$/, '')}/${idDistrito}/${encodeURIComponent(nombreImg)}`;
}

export interface DatosOrigenActa {
  capturadoPor: number | null;
  tipoCasilla: string | null;
  ueQr: string | null;
  nombreImg: string | null;
  validado: string | null;
}

/**
 * Origen de la imagen del acta.
 *
 * - Acta en proceso: sin imagen y sin validar, la misma regla con la que
 *   `GridCasillas` de PREP2024 mostraba el ícono de "acta en proceso".
 * - Urna electrónica: el acta trae el QR de la urna (`ue_qr`), igual que
 *   `IconImageView` de PREP2024.
 * - Escáner / Móvil / Móvil CATD: `capturado_por` con el mismo criterio que
 *   ORIGEN y DIGITALIZACION del export INE (`ExportDipService`), para que la
 *   página y la base de datos publiquen lo mismo.
 *
 * TODO: el PHP de PREP2024 (`export_ine_*.php`) mapeaba `capturado_por` 1-2
 * como MOVIL y 3-4 como ESCANER, al revés que el export de 2027; confirmar el
 * catálogo vigente de `capturado_por` y ajustar ambos lugares a la vez.
 */
export function origenActa({
  capturadoPor,
  tipoCasilla,
  ueQr,
  nombreImg,
  validado,
}: DatosOrigenActa): OrigenActa | null {
  if (!nombreImg && validado !== 'T') return 'proceso';
  if (ueQr) return 'urna';

  switch (Number(capturadoPor)) {
    case 1:
      return String(tipoCasilla ?? '').startsWith('S')
        ? 'movil-catd'
        : 'escaner';
    case 2:
      return 'escaner';
    case 3:
    case 4:
      return 'movil';
    default:
      return null;
  }
}
