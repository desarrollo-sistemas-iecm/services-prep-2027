import { DataSource } from 'typeorm';
import { createTestDataSource } from './helpers/test-data-source';
import { AvanceService } from '../services/avance.service';
import { TipoEleccion } from '../enums/tipo-eleccion.enum';
import { PrepVotosEntity } from '../../resultados-legacy/entities/prep-votos.entity';
import { ScdCasillasEntity } from '../../resultados-legacy/entities/scd-casillas.entity';
import { CorteLegacyEntity } from '../../resultados-legacy/entities/corte-legacy.entity';

/**
 * Casillas aprobadas: básica (LN 600), contigua (LN 400), especial (LN 0) y
 * voto en el extranjero (LN 100), más una no aprobada que no debe contar.
 * Lista nominal total: 1,100.
 */
describe('AvanceService', () => {
  let dataSource: DataSource;
  let service: AvanceService;

  const casilla = (
    rowid: number,
    tipoCasilla: string,
    listaNominal: number,
    estatus = 'T',
  ) => ({
    rowid,
    idDistrito: tipoCasilla.startsWith('M') ? 0 : 1,
    idDelegacion: tipoCasilla.startsWith('M') ? 0 : 1,
    idSeccion: tipoCasilla.startsWith('M') ? 0 : 10,
    tipoCasilla,
    listaNominal,
    estatus,
  });

  const acta = (
    rowid: number,
    idTipoEleccion: TipoEleccion,
    tipoCasilla: string,
    votacionTotal: number,
  ) => ({
    rowid,
    idTipoEleccion,
    idDistrito: tipoCasilla.startsWith('M') ? 0 : 1,
    idDelegacion: tipoCasilla.startsWith('M') ? 0 : 1,
    idSeccion: tipoCasilla.startsWith('M') ? 0 : 10,
    tipoCasilla,
    contabilizar: 'T',
    votacionTotal,
  });

  beforeAll(async () => {
    dataSource = await createTestDataSource();

    await dataSource
      .getRepository(ScdCasillasEntity)
      .save([
        casilla(1, 'B01', 600),
        casilla(2, 'C01', 400),
        casilla(3, 'S01', 0),
        casilla(4, 'M01', 100),
        casilla(5, 'C02', 999, 'F'),
      ]);

    await dataSource
      .getRepository(PrepVotosEntity)
      .save([
        acta(1, TipoEleccion.JEFATURA_GOBIERNO, 'B01', 300),
        acta(2, TipoEleccion.JEFATURA_GOBIERNO, 'M01', 50),
        acta(3, TipoEleccion.DIPUTACION_MR, 'B01', 300),
        acta(4, TipoEleccion.REPRESENTACION_PROPORCIONAL, 'S01', 20),
        acta(5, TipoEleccion.ALCALDIA, 'B01', 280),
        acta(6, TipoEleccion.ALCALDIA, 'C01', 120),
      ]);

    service = new AvanceService(
      dataSource.getRepository(PrepVotosEntity),
      dataSource.getRepository(ScdCasillasEntity),
      dataSource.getRepository(CorteLegacyEntity),
    );
  });

  afterAll(async () => {
    await dataSource.destroy();
  });

  it('should divide the votes by the nominal list of every approved casilla when computing participation', async () => {
    const { avance } = await service.obtener(TipoEleccion.JEFATURA_GOBIERNO);

    // 350 × 100 / 1,100; no entre la LN de las casillas con acta (700).
    expect(avance).toEqual({
      actas_capturadas: 2,
      actas_capturadas_de: 4,
      actas_cap_porcen: '50.0000',
      participacion_porcen: '31.8182',
      ln: 1100,
      ln_capturadas: 700,
    });
  });

  it('should leave RP actas out of participation but count them as actas when the election is diputaciones', async () => {
    const { avance } = await service.obtener(TipoEleccion.DIPUTACION_MR);

    // Esperadas: 4 casillas + 1 especial; participación: 300 × 100 / 1,100.
    expect(avance).toEqual({
      actas_capturadas: 2,
      actas_capturadas_de: 5,
      actas_cap_porcen: '40.0000',
      participacion_porcen: '27.2727',
      ln: 1100,
      ln_capturadas: 600,
    });
  });

  it('should exclude the foreign vote casillas and their nominal list when the election is alcaldías', async () => {
    const { avance } = await service.obtener(TipoEleccion.ALCALDIA);

    // Esperadas: 4 − 1 casilla M; participación: 400 × 100 / (1,100 − 100).
    expect(avance).toEqual({
      actas_capturadas: 2,
      actas_capturadas_de: 3,
      actas_cap_porcen: '66.6667',
      participacion_porcen: '40.0000',
      ln: 1000,
      ln_capturadas: 1000,
    });
  });
});
