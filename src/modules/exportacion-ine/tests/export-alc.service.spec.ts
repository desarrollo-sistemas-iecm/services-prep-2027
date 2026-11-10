import { DataSource } from 'typeorm';
import AdmZip from 'adm-zip';
import * as iconv from 'iconv-lite';
import { ConfigService } from '@nestjs/config';
import { ExportAlcService } from '../services/export-alc.service';
import { createTestDataSource } from '../../resultados-explotacion/tests/helpers/test-data-source';
import { ScdCasillasEntity } from '../../resultados-legacy/entities/scd-casillas.entity';
import { PrepVotosEntity } from '../../resultados-legacy/entities/prep-votos.entity';
import { CainCatDelegacionEntity } from '../../resultados-legacy/entities/cain-cat-delegacion.entity';
import { CorteLegacyEntity } from '../../resultados-legacy/entities/corte-legacy.entity';

describe('ExportAlcService', () => {
  let dataSource: DataSource;
  let configService: { get: jest.Mock };
  let service: ExportAlcService;

  const corte = (): CorteLegacyEntity => ({
    id: 1,
    corteFecha: null,
    corteHora: null,
    dia: '10',
    mes: '09',
    anio: 2026,
    hora: '15',
    minuto: '30',
    segundo: '00',
  });

  beforeEach(async () => {
    dataSource = await createTestDataSource();
    configService = { get: jest.fn().mockReturnValue(0) };
    service = new ExportAlcService(
      dataSource,
      configService as unknown as ConfigService,
    );
  });

  afterEach(async () => {
    await dataSource.destroy();
  });

  it('should resolve ALCALDIA via cain_cat_delegacion + normalizarAlcaldia, matching the legacy CASE byte-for-byte', async () => {
    await dataSource.getRepository(CainCatDelegacionEntity).save({
      idDelegacion: 5,
      distritoCab: 1,
      nombreDelegacion: 'Gustavo A. Madero',
      estatus: 1,
    });
    await dataSource.getRepository(ScdCasillasEntity).save({
      idDistrito: 1,
      idDelegacion: 5,
      idSeccion: 20,
      tipoCasilla: 'B1',
      claveMdc: 'CLV1',
      listaNominal: 300,
    });
    await dataSource.getRepository(PrepVotosEntity).save({
      idDistrito: 1,
      idDelegacion: 5,
      idSeccion: 20,
      tipoCasilla: 'B1',
      claveMdc: 'CLV1',
      idTipoEleccion: 4,
      inconsistencia: null,
      exedeLn: 'F',
      contabilizar: 'T',
      votacionTotal: 50,
    });

    const { filename, zipBuffer } = await service.generar(
      '20260910_1530',
      corte(),
    );

    expect(filename).toBe('20260910_1530_PREP_ALC_CDMX.zip');
    const zip = new AdmZip(zipBuffer);
    expect(
      zip
        .getEntries()
        .map((entrada) => entrada.entryName)
        .sort(),
    ).toEqual([
      'CDMX_ALC_2024.csv',
      'CDMX_ALC_CANDIDATURAS_2024.csv',
      'leeme.txt',
    ]);

    const csvTexto = iconv.decode(zip.readFile('CDMX_ALC_2024.csv')!, 'latin1');
    expect(csvTexto).toContain('GUSTAVO A MADERO');
    expect(csvTexto).not.toContain('Gustavo A. Madero');
  });

  it('should resolve ALCALDIA to N/A when there is no matching cain_cat_delegacion row', async () => {
    await dataSource.getRepository(ScdCasillasEntity).save({
      idDistrito: 1,
      idDelegacion: 99,
      idSeccion: 21,
      tipoCasilla: 'B1',
      claveMdc: 'CLV2',
      listaNominal: 300,
    });
    await dataSource.getRepository(PrepVotosEntity).save({
      idDistrito: 1,
      idDelegacion: 99,
      idSeccion: 21,
      tipoCasilla: 'B1',
      claveMdc: 'CLV2',
      idTipoEleccion: 4,
      contabilizar: 'T',
    });

    const { zipBuffer } = await service.generar('20260910_1530', corte());
    const zip = new AdmZip(zipBuffer);
    const csvTexto = iconv.decode(zip.readFile('CDMX_ALC_2024.csv')!, 'latin1');

    expect(csvTexto).toContain('N/A');
  });

  it('should wrap TOTAL_BOLETAS_SOBRANTES with campoInconsistencia (unlike dip, where it stays raw)', async () => {
    await dataSource.getRepository(ScdCasillasEntity).save({
      idDistrito: 1,
      idDelegacion: 2,
      idSeccion: 22,
      tipoCasilla: 'B1',
      claveMdc: 'CLV3',
      listaNominal: 300,
    });
    await dataSource.getRepository(PrepVotosEntity).save({
      idDistrito: 1,
      idDelegacion: 2,
      idSeccion: 22,
      tipoCasilla: 'B1',
      claveMdc: 'CLV3',
      idTipoEleccion: 4,
      inconsistencia: 4,
      contabilizar: 'F',
      boletasSob: null,
    });

    const { zipBuffer } = await service.generar('20260910_1530', corte());
    const zip = new AdmZip(zipBuffer);
    const csvTexto = iconv.decode(zip.readFile('CDMX_ALC_2024.csv')!, 'latin1');

    expect(csvTexto).toContain('SIN ACTA');
  });

  it('should apply INE_AJUSTE_ESPERADAS_ALC as a negative adjustment to ACTAS_ESPERADAS', async () => {
    configService.get.mockImplementation((key: string) =>
      key === 'INE_AJUSTE_ESPERADAS_ALC' ? 1 : 0,
    );
    await dataSource.getRepository(ScdCasillasEntity).save({
      idDistrito: 1,
      idDelegacion: 2,
      idSeccion: 23,
      tipoCasilla: 'B1',
      claveMdc: 'CLV4',
      listaNominal: 100,
    });

    const { zipBuffer } = await service.generar('20260910_1530', corte());
    const zip = new AdmZip(zipBuffer);
    const csvTexto = iconv.decode(zip.readFile('CDMX_ALC_2024.csv')!, 'latin1');
    const filaStats = csvTexto.split('\n')[4];

    // 1 casilla sembrada -> esperadas sin ajuste sería 1; con -1 (INE_AJUSTE_ESPERADAS_ALC=1) debe ser 0.
    expect(filaStats.split(',')[0]).toBe('0');
  });

  it('should publish ORIGEN and DIGITALIZACION with the PREP2024 capturado_por criterion', async () => {
    const casillas = [
      { idSeccion: 30, tipoCasilla: 'B1', claveMdc: 'CLVCAT', capturadoPor: 2 },
      { idSeccion: 31, tipoCasilla: 'B1', claveMdc: 'CLVCAS', capturadoPor: 3 },
    ];
    for (const { idSeccion, tipoCasilla, claveMdc, capturadoPor } of casillas) {
      await dataSource.getRepository(ScdCasillasEntity).save({
        idDistrito: 1,
        idDelegacion: 2,
        idSeccion,
        tipoCasilla,
        claveMdc,
        listaNominal: 300,
      });
      await dataSource.getRepository(PrepVotosEntity).save({
        idDistrito: 1,
        idDelegacion: 2,
        idSeccion,
        tipoCasilla,
        claveMdc,
        idTipoEleccion: 4,
        inconsistencia: null,
        exedeLn: 'F',
        contabilizar: 'T',
        votacionTotal: 50,
        capturadoPor,
      });
    }

    const { zipBuffer } = await service.generar('20260910_1530', corte());
    const csvTexto = iconv.decode(
      new AdmZip(zipBuffer).readFile('CDMX_ALC_2024.csv')!,
      'latin1',
    );
    const fila = (seccion: string) =>
      csvTexto.split('\n').find((linea) => linea.startsWith(`09${seccion}`))!;

    expect(fila('0030')).toContain(',CATD,MOVIL,');
    expect(fila('0031')).toContain(',CASILLA,ESCANER,');
  });
});
