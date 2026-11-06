export type TrustProxySetting = boolean | number | string;

export const DEFAULT_TRUST_PROXY = 'loopback, linklocal, uniquelocal';

/**
 * Traduce TRUST_PROXY al valor que acepta Express en `app.set('trust proxy')`.
 *
 * - `false` / `true`: no confiar / confiar en cualquier proxy.
 * - número entero: cantidad de saltos de proxy a confiar.
 * - lista separada por comas: subredes o nombres de proxy-addr
 *   (`loopback`, `linklocal`, `uniquelocal`, IPs o CIDR).
 *
 * El default confía solo en redes privadas: Nginx en el host llega al
 * contenedor desde el gateway del bridge de Docker (172.16.0.0/12) y el front
 * end de App Service desde una IP interna; un cliente de internet nunca está
 * en esas redes, así que no puede falsificar X-Forwarded-For.
 */
export function parseTrustProxy(
  rawValue: string | undefined,
): TrustProxySetting {
  const value = (rawValue ?? DEFAULT_TRUST_PROXY).trim();

  if (value === '' || value.toLowerCase() === 'false') return false;
  if (value.toLowerCase() === 'true') return true;
  if (/^\d+$/.test(value)) return Number(value);

  return value
    .split(',')
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0)
    .join(', ');
}

/**
 * Azure App Service agrega el puerto del cliente a X-Forwarded-For
 * (`203.0.113.5:51234`). Sin quitarlo, cada conexión del mismo cliente
 * contaría como un cliente distinto para el rate limiting.
 */
export function normalizeClientIp(rawIp: string | undefined): string {
  if (!rawIp) return '';

  const ip = rawIp.trim();

  const bracketedIpv6 = /^\[([^\]]+)\](?::\d+)?$/.exec(ip);
  if (bracketedIpv6) return bracketedIpv6[1];

  const ipv4WithPort = /^(\d{1,3}(?:\.\d{1,3}){3}):\d+$/.exec(ip);
  if (ipv4WithPort) return ipv4WithPort[1];

  const ipv4MappedIpv6 = /^::ffff:(\d{1,3}(?:\.\d{1,3}){3})$/i.exec(ip);
  if (ipv4MappedIpv6) return ipv4MappedIpv6[1];

  return ip;
}
