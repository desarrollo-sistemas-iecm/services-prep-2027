import { DataSource } from 'typeorm';
import { createTestDataSource } from './helpers/test-data-source';
import { CombosService } from '../services/combos.service';
import { TipoEleccionCatalogoService } from '../services/tipo-eleccion-catalogo.service';
import { CainCatDistritoEntity } from '../../resultados-legacy/entities/cain-cat-distrito.entity';
import { CainCatDelegacionEntity } from '../../resultados-legacy/entities/cain-cat-delegacion.entity';
import { ScdCasillasEntity } from '../../resultados-legacy/entities/scd-casillas.entity';
import { TipoEleccion } from '../enums/tipo-eleccion.enum';

describe('CombosService', () => {
  let dataSource: DataSource;
  let service: CombosService;

  beforeAll(async () => {
    dataSource = await createTestDataSource();

    await dataSource.getRepository(CainCatDistritoEntity).save([
      { rowid: 1, idDistrito: 1 },
      { rowid: 2, idDistrito: 2 },
    ]);
    await dataSource.getRepository(CainCatDelegacionEntity).save([
      { rowid: 1, idDelegacion: 2, nombreDelegacion: 'Álvaro Obregón' },
      { rowid: 2, idDelegacion: 3, nombreDelegacion: 'Azcapotzalco' },
    ]);
    await dataSource.getRepository(ScdCasillasEntity).save([
      {
        rowid: 1,
        idDistrito: 1,
        idDelegacion: 2,
        idSeccion: 101,
        tipoCasilla: 'S01',
      },
      {
        rowid: 2,
        idDistrito: 1,
        idDelegacion: 2,
        idSeccion: 101,
        tipoCasilla: 'C01',
      },
      {
        rowid: 3,
        idDistrito: 1,
        idDelegacion: 2,
        idSeccion: 102,
        tipoCasilla: 'S01',
      },
    ]);

    // CombosService solo usa TipoEleccionCatalogoService.geoColumnCombo(),
    // que no toca ningún repositorio — no hace falta seedear catálogos de
    // candidatos/participantes para estas pruebas.
    const catalogo = new TipoEleccionCatalogoService(
      undefined as never,
      undefined as never,
      undefined as never,
      undefined as never,
      undefined as never,
      undefined as never,
      undefined as never,
      undefined as never,
    );

    service = new CombosService(
      dataSource.getRepository(CainCatDistritoEntity),
      dataSource.getRepository(CainCatDelegacionEntity),
      dataSource.getRepository(ScdCasillasEntity),
      catalogo,
    );
  });

  afterAll(async () => {
    await dataSource.destroy();
  });

  it('should return the districts catalog when type is jefatura de gobierno', async () => {
    const result = await service.primero(TipoEleccion.JEFATURA_GOBIERNO);

    expect(result.categories).toEqual([
      { id: 1, name: 'Distrito 1' },
      { id: 2, name: 'Distrito 2' },
    ]);
  });

  it('should return the alcaldías catalog when type is alcaldia', async () => {
    const result = await service.primero(TipoEleccion.ALCALDIA);

    expect(result.categories).toEqual([
      { id: 2, name: 'Álvaro Obregón' },
      { id: 3, name: 'Azcapotzalco' },
    ]);
  });

  it('should return distinct sections for the selected district', async () => {
    const result = await service.segundo(TipoEleccion.JEFATURA_GOBIERNO, 1);

    expect(result.subcategories).toEqual([
      { id: 101, name: 101 },
      { id: 102, name: 102 },
    ]);
    expect(result.estado[0].reg_cat).toBe(2);
  });

  it('should return an empty list when the district has no sections', async () => {
    const result = await service.segundo(TipoEleccion.JEFATURA_GOBIERNO, 999);

    expect(result.subcategories).toEqual([]);
  });

  it('should return distinct polling station types for the selected section', async () => {
    const result = await service.tercero(
      TipoEleccion.JEFATURA_GOBIERNO,
      1,
      101,
    );

    expect(result.items).toEqual([
      { id: 'S01', name: 'S01' },
      { id: 'C01', name: 'C01' },
    ]);
  });

  it('should filter sections by delegación instead of distrito when type is alcaldia', async () => {
    const result = await service.segundo(TipoEleccion.ALCALDIA, 2);

    expect(result.subcategories).toEqual([
      { id: 101, name: 101 },
      { id: 102, name: 102 },
    ]);
  });
});
