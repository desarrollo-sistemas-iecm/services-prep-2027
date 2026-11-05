import { DataSource } from 'typeorm';
import { createTestDataSource } from './helpers/test-data-source';
import { TipoEleccionCatalogoService } from '../services/tipo-eleccion-catalogo.service';
import { ScdCandidatosJgobEntity } from '../../resultados-legacy/entities/scd-candidatos-jgob.entity';
import { ScdCandidatosMrEntity } from '../../resultados-legacy/entities/scd-candidatos-mr.entity';
import { ScdCandidatosJdelEntity } from '../../resultados-legacy/entities/scd-candidatos-jdel.entity';
import { ScdParticipantesJgobEntity } from '../../resultados-legacy/entities/scd-participantes-jgob.entity';
import { ScdParticipantesMrEntity } from '../../resultados-legacy/entities/scd-participantes-mr.entity';
import { ScdParticipantesRpEntity } from '../../resultados-legacy/entities/scd-participantes-rp.entity';
import { ScdParticipantesJdelEntity } from '../../resultados-legacy/entities/scd-participantes-jdel.entity';
import { ScdCatParticipantesEntity } from '../../resultados-legacy/entities/scd-cat-participantes.entity';
import { TipoEleccion } from '../enums/tipo-eleccion.enum';

describe('TipoEleccionCatalogoService (candidaturas por demarcación)', () => {
  let dataSource: DataSource;
  let service: TipoEleccionCatalogoService;

  beforeAll(async () => {
    dataSource = await createTestDataSource();

    await dataSource.getRepository(ScdCatParticipantesEntity).save([
      { rowid: 1, idParticipante: 1, siglas: 'PAN', descripcion: 'PAN' },
      { rowid: 6, idParticipante: 6, siglas: 'MC', descripcion: 'MC' },
      {
        rowid: 10,
        idParticipante: 10,
        siglas: 'PAN-PRI-PRD',
        descripcion: 'Coalición',
      },
    ]);
    // Distrito 1: PAN va en coalición; distrito 12: PAN compite solo.
    await dataSource.getRepository(ScdCandidatosMrEntity).save([
      {
        rowid: 1,
        idDistrito: 1,
        idParticipante: 6,
        campoVotos: 'votos_part_6',
      },
      {
        rowid: 2,
        idDistrito: 1,
        idParticipante: 10,
        campoVotos: 'total_votos_cc1',
      },
      {
        rowid: 3,
        idDistrito: 12,
        idParticipante: 6,
        campoVotos: 'votos_part_6',
      },
      {
        rowid: 4,
        idDistrito: 12,
        idParticipante: 1,
        campoVotos: 'votos_part_1',
      },
    ]);
    await dataSource.getRepository(ScdCandidatosJdelEntity).save([
      {
        rowid: 1,
        idDelegacion: 3,
        idParticipante: 6,
        campoVotos: 'votos_part_6',
      },
      {
        rowid: 2,
        idDelegacion: 11,
        idParticipante: 1,
        campoVotos: 'votos_part_1',
      },
    ]);

    service = new TipoEleccionCatalogoService(
      dataSource.getRepository(ScdCandidatosJgobEntity),
      dataSource.getRepository(ScdCandidatosMrEntity),
      dataSource.getRepository(ScdCandidatosJdelEntity),
      dataSource.getRepository(ScdParticipantesJgobEntity),
      dataSource.getRepository(ScdParticipantesMrEntity),
      dataSource.getRepository(ScdParticipantesRpEntity),
      dataSource.getRepository(ScdParticipantesJdelEntity),
      dataSource.getRepository(ScdCatParticipantesEntity),
    );
  });

  afterAll(async () => {
    await dataSource.destroy();
  });

  const siglasOrdenadas = (candidatos: { siglas: string | null }[]) =>
    candidatos.map(({ siglas }) => siglas).sort();

  it('should return the candidaturas of every district when no district is selected', async () => {
    const candidatos = await service.getCandidatos(TipoEleccion.DIPUTACION_MR);

    expect(siglasOrdenadas(candidatos)).toEqual(['MC', 'PAN', 'PAN-PRI-PRD']);
  });

  it('should return only the district candidaturas when diputación MR receives a district', async () => {
    const candidatos = await service.getCandidatos(
      TipoEleccion.DIPUTACION_MR,
      1,
    );

    expect(siglasOrdenadas(candidatos)).toEqual(['MC', 'PAN-PRI-PRD']);
  });

  it('should return only the alcaldía candidaturas when alcaldía receives a delegación', async () => {
    const candidatos = await service.getCandidatos(TipoEleccion.ALCALDIA, 3);

    expect(siglasOrdenadas(candidatos)).toEqual(['MC']);
  });

  it('should map each vote column to the districts where it is a candidatura when type is diputación MR', async () => {
    const ambito = await service.getAmbitoColumnas(TipoEleccion.DIPUTACION_MR);

    expect(ambito?.get('votos_part_6')?.sort((a, b) => a - b)).toEqual([1, 12]);
    expect(ambito?.get('total_votos_cc1')).toEqual([1]);
    expect(ambito?.get('votos_part_1')).toEqual([12]);
  });

  it('should return no column scope when type is jefatura de gobierno', async () => {
    const ambito = await service.getAmbitoColumnas(
      TipoEleccion.JEFATURA_GOBIERNO,
    );

    expect(ambito).toBeNull();
  });
});
