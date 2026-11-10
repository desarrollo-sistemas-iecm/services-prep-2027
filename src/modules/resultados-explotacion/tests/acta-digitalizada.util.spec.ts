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
    tipoCasilla: 'B01',
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

  it('should be escaner when the acta was captured at the CATD by scanner', () => {
    expect([
      origenActa(acta({ capturadoPor: 1 })),
      origenActa(acta({ capturadoPor: 2 })),
    ]).toEqual(['escaner', 'escaner']);
  });

  it('should be movil-catd when an especial casilla was captured at the CATD', () => {
    expect(origenActa(acta({ capturadoPor: 1, tipoCasilla: 'S01' }))).toBe(
      'movil-catd',
    );
  });

  it('should be movil when the acta was captured from the casilla', () => {
    expect([
      origenActa(acta({ capturadoPor: 3 })),
      origenActa(acta({ capturadoPor: 4 })),
    ]).toEqual(['movil', 'movil']);
  });

  it('should be null when capturado_por is unknown', () => {
    expect(origenActa(acta({ capturadoPor: 9 }))).toBeNull();
  });
});
