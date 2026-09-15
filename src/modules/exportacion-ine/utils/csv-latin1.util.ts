import * as iconv from 'iconv-lite';

function escaparCampoCsv(valor: string): string {
  const necesitaComillas = /["\n\r,]/.test(valor);
  const escapado = valor.replace(/"/g, '""');
  return necesitaComillas ? `"${escapado}"` : escapado;
}

/**
 * Replica `fputcsv()` (delimitador `,`, comillas dobles solo si el campo contiene `,`/`"`/salto de línea,
 * comilla interna duplicada, línea terminada en `\n`) seguido de `utf8_decode()` — el resultado son bytes
 * Latin-1/ISO-8859-1, no UTF-8. Requerido por las herramientas del INE que consumen estos archivos.
 */
export function filaCsv(campos: (string | number | null)[]): Buffer {
  const linea = campos
    .map((campo) =>
      escaparCampoCsv(
        campo === null || campo === undefined ? '' : String(campo),
      ),
    )
    .join(',');
  return iconv.encode(`${linea}\n`, 'latin1');
}
