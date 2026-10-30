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
      // Tipo 4 (alcaldía), delegación 80: partidos 1-3 más la combinación
      // `votos_part_10` (integrantes 1&2&3), en territorio y en el extranjero,
      // para probar la vista "Votos por Partido Político".
      {
        rowid: 9,
        idDistrito: 0,
        idDelegacion: 80,
        idTipoEleccion: TipoEleccion.ALCALDIA,
        tipoCasilla: 'B01',
        validado: 'T',
        contabilizar: 'T',
        votosPart1: 10,
        votosPart2: 4,
        votosPart3: 6,
        votosPart10: 8,
        votacionTotal: 28,
      },
      {
        rowid: 10,
        idDistrito: 0,
        idDelegacion: 80,
        idTipoEleccion: TipoEleccion.ALCALDIA,
        tipoCasilla: 'M01',
        validado: 'T',
        contabilizar: 'T',
        votosPart1: 1,
        votosPart10: 2,
        votacionTotal: 3,
      },
      // Distrito 90 de diputaciones: acta MR con candidatura común
      // `votos_part_14` (porcentajes de convenio) y acta RP del mismo
      // distrito, que la vista por partido también suma (2024: tipo IN (2,3)).
      {
        rowid: 11,
        idDistrito: 90,
        idTipoEleccion: TipoEleccion.DIPUTACION_MR,
        tipoCasilla: 'B01',
        validado: 'T',
        contabilizar: 'T',
        votosPart14: 100,
        votacionTotal: 100,
      },
      {
        rowid: 12,
        idDistrito: 90,
        idTipoEleccion: TipoEleccion.REPRESENTACION_PROPORCIONAL,
        tipoCasilla: 'B01',
        validado: 'T',
        contabilizar: 'T',
        votosPart7: 5,
        votacionTotal: 5,
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

  it('should return validated contabilizar=T raw rows and a success flag instead of the legacy fixed error string', async () => {
    const result = await service.pruebaDistribucion(
      TipoEleccion.JEFATURA_GOBIERNO,
      50,
      0,
      null,
    );

    expect(result.success).toBe(true);
    expect(result.datosMSSQL.map((fila) => fila.votos_part_1)).toEqual([40, 5]);
  });

  it('should exclude non validated and non contabilizar raw rows when pruebaDistribucion filters a district', async () => {
    // Distrito 1 de JG: una fila sin validar y otra con contabilizar='F'.
    const { datosMSSQL } = await service.pruebaDistribucion(
      TipoEleccion.JEFATURA_GOBIERNO,
      1,
      0,
      null,
    );

    expect(datosMSSQL).toEqual([]);
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

  describe('votos por partido político (es_distribucion)', () => {
    const catalogoDistribucion = {
      partidos: [1, 2, 3].map((idParticipante) => ({
        idParticipante,
        descripcion: `Partido ${idParticipante}`,
        siglas: `P${idParticipante}`,
        campoVotos: `votos_part_${idParticipante}`,
      })),
      combinaciones: [{ campoVotos: 'votos_part_10', integrantes: [1, 2, 3] }],
    };

    beforeEach(() => {
      jest
        .spyOn(catalogo, 'getCatalogoDistribucion')
        .mockResolvedValue(catalogoDistribucion);
    });

    it('should return one row per party with combination votes split when grafica has es_distribucion', async () => {
      const { agrupado } = await service.grafica(
        TipoEleccion.ALCALDIA,
        80,
        0,
        null,
        true,
      );

      // Totales: P1=11, P2=4, P3=6, combinación=10 → 3 c/u + residuo 1 a P1.
      expect(
        agrupado.map(({ siglas, total_votos, ganador }) => [
          siglas,
          total_votos,
          ganador,
        ]),
      ).toEqual([
        ['P1', 15, true],
        ['P2', 7, false],
        ['P3', 9, false],
        ['no_registrados', 0, false],
        ['votos_nulos', 0, false],
      ]);
    });

    it('should compute territorio as total minus extranjero when pruebaDistribucion has es_distribucion', async () => {
      const { agrupado, dataExtranjero } = await service.pruebaDistribucion(
        TipoEleccion.ALCALDIA,
        80,
        0,
        null,
        true,
      );

      // Extranjero: P1=1, combinación=2 → 0 c/u + residuo 2 a P1 y P2 (empate P2/P3 → P2).
      // Territorio = total (15, 7, 9) − extranjero (2, 1, 0).
      expect(dataExtranjero.slice(0, 3).map((f) => f.total_votos)).toEqual([
        2, 1, 0,
      ]);
      expect(agrupado.slice(0, 3).map((f) => f.total_votos)).toEqual([
        13, 6, 9,
      ]);
    });

    it('should split candidatura común by agreement percentages and include RP actas when diputaciones has es_distribucion', async () => {
      jest.spyOn(catalogo, 'getCatalogoDistribucion').mockResolvedValueOnce({
        partidos: [4, 5, 7].map((idParticipante) => ({
          idParticipante,
          descripcion: `Partido ${idParticipante}`,
          siglas: `P${idParticipante}`,
          campoVotos: `votos_part_${idParticipante}`,
        })),
        combinaciones: [
          {
            campoVotos: 'votos_part_14',
            integrantes: [4, 5, 7],
            porcentajes: [26.67, 20, 53.33],
          },
        ],
      });

      const { agrupado } = await service.grafica(
        TipoEleccion.DIPUTACION_MR,
        90,
        0,
        null,
        true,
      );

      // 100 → 26 / 20 / 53 + residuo 1 a P7; P7 suma además 5 del acta RP.
      expect(
        agrupado.slice(0, 3).map((f) => [f.siglas, f.total_votos]),
      ).toEqual([
        ['P4', 26],
        ['P5', 20],
        ['P7', 59],
      ]);
    });
  });
});
