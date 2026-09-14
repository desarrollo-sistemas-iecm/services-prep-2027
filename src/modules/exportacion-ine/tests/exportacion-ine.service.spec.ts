import { Repository } from 'typeorm';
import { ExportacionIneService } from '../services/exportacion-ine.service';
import { ExportDipService } from '../services/export-dip.service';
import { ExportAlcService } from '../services/export-alc.service';
import { CortesService } from '../../cortes/services/cortes.service';
import { CorteLegacyEntity } from '../../resultados-legacy/entities/corte-legacy.entity';

describe('ExportacionIneService', () => {
  let corteLegacyRepository: { find: jest.Mock };
  let exportDipService: { generar: jest.Mock };
  let exportAlcService: { generar: jest.Mock };
  let cortesService: { getActive: jest.Mock };
  let service: ExportacionIneService;

  const corte: CorteLegacyEntity = {
    id: 1,
    corteFecha: null,
    corteHora: null,
    dia: '10',
    mes: '09',
    anio: 2026,
    hora: '15',
    minuto: '30',
    segundo: '00',
  };

  beforeEach(() => {
    corteLegacyRepository = { find: jest.fn().mockResolvedValue([corte]) };
    exportDipService = {
      generar: jest.fn().mockResolvedValue({
        filename: 'dip.zip',
        zipBuffer: Buffer.from('dip'),
      }),
    };
    exportAlcService = {
      generar: jest.fn().mockResolvedValue({
        filename: 'alc.zip',
        zipBuffer: Buffer.from('alc'),
      }),
    };
    cortesService = { getActive: jest.fn().mockResolvedValue(null) };
    service = new ExportacionIneService(
      corteLegacyRepository as unknown as Repository<CorteLegacyEntity>,
      exportDipService as unknown as ExportDipService,
      exportAlcService as unknown as ExportAlcService,
      cortesService as unknown as CortesService,
    );
  });

  it('should have no cached zip when no corte is activated at startup', async () => {
    await service.onModuleInit();
    expect(service.obtenerZipActual()).toBeNull();
  });

  it('should generate and cache the zip immediately at startup when a corte is already ACTIVATED', async () => {
    cortesService.getActive.mockResolvedValue({ cutId: 'corte-1' });

    await service.onModuleInit();

    expect(exportDipService.generar).toHaveBeenCalledWith(
      '20260910_1530',
      corte,
    );
    expect(exportAlcService.generar).toHaveBeenCalledWith(
      '20260910_1530',
      corte,
    );
    expect(service.obtenerZipActual()).not.toBeNull();
    expect(service.obtenerZipActual()?.fechacorte).toBe('20260910_1530');
  });

  it('should regenerate the cache when the corte.activated event fires', async () => {
    await service.manejarCorteActivado({ cutId: 'corte-2' });

    expect(service.obtenerZipActual()?.fechacorte).toBe('20260910_1530');
  });

  it('should keep the previous cache when a generator fails', async () => {
    await service.manejarCorteActivado({ cutId: 'corte-1' });
    const cacheAnterior = service.obtenerZipActual();

    exportDipService.generar.mockRejectedValueOnce(new Error('fallo de query'));
    await service.manejarCorteActivado({ cutId: 'corte-2' });

    expect(service.obtenerZipActual()).toEqual(cacheAnterior);
  });

  it('should log and do nothing when the corte table has no rows', async () => {
    corteLegacyRepository.find.mockResolvedValue([]);

    await service.manejarCorteActivado({ cutId: 'corte-1' });

    expect(service.obtenerZipActual()).toBeNull();
    expect(exportDipService.generar).not.toHaveBeenCalled();
  });
});
