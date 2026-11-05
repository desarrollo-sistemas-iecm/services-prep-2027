import { DataSource } from 'typeorm';
import { createTestDataSource } from './helpers/test-data-source';
import { ActasGridService } from '../services/actas-grid.service';
import { PrepVotosEntity } from '../../resultados-legacy/entities/prep-votos.entity';
import { DigActasPrepEntity } from '../../resultados-legacy/entities/dig-actas-prep.entity';
import { TipoEleccion } from '../enums/tipo-eleccion.enum';

// Fija el comportamiento con SOLO_ACTAS_VALIDADAS activo sin depender del valor
// con el que se publique la bandera.
jest.mock('../utils/acta-validada.util', () => ({
  SOLO_ACTAS_VALIDADAS: true,
  condicionActaValidada: (columna: string) => `${columna} = 'T'`,
}));

describe('ActasGridService', () => {
  let dataSource: DataSource;
  let service: ActasGridService;

  const columnasVotos = [
    { columna: 'votos_part_1', titulo: 'PAN' },
    { columna: 'votos_part_2', titulo: 'PRI' },
  ];

  beforeAll(async () => {
    dataSource = await createTestDataSource();

    await dataSource.getRepository(PrepVotosEntity).save([
      // Especial validada y contabilizada, con imagen digitalizada.
      {
        rowid: 1,
        idDistrito: 5,
        idDelegacion: 2,
        idSeccion: 342,
        tipoCasilla: 'S01',
        claveMdc: 'S-342-01',
        idTipoEleccion: TipoEleccion.REPRESENTACION_PROPORCIONAL,
        validado: 'T',
        contabilizar: 'T',
        votosPart1: 45,
        votosPart2: 12,
        votosCandNoReg: 1,
        votosNulos: 4,
        votacionTotal: 62,
      },
      // Especial validada pero no contabilizada, con inconsistencia.
      {
        rowid: 2,
        idDistrito: 26,
        idDelegacion: 3,
        idSeccion: 486,
        tipoCasilla: 'S01',
        claveMdc: 'S-486-01',
        idTipoEleccion: TipoEleccion.REPRESENTACION_PROPORCIONAL,
        validado: 'T',
        contabilizar: 'F',
        votosPart1: 30,
        votacionTotal: 30,
        inconsistencia: 4,
      },
      // Básica RP: no debe colarse al filtrar por prefijo S.
      {
        rowid: 3,
        idDistrito: 5,
        idDelegacion: 2,
        idSeccion: 342,
        tipoCasilla: 'B01',
        idTipoEleccion: TipoEleccion.REPRESENTACION_PROPORCIONAL,
        validado: 'T',
        contabilizar: 'T',
        votacionTotal: 99,
      },
      // Voto en el extranjero de JG.
      {
        rowid: 4,
        idDistrito: 0,
        idDelegacion: 0,
        idSeccion: 0,
        tipoCasilla: 'M01',
        idTipoEleccion: TipoEleccion.JEFATURA_GOBIERNO,
        validado: 'T',
        contabilizar: 'T',
        votosPart1: 7,
        votacionTotal: 7,
      },
      // Especial no validada: queda fuera mientras SOLO_ACTAS_VALIDADAS sea true.
      {
        rowid: 5,
        idDistrito: 26,
        idDelegacion: 3,
        idSeccion: 999,
        tipoCasilla: 'S01',
        idTipoEleccion: TipoEleccion.REPRESENTACION_PROPORCIONAL,
        validado: 'F',
        contabilizar: 'T',
        votacionTotal: 50,
      },
    ]);

    await dataSource
      .getRepository(DigActasPrepEntity)
      .save([
        { rowid: 1, idDistrito: 5, acta: 'S-342-01', imgNombreRp: 'rp.jpg' },
      ]);

    service = new ActasGridService(dataSource.getRepository(PrepVotosEntity));
  });

  afterAll(async () => {
    await dataSource.destroy();
  });

  it('should exclude non validated actas when SOLO_ACTAS_VALIDADAS is true', async () => {
    const { itemRecords } = await service.obtener({
      type: TipoEleccion.REPRESENTACION_PROPORCIONAL,
      columnasVotos,
      participantes: [],
      filtros: { prefijoTipoCasilla: 'S' },
      idGeoValueFields: null,
    });

    expect(itemRecords.data.map(({ id_seccion }) => id_seccion)).toEqual([
      342, 486,
    ]);
  });

  it('should not return básica casillas when filtering by prefix S', async () => {
    const { itemRecords } = await service.obtener({
      type: TipoEleccion.REPRESENTACION_PROPORCIONAL,
      columnasVotos,
      participantes: [],
      filtros: { prefijoTipoCasilla: 'S' },
      idGeoValueFields: null,
    });

    expect(
      itemRecords.data.every((fila) =>
        String(fila.tipo_casilla).startsWith('S'),
      ),
    ).toBe(true);
  });

  it('should filter by distrito when geo is provided', async () => {
    const { itemRecords } = await service.obtener({
      type: TipoEleccion.REPRESENTACION_PROPORCIONAL,
      columnasVotos,
      participantes: [],
      filtros: {
        prefijoTipoCasilla: 'S',
        geo: { columna: 'id_distrito', valor: 26 },
      },
      idGeoValueFields: 26,
    });

    expect(itemRecords.data).toHaveLength(1);
    expect(itemRecords.data[0]).toMatchObject({
      id_distrito: 26,
      observaciones: 'SIN ACTA',
    });
  });

  it('should only add contabilizar=T actas to resumen', async () => {
    const { itemRecords } = await service.obtener({
      type: TipoEleccion.REPRESENTACION_PROPORCIONAL,
      columnasVotos,
      participantes: [],
      filtros: { prefijoTipoCasilla: 'S' },
      idGeoValueFields: null,
    });

    expect(itemRecords.resumen).toMatchObject({
      total: 62,
      candidatos_no_reg: 1,
      nulos: 4,
      votos_acumulados: 57,
    });
  });

  it('should expose vote columns with their titles and the digitalized image name', async () => {
    const { itemRecords } = await service.obtener({
      type: TipoEleccion.REPRESENTACION_PROPORCIONAL,
      columnasVotos,
      participantes: [],
      filtros: {
        prefijoTipoCasilla: 'S',
        geo: { columna: 'id_distrito', valor: 5 },
      },
      idGeoValueFields: 5,
    });

    expect(
      itemRecords.columns
        .filter((columna) => columna.dataIndex.startsWith('votos_part_'))
        .map(({ dataIndex, title }) => ({ dataIndex, title })),
    ).toEqual([
      { dataIndex: 'votos_part_1', title: 'PAN' },
      { dataIndex: 'votos_part_2', title: 'PRI' },
    ]);
    expect(itemRecords.data[0]).toMatchObject({
      votos_part_1: 45,
      votos_part_2: 12,
      nombre_img: 'rp.jpg',
    });
  });

  it('should return voto en el extranjero actas only for the requested type when filtering by prefix M', async () => {
    const { itemRecords } = await service.obtener({
      type: TipoEleccion.JEFATURA_GOBIERNO,
      columnasVotos,
      participantes: [],
      filtros: { prefijoTipoCasilla: 'M' },
      idGeoValueFields: null,
    });

    expect(itemRecords.data).toHaveLength(1);
    expect(itemRecords.data[0]).toMatchObject({
      tipo_casilla: 'M01',
      votos_part_1: 7,
    });
  });

  it('should return empty data and zeroed resumen when no acta matches', async () => {
    const { itemRecords } = await service.obtener({
      type: TipoEleccion.ALCALDIA,
      columnasVotos,
      participantes: [],
      filtros: { prefijoTipoCasilla: 'M' },
      idGeoValueFields: null,
    });

    expect(itemRecords.data).toEqual([]);
    expect(itemRecords.resumen).toMatchObject({
      total: 0,
      total_por: '0.00%',
    });
  });

  it('should reject a vote column outside the allowlist', async () => {
    await expect(
      service.obtener({
        type: TipoEleccion.REPRESENTACION_PROPORCIONAL,
        columnasVotos: [{ columna: 'votos_part_1; DROP', titulo: 'X' }],
        participantes: [],
        filtros: { prefijoTipoCasilla: 'S' },
        idGeoValueFields: null,
      }),
    ).rejects.toThrow('Nombre de columna de votos no reconocido');
  });
});
