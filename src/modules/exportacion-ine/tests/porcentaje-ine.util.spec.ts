import { formatoPorcentajeIne } from '../utils/porcentaje-ine.util';

describe('formatoPorcentajeIne', () => {
  it('should format with exactly 4 decimals and a thousands separator, like PHP number_format($v, 4, ".", ",")', () => {
    expect(formatoPorcentajeIne(1234, 10)).toBe('12,340.0000');
  });

  it('should round to 4 decimals', () => {
    expect(formatoPorcentajeIne(1, 3)).toBe('33.3333');
  });

  it('should return 0.0000 when total is 0, avoiding division by zero', () => {
    expect(formatoPorcentajeIne(5, 0)).toBe('0.0000');
  });

  it('should not include a percent sign', () => {
    expect(formatoPorcentajeIne(50, 100)).not.toContain('%');
  });
});
