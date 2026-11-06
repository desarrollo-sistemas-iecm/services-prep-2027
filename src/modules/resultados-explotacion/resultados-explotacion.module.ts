import { Module } from '@nestjs/common';
import { ResultadosLegacyModule } from '../resultados-legacy/resultados-legacy.module';
import { CortesModule } from '../cortes/cortes.module';
import { ResultadosExplotacionController } from './controllers/resultados-explotacion.controller';
import { TipoEleccionCatalogoService } from './services/tipo-eleccion-catalogo.service';
import { CombosService } from './services/combos.service';
import { BusquedaSeccionService } from './services/busqueda-seccion.service';
import { ResumenVotacionService } from './services/resumen-votacion.service';
import { EstadisticaService } from './services/estadistica.service';
import { AvanceService } from './services/avance.service';
import { MapasService } from './services/mapas.service';
import { DistribucionService } from './services/distribucion.service';
import { DistribucionVotosService } from './services/distribucion-votos.service';
import { GraficaService } from './services/grafica.service';
import { ActasGridService } from './services/actas-grid.service';
import { ActasModalidadService } from './services/actas-modalidad.service';

/**
 * Rutas de solo lectura ("explotación") sobre el dataset de resultados,
 * consumidas por `publicador-prep-2027`. Importa `ResultadosLegacyModule`
 * (entidades ya existentes, conexión `resultados` de solo lectura) — este
 * módulo nunca escribe sobre ese dataset.
 */
@Module({
  imports: [ResultadosLegacyModule, CortesModule],
  controllers: [ResultadosExplotacionController],
  providers: [
    TipoEleccionCatalogoService,
    CombosService,
    BusquedaSeccionService,
    ResumenVotacionService,
    EstadisticaService,
    AvanceService,
    MapasService,
    DistribucionService,
    DistribucionVotosService,
    GraficaService,
    ActasGridService,
    ActasModalidadService,
  ],
})
export class ResultadosExplotacionModule {}
