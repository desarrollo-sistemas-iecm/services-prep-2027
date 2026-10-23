import { DataSource } from 'typeorm';
import { createTestDataSource } from './helpers/test-data-source';
import { ActasModalidadService } from '../services/actas-modalidad.service';
import { ActasGridService } from '../services/actas-grid.service';
import { TipoEleccionCatalogoService } from '../services/tipo-eleccion-catalogo.service';
import { PrepVotosEntity } from '../../resultados-legacy/entities/prep-votos.entity';
import { ScdCandidatosJgobEntity } from '../../resultados-legacy/entities/scd-candidatos-jgob.entity';
import { ScdCandidatosMrEntity } from '../../resultados-legacy/entities/scd-candidatos-mr.entity';
import { ScdCandidatosJdelEntity } from '../../resultados-legacy/entities/scd-candidatos-jdel.entity';
import { ScdParticipantesJgobEntity } from '../../resultados-legacy/entities/scd-participantes-jgob.entity';
import { ScdParticipantesMrEntity } from '../../resultados-legacy/entities/scd-participantes-mr.entity';
import { ScdParticipantesRpEntity } from '../../resultados-legacy/entities/scd-participantes-rp.entity';
import { ScdParticipantesJdelEntity } from '../../resultados-legacy/entities/scd-participantes-jdel.entity';
import { ScdCatParticipantesEntity } from '../../resultados-legacy/entities/scd-cat-participantes.entity';
import { TipoEleccion } from '../enums/tipo-eleccion.enum';

describe('ActasModalidadService', () => {
  let dataSource: DataSource;
  let service: ActasModalidadService;

  beforeAll(async () => {
    dataSource = await createTestDataSource();

    await dataSource.getRepository(ScdCatParticipantesEntity).save([
      { rowid: 1, idParticipante: 1, siglas: 'PAN', descripcion: 'PAN' },
      { rowid: 2, idParticipante: 2, siglas: 'PRI', descripcion: 'PRI' },
    ]);
    // Cada participante RP se repite por distrito, como en el catálogo real.
    await dataSource.getRepository(ScdParticipantesRpEntity).save([
      { rowid: 1, idDistrito: 5, idParticipante: 1, prelacion: 1 },
      { rowid: 2, idDistrito: 5, idParticipante: 2, prelacion: 2 },
      { rowid: 3, idDistrito: 26, idParticipante: 1, prelacion: 1 },
      { rowid: 4, idDistrito: 26, idParticipante: 2, prelacion: 2 },
    ]);
    await dataSource
      .getRepository(ScdParticipantesJgobEntity)
      .save([{ rowid: 1, idParticipante: 2, prelacion: 1 }]);
    await dataSource
      .getRepository(ScdCandidatosJgobEntity)
      .save([{ rowid: 1, idParticipante: 2, campoVotos: 'votos_part_2' }]);

    await dataSource.getRepository(PrepVotosEntity).save([
      {
        rowid: 1,
        idDistrito: 5,
        idSeccion: 342,
        tipoCasilla: 'S01',
        idTipoEleccion: TipoEleccion.REPRESENTACION_PROPORCIONAL,
        validado: 'T',
        contabilizar: 'T',
        votosPart1: 45,
        votosPart2: 12,
        votacionTotal: 57,
      },
      {
        rowid: 2,
        idDistrito: 26,
        idSeccion: 486,
        tipoCasilla: 'S01',
        idTipoEleccion: TipoEleccion.REPRESENTACION_PROPORCIONAL,
        validado: 'F',
        contabilizar: 'F',
        votosPart1: 30,
        votacionTotal: 30,
      },
      {
        rowid: 3,
        idDistrito: 0,
        idSeccion: 0,
        tipoCasilla: 'M01',
        idTipoEleccion: TipoEleccion.JEFATURA_GOBIERNO,
        validado: 'T',
        contabilizar: 'T',
        votosPart2: 9,
        votacionTotal: 9,
      },
      {
        rowid: 4,
        idDistrito: 0,
        idSeccion: 0,
        tipoCasilla: 'M01',
        idTipoEleccion: TipoEleccion.REPRESENTACION_PROPORCIONAL,
        validado: 'T',
        contabilizar: 'T',
        votosPart1: 3,
        votacionTotal: 3,
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
    service = new ActasModalidadService(
      catalogo,
      new ActasGridService(dataSource.getRepository(PrepVotosEntity)),
    );
  });

  afterAll(async () => {
    await dataSource.destroy();
  });

  it('should return RP actas from every distrito when seleccion is omitted', async () => {
    const { itemRecords } = await service.rp();

    expect(itemRecords.data.map(({ id_distrito }) => id_distrito)).toEqual([
      5, 26,
    ]);
  });

  it('should return only the RP actas of the distrito when seleccion is provided', async () => {
    const { itemRecords } = await service.rp(26);

    expect(itemRecords.data).toHaveLength(1);
    expect(itemRecords.data[0]).toMatchObject({ id_distrito: 26 });
  });

  it('should build RP vote columns from scd_participantes_rp without repeating participants per distrito', async () => {
    const { itemRecords } = await service.rp();

    expect(itemRecords.value_fields.map((p) => p.siglas)).toEqual([
      'PAN',
      'PRI',
    ]);
    expect(
      itemRecords.columns
        .filter((columna) => columna.dataIndex.startsWith('votos_part_'))
        .map(({ dataIndex, title }) => ({ dataIndex, title })),
    ).toEqual([
      { dataIndex: 'votos_part_1', title: 'PAN' },
      { dataIndex: 'votos_part_2', title: 'PRI' },
    ]);
  });

  it('should return only M actas of the requested type when asking for voto en el extranjero', async () => {
    const { itemRecords } = await service.extranjero(
      TipoEleccion.JEFATURA_GOBIERNO,
    );

    expect(itemRecords.data).toHaveLength(1);
    expect(itemRecords.data[0]).toMatchObject({
      tipo_casilla: 'M01',
      votos_part_2: 9,
    });
    expect(itemRecords.columns.map((columna) => columna.title)).toContain(
      'PRI',
    );
  });

  it('should use RP participant columns when asking for voto en el extranjero of RP', async () => {
    const { itemRecords } = await service.extranjero(
      TipoEleccion.REPRESENTACION_PROPORCIONAL,
    );

    expect(itemRecords.data).toHaveLength(1);
    expect(itemRecords.data[0]).toMatchObject({
      tipo_casilla: 'M01',
      votos_part_1: 3,
    });
  });

  it('should return empty data when the type has no voto en el extranjero actas', async () => {
    const { itemRecords } = await service.extranjero(TipoEleccion.ALCALDIA);

    expect(itemRecords.data).toEqual([]);
    expect(itemRecords.resumen.total).toBe(0);
  });
});
