import { DataSource } from 'typeorm';
import { createTestDataSource } from './helpers/test-data-source';
import { BusquedaSeccionService } from '../services/busqueda-seccion.service';
import { ScdCasillasEntity } from '../../resultados-legacy/entities/scd-casillas.entity';

describe('BusquedaSeccionService', () => {
  let dataSource: DataSource;
  let service: BusquedaSeccionService;

  beforeAll(async () => {
    dataSource = await createTestDataSource();

    await dataSource.getRepository(ScdCasillasEntity).save([
      {
        rowid: 1,
        idDistrito: 5,
        idDelegacion: 2,
        idSeccion: 101,
        tipoCasilla: 'S01',
        estatus: 'T',
      },
      {
        rowid: 2,
        idDistrito: 5,
        idDelegacion: 2,
        idSeccion: 101,
        tipoCasilla: 'C01',
        estatus: 'T',
      },
      {
        rowid: 3,
        idDistrito: 5,
        idDelegacion: 2,
        idSeccion: 101,
        tipoCasilla: 'M01',
        estatus: 'F',
      },
    ]);

    service = new BusquedaSeccionService(
      dataSource.getRepository(ScdCasillasEntity),
    );
  });

  afterAll(async () => {
    await dataSource.destroy();
  });

  it('should return the district, delegación and count when the section exists', async () => {
    const result = await service.buscar(101);

    expect(result).toEqual({
      encontrada: {
        id_seccion: '101',
        id_delegacion: '2',
        id_distrito: '5',
        cuantos: 2,
      },
    });
  });

  it('should return zeroed data when the section does not exist', async () => {
    const result = await service.buscar(999);

    expect(result).toEqual({
      encontrada: {
        id_seccion: '999',
        id_delegacion: '0',
        id_distrito: '0',
        cuantos: 0,
      },
    });
  });
});
