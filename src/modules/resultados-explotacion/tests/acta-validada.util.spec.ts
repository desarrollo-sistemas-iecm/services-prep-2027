import {
  condicionActaValidada,
  SOLO_ACTAS_VALIDADAS,
} from '../utils/acta-validada.util';

describe('condicionActaValidada', () => {
  it('should follow SOLO_ACTAS_VALIDADAS when building the validado condition', () => {
    const condicion = condicionActaValidada('v.validado');

    expect(condicion).toBe(SOLO_ACTAS_VALIDADAS ? "v.validado = 'T'" : '1 = 1');
  });
});
