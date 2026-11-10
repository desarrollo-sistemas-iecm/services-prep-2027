import { DataSource } from 'typeorm';
import AdmZip from 'adm-zip';
import * as iconv from 'iconv-lite';
import { ConfigService } from '@nestjs/config';
import { ExportDipService } from '../services/export-dip.service';
import { createTestDataSource } from '../../resultados-explotacion/tests/helpers/test-data-source';
import { ScdCasillasEntity } from '../../resultados-legacy/entities/scd-casillas.entity';
import { PrepVotosEntity } from '../../resultados-legacy/entities/prep-votos.entity';
import { CorteLegacyEntity } from '../../resultados-legacy/entities/corte-legacy.entity';

describe('ExportDipService', () => {
  let dataSource: DataSource;
  let configService: { get: jest.Mock };
  let service: ExportDipService;

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
    service = new ExportDipService(
      dataSource,
      configService as unknown as ConfigService,
    );
  });

  afterEach(async () => {
    await dataSource.destroy();
  });

  it('should build a zip with the CSV, the static candidaturas CSV, and leeme.txt', async () => {
    await dataSource.getRepository(ScdCasillasEntity).save({
      idDistrito: 1,
      idDelegacion: 2,
      idSeccion: 10,
      tipoCasilla: 'B1',
      claveMdc: 'CLV1',
      listaNominal: 500,
    });
    await dataSource.getRepository(PrepVotosEntity).save({
      idDistrito: 1,
      idDelegacion: 2,
      idSeccion: 10,
      tipoCasilla: 'B1',
      claveMdc: 'CLV1',
      idTipoEleccion: 2,
      inconsistencia: 6,
      exedeLn: 'F',
      contabilizar: 'T',
      boletasSob: 10,
      ciudadanosVotaron: 100,
      representantesVotaron: 2,
      votacionTotal: 100,
      votosPart1: null,
      votosNulos: 3,
    });

    const { filename, zipBuffer } = await service.generar(
      '20260910_1530',
      corte(),
    );

    expect(filename).toBe('20260910_1530_PREP_DIP_LOC_CDMX.zip');
    const zip = new AdmZip(zipBuffer);
    expect(
      zip
        .getEntries()
        .map((entrada) => entrada.entryName)
        .sort(),
    ).toEqual([
      'CDMX_DIP_LOC_2024.csv',
      'CDMX_DIP_LOC_CANDIDATURAS_2024.csv',
      'leeme.txt',
    ]);

    const csvTexto = iconv.decode(
      zip.readFile('CDMX_DIP_LOC_2024.csv')!,
      'latin1',
    );
    const lineas = csvTexto.split('\n');
    expect(lineas[0]).toBe('DIPUTACION LOCALES');
    expect(lineas[1]).toBe('10/09/2026 15:30(UTC-6)');
    // PAN (votos_part_1) es null con inconsistencia=6 -> 'SIN DATO'; TOTAL_BOLETAS_SOBRANTES en dip NO
    // se envuelve (a diferencia de alc), así que boletas_sob=10 sale tal cual.
    expect(lineas[7]).toContain('SIN DATO');
    expect(lineas[7]).toContain(',10,');
  });

  it('should mark NULOS as ILEGIBLE without a trailing space when null and inconsistencia is 1 or 2', async () => {
    await dataSource.getRepository(ScdCasillasEntity).save({
      idDistrito: 1,
      idDelegacion: 2,
      idSeccion: 11,
      tipoCasilla: 'B1',
      claveMdc: 'CLV2',
      listaNominal: 400,
    });
    await dataSource.getRepository(PrepVotosEntity).save({
      idDistrito: 1,
      idDelegacion: 2,
      idSeccion: 11,
      tipoCasilla: 'B1',
      claveMdc: 'CLV2',
      idTipoEleccion: 3,
      inconsistencia: 1,
      exedeLn: 'F',
      contabilizar: 'F',
      // Se fijan en 0 para aislar el caso bajo prueba: solo NULOS debe quedar NULL. Si se dejan sin
      // definir, también caen en la rama IN(1,2) de campoInconsistencia y salen como 'ILEGIBLE ' (con
      // espacio), lo que produciría falsos positivos en la aserción negativa de abajo.
      votosPart1: 0,
      votosPart2: 0,
      votosPart3: 0,
      votosPart4: 0,
      votosPart5: 0,
      votosPart6: 0,
      votosPart7: 0,
      votosPart8: 0,
      votosPart10: 0,
      votosPart11: 0,
      votosPart12: 0,
      votosPart13: 0,
      votosPart14: 0,
      votosCandNoReg: 0,
      votosNulos: null,
    });

    const { zipBuffer } = await service.generar('20260910_1530', corte());
    const zip = new AdmZip(zipBuffer);
    const csvTexto = iconv.decode(
      zip.readFile('CDMX_DIP_LOC_2024.csv')!,
      'latin1',
    );

    expect(csvTexto).toContain(',ILEGIBLE,');
    expect(csvTexto).not.toContain(',ILEGIBLE ,');
  });

  it('should apply INE_AJUSTE_ESPERADAS_DIP as a positive adjustment to ACTAS_ESPERADAS', async () => {
    configService.get.mockImplementation((key: string) =>
      key === 'INE_AJUSTE_ESPERADAS_DIP' ? 44 : 0,
    );
    await dataSource.getRepository(ScdCasillasEntity).save({
      idDistrito: 1,
      idDelegacion: 2,
      idSeccion: 12,
      tipoCasilla: 'B1',
      claveMdc: 'CLV3',
      listaNominal: 100,
    });

    const { zipBuffer } = await service.generar('20260910_1530', corte());
    const zip = new AdmZip(zipBuffer);
    const csvTexto = iconv.decode(
      zip.readFile('CDMX_DIP_LOC_2024.csv')!,
      'latin1',
    );
    const filaStats = csvTexto.split('\n')[4];

    // 1 casilla sembrada -> esperadas sin ajuste sería 1; con +44 debe ser 45.
    expect(filaStats.split(',')[0]).toBe('45');
  });

  it.each([
    [1, 'CATD', 'MOVIL'],
    [2, 'CATD', 'MOVIL'],
    [3, 'CASILLA', 'ESCANER'],
    [4, 'CASILLA', 'ESCANER'],
    [null, 'N/A', 'N/A'],
    [9, 'N/A', 'N/A'],
  ])(
    'should publish ORIGEN %s and DIGITALIZACION like PREP2024 when capturado_por is %s',
    async (capturadoPor, origen, digitalizacion) => {
      await dataSource.getRepository(ScdCasillasEntity).save({
        idDistrito: 1,
        idDelegacion: 2,
        idSeccion: 30,
        tipoCasilla: 'B1',
        claveMdc: 'CLV30',
        listaNominal: 300,
      });
      await dataSource.getRepository(PrepVotosEntity).save({
        idDistrito: 1,
        idDelegacion: 2,
        idSeccion: 30,
        tipoCasilla: 'B1',
        claveMdc: 'CLV30',
        idTipoEleccion: 2,
        inconsistencia: null,
        exedeLn: 'F',
        contabilizar: 'T',
        votacionTotal: 50,
        capturadoPor,
      });

      const { zipBuffer } = await service.generar('20260910_1530', corte());

      const columnas = iconv
        .decode(
          new AdmZip(zipBuffer).readFile('CDMX_DIP_LOC_2024.csv')!,
          'latin1',
        )
        .split('\n');
      const encabezado = columnas
        .find((linea) => linea.startsWith('CLAVE_CASILLA'))!
        .split(',');
      const fila = columnas
        .find((linea) => linea.startsWith('090030'))!
        .split(',');
      expect(fila[encabezado.indexOf('ORIGEN')]).toBe(origen);
      expect(fila[encabezado.indexOf('DIGITALIZACION')]).toBe(digitalizacion);
    },
  );
});
