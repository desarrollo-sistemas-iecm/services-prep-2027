import { Controller, Get, NotFoundException, StreamableFile } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { ExportacionIneService } from '../services/exportacion-ine.service';

/**
 * Descarga binaria (no JSON) del ZIP de resultados en formato INE del corte activo — regenerado
 * automáticamente al activarse un corte (ver `ExportacionIneService`), nunca en esta ruta. Público, sin
 * guard, igual que el resto de `resultados-explotacion`.
 */
@ApiTags('exportacion-ine')
@Controller('exportacion-ine')
export class ExportacionIneController {
  constructor(private readonly exportacionIneService: ExportacionIneService) {}

  @Get()
  @ApiOperation({
    summary:
      'Descarga el ZIP de resultados en formato INE (Diputaciones + Alcaldías) del corte activo',
  })
  descargar(): StreamableFile {
    const actual = this.exportacionIneService.obtenerZipActual();
    if (!actual) {
      throw new NotFoundException(
        'Aún no se ha generado ningún corte con exportación INE.',
      );
    }

    return new StreamableFile(actual.buffer, {
      type: 'application/zip',
      disposition: `attachment; filename="${actual.fechacorte}_PREP_CDMX.zip"`,
    });
  }
}
