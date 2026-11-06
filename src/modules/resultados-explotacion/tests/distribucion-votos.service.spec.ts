import { DataSource } from 'typeorm';
import { createTestDataSource } from './helpers/test-data-source';
import { DistribucionVotosService } from '../services/distribucion-votos.service';
import { GraficaService } from '../services/grafica.service';
import { TipoEleccionCatalogoService } from '../services/tipo-eleccion-catalogo.service';
import { TipoEleccion } from '../enums/tipo-eleccion.enum';
import { PrepVotosEntity } from '../../resultados-legacy/entities/prep-votos.entity';
import { ScdCandidatosJgobEntity } from '../../resultados-legacy/entities/scd-candidatos-jgob.entity';
import { ScdCandidatosMrEntity } from '../../resultados-legacy/entities/scd-candidatos-mr.entity';
import { ScdCandidatosJdelEntity } from '../../resultados-legacy/entities/scd-candidatos-jdel.entity';
import { ScdParticipantesJgobEntity } from '../../resultados-legacy/entities/scd-participantes-jgob.entity';
import { ScdParticipantesMrEntity } from '../../resultados-legacy/entities/scd-participantes-mr.entity';
import { ScdParticipantesRpEntity } from '../../resultados-legacy/entities/scd-participantes-rp.entity';
import { ScdParticipantesJdelEntity } from '../../resultados-legacy/entities/scd-participantes-jdel.entity';
import { ScdCatParticipantesEntity } from '../../resultados-legacy/entities/scd-cat-participantes.entity';

// Fija el comportamiento con SOLO_ACTAS_VALIDADAS activo sin depender del valor
// con el que se publique la bandera.
jest.mock('../utils/acta-validada.util', () => ({
  SOLO_ACTAS_VALIDADAS: true,
  condicionActaValidada: (columna: string) => `${columna} = 'T'`,
}));

/**
 * Distrito 1 de diputaciones con los votos del PREP 2024 en producción; las
 * cifras esperadas son las que publicaba la versión 2024 en "Distribución de
 * votos por Candidatura" y "por Partido Político".
 */
describe('DistribucionVotosService', () => {
  let dataSource: DataSource;
  let service: DistribucionVotosService;

  const siglasParticipantes: [number, string][] = [
    [1, 'PAN'],
    [2, 'PRI'],
    [3, 'PRD'],
    [4, 'PVEM'],
    [5, 'PT'],
    [6, 'MC'],
    [7, 'MORENA'],
    [10, 'PAN-PRI-PRD'],
    [11, 'PAN-PRI'],
    [12, 'PAN-PRD'],
    [13, 'PRI-PRD'],
    [14, 'PVEM-PT-MORENA'],
    [15, 'PVEM-PT'],
    [16, 'PVEM-MORENA'],
    [17, 'PT-MORENA'],
  ];

  beforeAll(async () => {
    dataSource = await createTestDataSource();

    await dataSource.getRepository(ScdCatParticipantesEntity).save(
      siglasParticipantes.map(([idParticipante, siglas]) => ({
        rowid: idParticipante,
        idParticipante,
        siglas,
        descripcion: `Participante ${siglas}`,
      })),
    );

    await dataSource.getRepository(ScdCandidatosMrEntity).save([
      {
        rowid: 1,
        idDistrito: 1,
        idParticipante: 10,
        prelacion: 1,
        integrantes: '1&2&3&10&11&12&13',
        campoVotos: 'total_votos_cc1',
      },
      {
        rowid: 2,
        idDistrito: 1,
        idParticipante: 14,
        prelacion: 2,
        integrantes: '4&5&7&14&15&16&17',
        campoVotos: 'total_votos_cc5',
      },
      {
        rowid: 3,
        idDistrito: 1,
        idParticipante: 6,
        prelacion: 3,
        integrantes: '',
        campoVotos: 'votos_part_6',
      },
    ]);

    const participantes: [number, string, string][] = [
      [1, '', ''],
      [2, '', ''],
      [3, '', ''],
      [4, '', ''],
      [5, '', ''],
      [6, '', ''],
      [7, '', ''],
      [10, '1&2&3', '33.3333333&33.3333333&33.3333333'],
      [11, '1&2', ''],
      [12, '1&3', ''],
      [13, '2&3', ''],
      [14, '4&5&7', '26.67&20&53.33'],
    ];
    await dataSource.getRepository(ScdParticipantesMrEntity).save(
      participantes.map(
        ([idParticipante, integrantesPartidosCC, porcentaje]) => ({
          rowid: idParticipante,
          idDistrito: 1,
          idParticipante,
          integrantesPartidosCC,
          porcentaje,
        }),
      ),
    );

    await dataSource.getRepository(PrepVotosEntity).save([
      {
        rowid: 1,
        idDistrito: 1,
        idTipoEleccion: TipoEleccion.DIPUTACION_MR,
        tipoCasilla: 'B01',
        validado: 'T',
        contabilizar: 'T',
        votosPart1: 14205,
        votosPart2: 7853,
        votosPart3: 3823,
        votosPart6: 15463,
        votosPart10: 1700,
        votosPart11: 363,
        votosPart12: 76,
        votosPart13: 84,
        votosPart14: 101281,
        totalVotosCc1: 28104,
        totalVotosCc5: 101281,
        votacionTotal: 150009,
      },
      // Acta RP (casilla especial) del mismo distrito: solo cuenta en la vista por partido.
      {
        rowid: 2,
        idDistrito: 1,
        idTipoEleccion: TipoEleccion.REPRESENTACION_PROPORCIONAL,
        tipoCasilla: 'S01',
        validado: 'T',
        contabilizar: 'T',
        votosPart1: 30,
        votosPart2: 20,
        votosPart3: 2,
        votosPart4: 5,
        votosPart5: 5,
        votosPart6: 24,
        votosPart7: 104,
        votacionTotal: 190,
      },
    ]);

    const catalogo = new TipoEleccionCatalogoService(
      dataSource.getRepository(ScdCandidatosJgobEntity),
      dataSource.getRepository(ScdCandidatosMrEntity),
      dataSource.getRepository(ScdCandidatosJdelEntity),
      dataSource.getRepository(ScdParticipantesJgobEntity),
      dataSource.getRepository(ScdParticipantesMrEntity),
      dataSource.getRepository(ScdParticipantesRpEntity),
      dataSource.getRepository(ScdParticipantesJdelEntity),
      dataSource.getRepository(ScdCatParticipantesEntity),
    );
    service = new DistribucionVotosService(
      catalogo,
      new GraficaService(dataSource.getRepository(PrepVotosEntity), catalogo),
    );
  });

  afterAll(async () => {
    await dataSource.destroy();
  });

  it('should break down each candidatura by member with SIREC names when the district has votes', async () => {
    const { candidaturas } = await service.obtener(
      TipoEleccion.DIPUTACION_MR,
      1,
      0,
      null,
    );

    expect(candidaturas).toEqual([
      {
        nombre: 'MARIA DEL CARMEN PACHECO GAMIÑO',
        siglas: 'PAN-PRI-PRD',
        aportes: [
          { siglas: 'PAN', votos: 14205 },
          { siglas: 'PRI', votos: 7853 },
          { siglas: 'PRD', votos: 3823 },
          { siglas: 'PAN-PRI-PRD', votos: 1700 },
          { siglas: 'PAN-PRI', votos: 363 },
          { siglas: 'PAN-PRD', votos: 76 },
          { siglas: 'PRI-PRD', votos: 84 },
        ],
        total: 28104,
      },
      {
        nombre: 'ALBERTO MARTINEZ URINCHO',
        siglas: 'PVEM-PT-MORENA',
        aportes: [{ siglas: 'PVEM-PT-MORENA', votos: 101281 }],
        total: 101281,
      },
      {
        nombre: 'ELDA ROSA DUARTE USCANGA',
        siglas: 'MC',
        aportes: [{ siglas: 'MC', votos: 15463 }],
        total: 15463,
      },
    ]);
  });

  it('should add each coalition share to the party votes including RP actas when computing by partido', async () => {
    const { partidos } = await service.obtener(
      TipoEleccion.DIPUTACION_MR,
      1,
      0,
      null,
    );

    expect(partidos).toEqual([
      {
        siglas: 'PAN',
        individual: 14235,
        coalicion: [
          { siglas: 'PAN-PRI-PRD', votos: 567 },
          { siglas: 'PAN-PRI', votos: 182 },
          { siglas: 'PAN-PRD', votos: 38 },
        ],
        total: 15022,
      },
      {
        siglas: 'PRI',
        individual: 7873,
        coalicion: [
          { siglas: 'PAN-PRI-PRD', votos: 567 },
          { siglas: 'PAN-PRI', votos: 181 },
          { siglas: 'PRI-PRD', votos: 42 },
        ],
        total: 8663,
      },
      {
        siglas: 'PRD',
        individual: 3825,
        coalicion: [
          { siglas: 'PAN-PRI-PRD', votos: 566 },
          { siglas: 'PAN-PRD', votos: 38 },
          { siglas: 'PRI-PRD', votos: 42 },
        ],
        total: 4471,
      },
      {
        siglas: 'PVEM',
        individual: 5,
        coalicion: [{ siglas: 'PVEM-PT-MORENA', votos: 27011 }],
        total: 27016,
      },
      {
        siglas: 'PT',
        individual: 5,
        coalicion: [{ siglas: 'PVEM-PT-MORENA', votos: 20256 }],
        total: 20261,
      },
      { siglas: 'MC', individual: 15487, coalicion: [], total: 15487 },
      {
        siglas: 'MORENA',
        individual: 104,
        coalicion: [{ siglas: 'PVEM-PT-MORENA', votos: 54014 }],
        total: 54118,
      },
    ]);
  });

  it('should keep every member with zero votes when the district has no actas yet', async () => {
    const { candidaturas } = await service.obtener(
      TipoEleccion.DIPUTACION_MR,
      1,
      9999,
      null,
    );

    expect(candidaturas[1].aportes.map(({ siglas }) => siglas)).toEqual([
      'PVEM',
      'PT',
      'MORENA',
      'PVEM-PT-MORENA',
      'PVEM-PT',
      'PVEM-MORENA',
      'PT-MORENA',
    ]);
    expect(candidaturas[1].total).toBe(0);
  });

  it('should return empty lists when diputaciones is requested without a district', async () => {
    const respuesta = await service.obtener(
      TipoEleccion.DIPUTACION_MR,
      0,
      0,
      null,
    );

    expect(respuesta).toEqual({ candidaturas: [], partidos: [] });
  });

  it('should return empty lists when the election is representación proporcional', async () => {
    const respuesta = await service.obtener(
      TipoEleccion.REPRESENTACION_PROPORCIONAL,
      1,
      0,
      null,
    );

    expect(respuesta).toEqual({ candidaturas: [], partidos: [] });
  });
});
