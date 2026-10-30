import {
  condicionActaValidada,
  SOLO_ACTAS_VALIDADAS,
} from '../utils/acta-validada.util';

describe('condicionActaValidada', () => {
  it('should require validado = T when SOLO_ACTAS_VALIDADAS is enabled', () => {
    const condicion = condicionActaValidada('v.validado');

    expect(SOLO_ACTAS_VALIDADAS).toBe(true);
    expect(condicion).toBe("v.validado = 'T'");
  });
});
