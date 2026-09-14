import { Module } from '@nestjs/common';
import { ResultadosLegacyModule } from '../resultados-legacy/resultados-legacy.module';
import { CortesModule } from '../cortes/cortes.module';
import { ExportacionIneController } from './controllers/exportacion-ine.controller';
import { ExportacionIneService } from './services/exportacion-ine.service';
import { ExportDipService } from './services/export-dip.service';
import { ExportAlcService } from './services/export-alc.service';

/**
 * Exportación de resultados en formato INE (Diputaciones + Alcaldías — Jefatura de Gobierno queda fuera
 * de esta iteración, ver `docs/superpowers/specs/2026-09-14-exportacion-ine-zip-design.md`). Solo lectura
 * sobre `ResultadosLegacyModule`; usa `CortesModule` para saber cuál es el corte activo.
 */
@Module({
  imports: [ResultadosLegacyModule, CortesModule],
  controllers: [ExportacionIneController],
  providers: [ExportacionIneService, ExportDipService, ExportAlcService],
})
export class ExportacionIneModule {}
