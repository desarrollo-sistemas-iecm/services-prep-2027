import { DataSource } from 'typeorm';
import { createTestDataSource } from './helpers/test-data-source';
import { ResumenVotacionService } from '../services/resumen-votacion.service';
import { PrepVotosEntity } from '../../resultados-legacy/entities/prep-votos.entity';
import { ScdCasillasEntity } from '../../resultados-legacy/entities/scd-casillas.entity';
import { TipoEleccion } from '../enums/tipo-eleccion.enum';

describe('ResumenVotacionService', () => {
  let dataSource: DataSource;
  let service: ResumenVotacionService;

  beforeAll(async () => {
    dataSource = await createTestDataSource();

    await dataSource.getRepository(ScdCasillasEntity).save([
      {
        rowid: 1,
        idDistrito: 1,
        idDelegacion: 2,
        idSeccion: 101,
        tipoCasilla: 'S01',
        listaNominal: 200,
      },
      {
        rowid: 2,
        idDistrito: 1,
        idDelegacion: 2,
        idSeccion: 102,
        tipoCasilla: 'M01',
        listaNominal: 50,
      },
    ]);

    await dataSource.getRepository(PrepVotosEntity).save([
      {
        rowid: 1,
        idDistrito: 1,
        idDelegacion: 2,
        idSeccion: 101,
        tipoCasilla: 'S01',
        idTipoEleccion: TipoEleccion.JEFATURA_GOBIERNO,
        contabilizar: 'T',
        votosCandNoReg: 5,
        votosNulos: 3,
        votacionTotal: 100,
      },
      {
        rowid: 2,
        idDistrito: 1,
        idDelegacion: 2,
        idSeccion: 102,
        tipoCasilla: 'M01',
        idTipoEleccion: TipoEleccion.JEFATURA_GOBIERNO,
        contabilizar: 'T',
        votosCandNoReg: 1,
        votosNulos: 1,
        votacionTotal: 20,
      },
      {
        rowid: 3,
        idDistrito: 1,
        idDelegacion: 2,
        idSeccion: 101,
        tipoCasilla: 'S01',
        idTipoEleccion: TipoEleccion.JEFATURA_GOBIERNO,
        contabilizar: 'F',
        votosCandNoReg: 999,
        votosNulos: 999,
        votacionTotal: 999,
      },
    ]);

    service = new ResumenVotacionService(
      dataSource.getRepository(PrepVotosEntity),
    );
  });

  afterAll(async () => {
    await dataSource.destroy();
  });

  it('should aggregate only rows marked as contabilizar=T for the requested tipo de elección', async () => {
    const { success, resumen_votacion } = await service.obtener(
      TipoEleccion.JEFATURA_GOBIERNO,
    );

    expect(success).toBe(true);
    expect(resumen_votacion.total).toBe(120);
    expect(resumen_votacion.candidatos_no_reg).toBe(6);
    expect(resumen_votacion.nulos).toBe(4);
    expect(resumen_votacion.votos_acumulados).toBe(110);
    // `S01` (100 votos) es Casilla Especial; `M01` (20 votos) no lo es.
    expect(resumen_votacion.votos_especiales).toBe(100);
    expect(resumen_votacion.votos_sin_especiales).toBe(20);
    expect(resumen_votacion.suma_esp_s_esp).toBe(120);
    expect(resumen_votacion.total_por).toBe('100.00%');
    expect(resumen_votacion.candidatos_no_reg_por).toBe('5.00%');
    expect(resumen_votacion.porcentaje_votos_acumulados).toBe('44.00%');
  });

  it('should return zeroed percentages instead of dividing by zero when there is no data for the tipo de elección', async () => {
    const { resumen_votacion } = await service.obtener(TipoEleccion.ALCALDIA);

    expect(resumen_votacion.total).toBe(0);
    expect(resumen_votacion.total_por).toBe('0.00%');
    expect(resumen_votacion.porcentaje_votos_acumulados).toBe('0.00%');
  });
});
