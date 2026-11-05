import { DataSource } from 'typeorm';
import { createTestDataSource } from './helpers/test-data-source';
import { ResumenVotacionService } from '../services/resumen-votacion.service';
import { TipoEleccionCatalogoService } from '../services/tipo-eleccion-catalogo.service';
import { PrepVotosEntity } from '../../resultados-legacy/entities/prep-votos.entity';
import { ScdCasillasEntity } from '../../resultados-legacy/entities/scd-casillas.entity';
import { TipoEleccion } from '../enums/tipo-eleccion.enum';

// Fija el comportamiento con SOLO_ACTAS_VALIDADAS activo sin depender del valor
// con el que se publique la bandera.
jest.mock('../utils/acta-validada.util', () => ({
  SOLO_ACTAS_VALIDADAS: true,
  condicionActaValidada: (columna: string) => `${columna} = 'T'`,
}));

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
        validado: 'T',
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
        validado: 'T',
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
      // Contabilizada pero no validada: excluida por SOLO_ACTAS_VALIDADAS.
      {
        rowid: 4,
        idDistrito: 1,
        idDelegacion: 2,
        idSeccion: 101,
        tipoCasilla: 'S01',
        idTipoEleccion: TipoEleccion.JEFATURA_GOBIERNO,
        validado: 'F',
        contabilizar: 'T',
        votosCandNoReg: 777,
        votosNulos: 777,
        votacionTotal: 777,
      },
    ]);

    // Solo se usa `geoColumn()`, que no toca repositorios.
    const catalogo = new TipoEleccionCatalogoService(
      ...(Array(8).fill(undefined) as ConstructorParameters<
        typeof TipoEleccionCatalogoService
      >),
    );
    service = new ResumenVotacionService(
      dataSource.getRepository(PrepVotosEntity),
      catalogo,
    );
  });

  afterAll(async () => {
    await dataSource.destroy();
  });

  it('should aggregate only validated rows marked as contabilizar=T when asking for a tipo de elección', async () => {
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

  it('should aggregate only the selected sección when the filter includes seccion', async () => {
    const { resumen_votacion } = await service.obtener(
      TipoEleccion.JEFATURA_GOBIERNO,
      { distOAlcaldia: 1, seccion: 102, casilla: null },
    );

    expect(resumen_votacion.total).toBe(20);
    expect(resumen_votacion.candidatos_no_reg).toBe(1);
    expect(resumen_votacion.nulos).toBe(1);
  });

  it('should return zero votes when the selected district has no actas', async () => {
    const { resumen_votacion } = await service.obtener(
      TipoEleccion.JEFATURA_GOBIERNO,
      { distOAlcaldia: 5, seccion: 0, casilla: null },
    );

    expect(resumen_votacion.total).toBe(0);
  });
});
