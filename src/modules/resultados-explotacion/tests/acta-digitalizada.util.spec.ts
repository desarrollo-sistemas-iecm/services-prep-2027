import {
  construirUrlActa,
  DatosOrigenActa,
  origenActa,
} from '../utils/acta-digitalizada.util';

describe('construirUrlActa', () => {
  it('should join repository, distrito and image name when every part is present', () => {
    expect(
      construirUrlActa(
        'https://actas.iecm.mx/prep2027/',
        18,
        '18-3188-C01dmr.jpg',
      ),
    ).toBe('https://actas.iecm.mx/prep2027/18/18-3188-C01dmr.jpg');
  });

  it('should return null when the repository is not configured', () => {
    expect(construirUrlActa('', 18, '18-3188-C01dmr.jpg')).toBeNull();
  });

  it('should return null when the acta has no image', () => {
    expect(construirUrlActa('https://actas.iecm.mx', 18, null)).toBeNull();
  });

  it('should encode the image name when it has unsafe characters', () => {
    expect(construirUrlActa('https://actas.iecm.mx', 0, '0 M01#jgob.jpg')).toBe(
      'https://actas.iecm.mx/0/0%20M01%23jgob.jpg',
    );
  });
});

describe('origenActa', () => {
  const acta = (datos: Partial<DatosOrigenActa>): DatosOrigenActa => ({
    capturadoPor: null,
    ueQr: null,
    nombreImg: 'acta.jpg',
    validado: 'T',
    ...datos,
  });

  it('should be proceso when the acta has no image and is not validated', () => {
    expect(origenActa(acta({ nombreImg: null, validado: 'F' }))).toBe(
      'proceso',
    );
  });

  it('should be urna when the acta carries the electronic ballot box QR', () => {
    expect(origenActa(acta({ ueQr: 'QR', capturadoPor: 3 }))).toBe('urna');
  });

  it('should be movil-catd when capturado_por is 1 or 2, like the PREP2024 export', () => {
    expect([
      origenActa(acta({ capturadoPor: 1 })),
      origenActa(acta({ capturadoPor: 2 })),
    ]).toEqual(['movil-catd', 'movil-catd']);
  });

  it('should be escaner when capturado_por is 3 or 4, like the PREP2024 export', () => {
    expect([
      origenActa(acta({ capturadoPor: 3 })),
      origenActa(acta({ capturadoPor: 4 })),
    ]).toEqual(['escaner', 'escaner']);
  });

  it('should be null when capturado_por is unknown', () => {
    expect(origenActa(acta({ capturadoPor: 9 }))).toBeNull();
  });
});
