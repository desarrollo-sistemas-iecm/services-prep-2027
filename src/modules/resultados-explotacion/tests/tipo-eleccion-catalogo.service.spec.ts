import { TipoEleccionCatalogoService } from '../services/tipo-eleccion-catalogo.service';
import { TipoEleccion } from '../enums/tipo-eleccion.enum';

describe('TipoEleccionCatalogoService', () => {
  // geoColumn()/geoColumnCombo() son puras (no tocan repositorios).
  const service = new TipoEleccionCatalogoService(
    undefined as never,
    undefined as never,
    undefined as never,
    undefined as never,
    undefined as never,
    undefined as never,
    undefined as never,
    undefined as never,
  );

  describe('geoColumn', () => {
    it('should return id_distrito for jefatura de gobierno, diputación MR and RP', () => {
      expect(service.geoColumn(TipoEleccion.JEFATURA_GOBIERNO)).toBe(
        'id_distrito',
      );
      expect(service.geoColumn(TipoEleccion.DIPUTACION_MR)).toBe('id_distrito');
      expect(service.geoColumn(TipoEleccion.REPRESENTACION_PROPORCIONAL)).toBe(
        'id_distrito',
      );
    });

    it('should return id_delegacion for alcaldía', () => {
      expect(service.geoColumn(TipoEleccion.ALCALDIA)).toBe('id_delegacion');
    });
  });

  describe('geoColumnCombo', () => {
    it('should return id_distrito only for jefatura de gobierno and diputación MR', () => {
      expect(service.geoColumnCombo(TipoEleccion.JEFATURA_GOBIERNO)).toBe(
        'id_distrito',
      );
      expect(service.geoColumnCombo(TipoEleccion.DIPUTACION_MR)).toBe(
        'id_distrito',
      );
    });

    it('should return id_delegacion for RP and alcaldía (per api_subcategories.php/api_items.php)', () => {
      expect(
        service.geoColumnCombo(TipoEleccion.REPRESENTACION_PROPORCIONAL),
      ).toBe('id_delegacion');
      expect(service.geoColumnCombo(TipoEleccion.ALCALDIA)).toBe(
        'id_delegacion',
      );
    });
  });
});
