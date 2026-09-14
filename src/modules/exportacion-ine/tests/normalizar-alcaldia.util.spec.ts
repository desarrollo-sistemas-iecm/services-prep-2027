import { normalizarAlcaldia } from '../utils/normalizar-alcaldia.util';

describe('normalizarAlcaldia', () => {
  it.each([
    ['Azcapotzalco', 'AZCAPOTZALCO'],
    ['Coyoacán', 'COYOACAN'],
    ['Cuajimalpa de Morelos', 'CUAJIMALPA DE MORELOS'],
    ['Gustavo A. Madero', 'GUSTAVO A MADERO'],
    ['Iztacalco', 'IZTACALCO'],
    ['Iztapalapa', 'IZTAPALAPA'],
    ['La Magdalena Contreras', 'LA MAGDALENA CONTRERAS'],
    ['Milpa Alta', 'MILPA ALTA'],
    ['Álvaro Obregón', 'ALVARO OBREGON'],
    ['Tláhuac', 'TLAHUAC'],
    ['Tlalpan', 'TLALPAN'],
    ['Xochimilco', 'XOCHIMILCO'],
    ['Benito Juárez', 'BENITO JUAREZ'],
    ['Cuauhtémoc', 'CUAUHTEMOC'],
    ['Miguel Hidalgo', 'MIGUEL HIDALGO'],
    ['Venustiano Carranza', 'VENUSTIANO CARRANZA'],
  ])(
    'should normalize "%s" to "%s", matching the hardcoded CASE in export_ine_alc.php',
    (entrada, esperado) => {
      expect(normalizarAlcaldia(entrada)).toBe(esperado);
    },
  );

  it('should return N/A when nombreDelegacion is null', () => {
    expect(normalizarAlcaldia(null)).toBe('N/A');
  });

  it('should return N/A when nombreDelegacion is undefined', () => {
    expect(normalizarAlcaldia(undefined)).toBe('N/A');
  });

  it('should return N/A when nombreDelegacion is an empty string', () => {
    expect(normalizarAlcaldia('')).toBe('N/A');
  });
});
