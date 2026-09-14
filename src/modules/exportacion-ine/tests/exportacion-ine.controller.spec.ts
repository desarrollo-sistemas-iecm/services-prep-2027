import { NotFoundException } from '@nestjs/common';
import { ExportacionIneController } from '../controllers/exportacion-ine.controller';
import { ExportacionIneService } from '../services/exportacion-ine.service';

describe('ExportacionIneController', () => {
  it('should throw NotFoundException when there is no cached zip', () => {
    const service = { obtenerZipActual: jest.fn().mockReturnValue(null) };
    const controller = new ExportacionIneController(
      service as unknown as ExportacionIneService,
    );

    expect(() => controller.descargar()).toThrow(NotFoundException);
  });

  it('should return a StreamableFile with zip content-type and the correct filename', () => {
    const buffer = Buffer.from('contenido-zip');
    const service = {
      obtenerZipActual: jest
        .fn()
        .mockReturnValue({ fechacorte: '20260910_1530', buffer }),
    };
    const controller = new ExportacionIneController(
      service as unknown as ExportacionIneService,
    );

    const archivo = controller.descargar();

    expect(archivo.getHeaders().type).toBe('application/zip');
    expect(archivo.getHeaders().disposition).toBe(
      'attachment; filename="20260910_1530_PREP_CDMX.zip"',
    );
  });
});
