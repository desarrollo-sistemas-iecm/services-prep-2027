import { DataSource } from 'typeorm';
import { createTestDataSource } from './helpers/test-data-source';
import { MapasService } from '../services/mapas.service';
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

jest.mock('../utils/acta-validada.util', () => ({
  SOLO_ACTAS_VALIDADAS: true,
  condicionActaValidada: (columna: string) => `${columna} = 'T'`,
}));

/**
 * Distrito 1 lo gana PAN-PRI-PRD, distrito 2 MC y el distrito 3 tiene acta
 * sin votos, así que no tiene ganador.
 */
describe('MapasService', () => {
  let dataSource: DataSource;
  let service: MapasService;

  const acta = (
    rowid: number,
    idDistrito: number,
    totalVotosCc1: number,
    votosPart6: number,
  ) => ({
    rowid,
    idDistrito,
    idTipoEleccion: TipoEleccion.DIPUTACION_MR,
    tipoCasilla: 'B01',
    validado: 'T',
    contabilizar: 'T',
    totalVotosCc1,
    votosPart6,
  });

  beforeAll(async () => {
    dataSource = await createTestDataSource();

    await dataSource.getRepository(ScdCatParticipantesEntity).save([
      { rowid: 6, idParticipante: 6, siglas: 'MC', descripcion: 'MC' },
      {
        rowid: 10,
        idParticipante: 10,
        siglas: 'PAN-PRI-PRD',
        descripcion: 'PAN-PRI-PRD',
      },
    ]);

    await dataSource.getRepository(ScdCandidatosMrEntity).save(
      [1, 2, 3].flatMap((idDistrito) => [
        {
          rowid: idDistrito * 10 + 1,
          idDistrito,
          idParticipante: 10,
          prelacion: 1,
          integrantes: '',
          campoVotos: 'total_votos_cc1',
        },
        {
          rowid: idDistrito * 10 + 2,
          idDistrito,
          idParticipante: 6,
          prelacion: 2,
          integrantes: '',
          campoVotos: 'votos_part_6',
        },
      ]),
    );

    await dataSource
      .getRepository(PrepVotosEntity)
      .save([acta(1, 1, 500, 200), acta(2, 2, 100, 300), acta(3, 3, 0, 0)]);

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
    service = new MapasService(
      dataSource.getRepository(PrepVotosEntity),
      catalogo,
    );
  });

  afterAll(async () => {
    await dataSource.destroy();
  });

  it('should return the winner siglas of each demarcation when computing the map', async () => {
    const { data } = await service.obtener(TipoEleccion.DIPUTACION_MR);

    expect(
      data.result_votos.map(({ id_distrito, siglas_ganador }) => ({
        id_distrito,
        siglas_ganador,
      })),
    ).toEqual([
      { id_distrito: 1, siglas_ganador: 'PAN-PRI-PRD' },
      { id_distrito: 2, siglas_ganador: 'MC' },
      { id_distrito: 3, siglas_ganador: null },
    ]);
  });

  it('should not count a demarcation without votes when totaling demarcaciones', async () => {
    const { data } = await service.obtener(TipoEleccion.DIPUTACION_MR);

    expect(
      data.participantes.map(({ siglas, total_demarcaciones }) => ({
        siglas,
        total_demarcaciones,
      })),
    ).toEqual([
      { siglas: 'PAN-PRI-PRD', total_demarcaciones: 1 },
      { siglas: 'MC', total_demarcaciones: 1 },
    ]);
  });
});
