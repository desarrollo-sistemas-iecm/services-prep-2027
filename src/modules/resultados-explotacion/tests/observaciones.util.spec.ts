import { calcularObservaciones } from '../utils/observaciones.util';

describe('calcularObservaciones', () => {
  it('should return the fixed text for a code that does not depend on excede_ln', () => {
    expect(calcularObservaciones(4, null)).toBe('SIN ACTA');
    expect(calcularObservaciones(5, 'T')).toBe('FUERA DE CATALOGO');
    expect(calcularObservaciones(11, null)).toBe(
      'SIN ACTA POR PAQUETE NO ENTREGADO',
    );
  });

  it('should append the excede lista nominal note for codes 1/2 when excede_ln is T', () => {
    expect(calcularObservaciones(1, 'T')).toBe(
      'EXCEDE LISTA NOMINAL, ALGUN CAMPO ILEGIBLE O SIN DATOS ',
    );
    expect(calcularObservaciones(2, 'F')).toBe(
      'ALGUN CAMPO ILEGIBLE O SIN DATOS',
    );
  });

  it('should append the excede lista nominal note for codes 6/7 when excede_ln is T', () => {
    expect(calcularObservaciones(6, 'T')).toBe(
      'EXCEDE LISTA NOMINAL, TODOS ILEGIBLES O SIN DATO ',
    );
    expect(calcularObservaciones(7, 'F')).toBe('TODOS ILEGIBLES O SIN DATO');
  });

  it('should return "--" for an unmapped or null inconsistencia code', () => {
    expect(calcularObservaciones(null, null)).toBe('--');
    expect(calcularObservaciones(999, null)).toBe('--');
  });
});
