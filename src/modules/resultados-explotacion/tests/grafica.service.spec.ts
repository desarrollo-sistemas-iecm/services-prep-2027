import { DataSource } from 'typeorm';
import { createTestDataSource } from './helpers/test-data-source';
import { GraficaService } from '../services/grafica.service';
import { TipoEleccionCatalogoService } from '../services/tipo-eleccion-catalogo.service';
import { PrepVotosEntity } from '../../resultados-legacy/entities/prep-votos.entity';
import { TipoEleccion } from '../enums/tipo-eleccion.enum';

describe('GraficaService', () => {
  let dataSource: DataSource;
  let service: GraficaService;
  let catalogo: TipoEleccionCatalogoService;

  beforeAll(async () => {
    dataSource = await createTestDataSource();

    await dataSource.getRepository(PrepVotosEntity).save([
      // Grupo 1 de coalición (incluye distrito 1)
      {
        rowid: 1,
        idDistrito: 1,
        idTipoEleccion: TipoEleccion.DIPUTACION_MR,
        validado: 'T',
        contabilizar: 'T',
        votosPart6: 10,
        totalVotosCc1: 20,
        totalVotosCc5: 5,
        votacionTotal: 100,
      },
      // Grupo 2 de coalición (incluye distrito 7)
      {
        rowid: 2,
        idDistrito: 7,
        idTipoEleccion: TipoEleccion.DIPUTACION_MR,
        validado: 'T',
        contabilizar: 'T',
        votosPart4: 8,
        totalVotosCc1: 15,
        votacionTotal: 50,
      },
      // Grupo 3 de coalición (incluye distrito 12)
      {
        rowid: 3,
        idDistrito: 12,
        idTipoEleccion: TipoEleccion.DIPUTACION_MR,
        validado: 'T',
        contabilizar: 'T',
        votosPart1: 3,
        totalVotosCc5: 7,
        votacionTotal: 30,
      },
      // Fila de otro tipo de elección: no debe filtrarse por
      // pruebaDistribucion(type=1) ni contar en la suma de coalición DMR.
      {
        rowid: 4,
        idDistrito: 1,
        idTipoEleccion: TipoEleccion.JEFATURA_GOBIERNO,
        contabilizar: 'T',
        votosPart1: 999,
        votacionTotal: 999,
      },
      // Fila con contabilizar='F': debe excluirse de pruebaDistribucion.
      {
        rowid: 5,
        idDistrito: 1,
        idTipoEleccion: TipoEleccion.JEFATURA_GOBIERNO,
        contabilizar: 'F',
        votosPart1: 111,
        votacionTotal: 111,
      },
      // Distrito 50: una casilla normal y una de voto en el extranjero
      // (prefijo 'M'), para probar el split de pruebaDistribucion().
      {
        rowid: 6,
        idDistrito: 50,
        idTipoEleccion: TipoEleccion.JEFATURA_GOBIERNO,
        tipoCasilla: 'B01',
        validado: 'T',
        contabilizar: 'T',
        votosPart1: 40,
        votacionTotal: 40,
      },
      {
        rowid: 7,
        idDistrito: 50,
        idTipoEleccion: TipoEleccion.JEFATURA_GOBIERNO,
        tipoCasilla: 'M01',
        validado: 'T',
        contabilizar: 'T',
        votosPart1: 5,
        votacionTotal: 5,
      },
      // Distrito 60: casilla normal para distinguir nivel entidad de distrito.
      {
        rowid: 8,
        idDistrito: 60,
        idTipoEleccion: TipoEleccion.JEFATURA_GOBIERNO,
        tipoCasilla: 'B01',
        validado: 'T',
        contabilizar: 'T',
        votosPart1: 10,
        votacionTotal: 10,
      },
    ]);

    catalogo = new TipoEleccionCatalogoService(
      undefined as never,
      undefined as never,
      undefined as never,
      undefined as never,
      undefined as never,
      undefined as never,
      undefined as never,
      undefined as never,
    );
    // `grafica()` ahora pide el catálogo de candidatos para armar `agrupado`
    // incluso en la rama de coalición DMR; este spec solo prueba la
    // agregación de `resumen`, así que se mockea un catálogo vacío.
    jest.spyOn(catalogo, 'getCandidatos').mockResolvedValue([]);

    service = new GraficaService(
      dataSource.getRepository(PrepVotosEntity),
      catalogo,
    );
  });

  afterAll(async () => {
    await dataSource.destroy();
  });

  it('should combine the 3 hardcoded coalición groups for diputación MR (TODO logic)', async () => {
    const { resumen, agrupado, coalicionPendiente } = await service.grafica(
      TipoEleccion.DIPUTACION_MR,
      0,
      0,
      null,
    );

    expect(coalicionPendiente).toBe(true);
    expect(resumen.votos_part_1).toBe(3);
    expect(resumen.votos_part_4).toBe(8);
    expect(resumen.votos_part_6).toBe(10);
    expect(resumen.votos_part_10).toBe(35);
    expect(resumen.votos_part_14).toBe(12);
    expect(resumen.votacion_total).toBe(180);

    // Sin candidatos en el catálogo (mockeado vacío), `agrupado` solo trae
    // las filas de no_registrados/votos_nulos, sin ganador.
    expect(agrupado).toHaveLength(2);
    expect(agrupado.map((fila) => fila.siglas)).toEqual([
      'no_registrados',
      'votos_nulos',
    ]);
    expect(agrupado.every((fila) => fila.ganador === false)).toBe(true);
  });

  it('should return raw rows filtered by contabilizar=T and a success flag instead of the legacy fixed error string', async () => {
    const result = await service.pruebaDistribucion(
      TipoEleccion.JEFATURA_GOBIERNO,
      1,
      0,
      null,
    );

    expect(result.success).toBe(true);
    expect(result.datosMSSQL).toHaveLength(1);
    expect(result.datosMSSQL[0].votos_part_1).toBe(999);
  });

  it('should split agrupado/dataExtranjero by tipo_casilla prefix M (voto en el extranjero)', async () => {
    jest.spyOn(catalogo, 'getCandidatos').mockResolvedValueOnce([
      {
        idParticipante: 1,
        descripcion: 'Partido X',
        siglas: 'PX',
        campoVotos: 'votos_part_1',
      },
    ]);

    const { agrupado, dataExtranjero } = await service.pruebaDistribucion(
      TipoEleccion.JEFATURA_GOBIERNO,
      50,
      0,
      null,
    );

    expect(agrupado).toHaveLength(3); // candidato + no_registrados + votos_nulos
    expect(agrupado[0]).toMatchObject({ siglas: 'PX', total_votos: 40 });

    expect(dataExtranjero[0]).toMatchObject({ siglas: 'PX', total_votos: 5 });
  });

  const partidoX = {
    idParticipante: 1,
    descripcion: 'Partido X',
    siglas: 'PX',
    campoVotos: 'votos_part_1',
  };

  it('should sum every district when grafica is requested at entity level', async () => {
    jest.spyOn(catalogo, 'getCandidatos').mockResolvedValueOnce([partidoX]);

    const { resumen, agrupado } = await service.grafica(
      TipoEleccion.JEFATURA_GOBIERNO,
      0,
      0,
      null,
    );

    expect(resumen.votacion_total).toBe(55);
    expect(agrupado[0]).toMatchObject({ siglas: 'PX', total_votos: 55 });
  });

  it('should filter by district when grafica receives dist_o_alcaldia', async () => {
    jest.spyOn(catalogo, 'getCandidatos').mockResolvedValueOnce([partidoX]);

    const { resumen } = await service.grafica(
      TipoEleccion.JEFATURA_GOBIERNO,
      60,
      0,
      null,
    );

    expect(resumen.votacion_total).toBe(10);
  });

  it('should mark the single candidate with most votes as ganador', async () => {
    jest.spyOn(catalogo, 'getCandidatos').mockResolvedValueOnce([
      partidoX,
      {
        ...partidoX,
        idParticipante: 2,
        siglas: 'PY',
        campoVotos: 'votos_part_2',
      },
    ]);

    const { agrupado } = await service.grafica(
      TipoEleccion.JEFATURA_GOBIERNO,
      0,
      0,
      null,
    );

    expect(agrupado.map(({ siglas, ganador }) => [siglas, ganador])).toEqual([
      ['PX', true],
      ['PY', false],
      ['no_registrados', false],
      ['votos_nulos', false],
    ]);
  });

  it('should not mark any ganador when the top candidates are tied', async () => {
    jest
      .spyOn(catalogo, 'getCandidatos')
      .mockResolvedValueOnce([
        partidoX,
        { ...partidoX, idParticipante: 2, siglas: 'PY' },
      ]);

    const { agrupado } = await service.grafica(
      TipoEleccion.JEFATURA_GOBIERNO,
      0,
      0,
      null,
    );

    expect(agrupado.some(({ ganador }) => ganador)).toBe(false);
  });

  it('should split casillas and extranjero across the whole entity when pruebaDistribucion has no district', async () => {
    jest.spyOn(catalogo, 'getCandidatos').mockResolvedValueOnce([partidoX]);

    const { datosMSSQL, agrupado, dataExtranjero } =
      await service.pruebaDistribucion(
        TipoEleccion.JEFATURA_GOBIERNO,
        0,
        0,
        null,
      );

    expect(datosMSSQL).toEqual([]);
    expect(agrupado[0]).toMatchObject({ siglas: 'PX', total_votos: 50 });
    expect(dataExtranjero[0]).toMatchObject({ siglas: 'PX', total_votos: 5 });
  });
});
