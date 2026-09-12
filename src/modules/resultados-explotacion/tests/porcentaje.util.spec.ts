import { formatearPorcentaje } from '../utils/porcentaje.util';

describe('formatearPorcentaje', () => {
  it('should format the ratio as a percentage string with two decimals', () => {
    expect(formatearPorcentaje(50, 200)).toBe('25.00%');
  });

  it('should return 0.00% when the total is zero', () => {
    expect(formatearPorcentaje(10, 0)).toBe('0.00%');
  });

  it('should round to two decimals', () => {
    expect(formatearPorcentaje(1, 3)).toBe('33.33%');
  });
});
