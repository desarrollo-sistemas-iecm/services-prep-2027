import {
  DEFAULT_TRUST_PROXY,
  normalizeClientIp,
  parseTrustProxy,
} from './trust-proxy.config';

describe('parseTrustProxy', () => {
  it('should return the private-network default when the value is undefined', () => {
    expect(parseTrustProxy(undefined)).toBe(DEFAULT_TRUST_PROXY);
  });

  it('should return false when the value is "false"', () => {
    expect(parseTrustProxy('false')).toBe(false);
  });

  it('should return false when the value is empty', () => {
    expect(parseTrustProxy('  ')).toBe(false);
  });

  it('should return true when the value is "TRUE"', () => {
    expect(parseTrustProxy('TRUE')).toBe(true);
  });

  it('should return a hop count when the value is an integer', () => {
    expect(parseTrustProxy('1')).toBe(1);
  });

  it('should normalize spacing when the value is a subnet list', () => {
    expect(parseTrustProxy('loopback,10.0.0.0/8 ,  ,uniquelocal')).toBe(
      'loopback, 10.0.0.0/8, uniquelocal',
    );
  });
});

describe('normalizeClientIp', () => {
  it('should strip the port when an IPv4 address includes it', () => {
    expect(normalizeClientIp('203.0.113.5:51234')).toBe('203.0.113.5');
  });

  it('should keep a plain IPv4 address unchanged', () => {
    expect(normalizeClientIp('203.0.113.5')).toBe('203.0.113.5');
  });

  it('should unwrap an IPv4-mapped IPv6 address', () => {
    expect(normalizeClientIp('::ffff:172.18.0.1')).toBe('172.18.0.1');
  });

  it('should strip brackets and port when an IPv6 address includes them', () => {
    expect(normalizeClientIp('[2001:db8::1]:443')).toBe('2001:db8::1');
  });

  it('should keep a plain IPv6 address unchanged', () => {
    expect(normalizeClientIp('2001:db8::1')).toBe('2001:db8::1');
  });

  it('should return an empty string when the address is undefined', () => {
    expect(normalizeClientIp(undefined)).toBe('');
  });
});
