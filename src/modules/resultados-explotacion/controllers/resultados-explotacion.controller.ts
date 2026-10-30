import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { TipoEleccionDto } from '../dto/tipo-eleccion.dto';
import { ComboSegundoDto } from '../dto/combo-segundo.dto';
import { ComboTerceroDto } from '../dto/combo-tercero.dto';
import { GraficaQueryDto } from '../dto/grafica-query.dto';
import { PruebaDistribucionQueryDto } from '../dto/prueba-distribucion-query.dto';
import { BusquedaSeccionDto } from '../dto/busqueda-seccion.dto';
import { ActasRpDto } from '../dto/actas-rp.dto';
import { ActasExtranjeroDto } from '../dto/actas-extranjero.dto';
import { CombosService } from '../services/combos.service';
import { BusquedaSeccionService } from '../services/busqueda-seccion.service';
import { ResumenVotacionService } from '../services/resumen-votacion.service';
import { EstadisticaService } from '../services/estadistica.service';
import { AvanceService } from '../services/avance.service';
import { MapasService } from '../services/mapas.service';
import { DistribucionService } from '../services/distribucion.service';
import { GraficaService } from '../services/grafica.service';
import { ActasModalidadService } from '../services/actas-modalidad.service';

/**
 * Rutas de explotación de resultados consumidas por `publicador-prep-2027`
 * (`ApiPrepService`). El contrato de respuesta de cada ruta replica el JSON
 * ya consumido por ese frontend (no se puede tocar) — por eso, a propósito,
 * NO usa el envelope `{ok,msg,data}` de `.claude/rules/api-design.md`; es una
 * excepción intencional análoga a la ya documentada para `/reportes/*` en
 * `.claude/rules/security.md`.
 */
@ApiTags('resultados')
@Controller()
export class ResultadosExplotacionController {
  constructor(
    private readonly combosService: CombosService,
    private readonly busquedaSeccionService: BusquedaSeccionService,
    private readonly resumenVotacionService: ResumenVotacionService,
    private readonly estadisticaService: EstadisticaService,
    private readonly avanceService: AvanceService,
    private readonly mapasService: MapasService,
    private readonly distribucionService: DistribucionService,
    private readonly graficaService: GraficaService,
    private readonly actasModalidadService: ActasModalidadService,
  ) {}

  @Post('avance')
  @ApiOperation({
    summary:
      'Avance de actas capturadas y corte oficial para un tipo de elección',
  })
  avance(@Body() dto: TipoEleccionDto) {
    return this.avanceService.obtener(dto.type);
  }

  @Post('resumenvotacion')
  @ApiOperation({
    summary: 'Resumen agregado de votación para un tipo de elección',
  })
  resumenVotacion(@Body() dto: TipoEleccionDto) {
    return this.resumenVotacionService.obtener(dto.type);
  }

  @Post('estadistica')
  @ApiOperation({
    summary: 'Estadística de actas, lista nominal y votos urbanos/no urbanos',
  })
  estadistica(@Body() dto: TipoEleccionDto) {
    return this.estadisticaService.obtener(dto.type);
  }

  @Post('mapas')
  @ApiOperation({
    summary:
      'Datos de participantes y votos por distrito/delegación para el mapa',
  })
  mapas(@Body() dto: TipoEleccionDto) {
    return this.mapasService.obtener(dto.type);
  }

  @Post('grafica')
  @ApiOperation({
    summary: 'Resumen agregado de votos por participante para gráficas',
  })
  async grafica(@Body() dto: GraficaQueryDto) {
    const { resumen, agrupado } = await this.graficaService.grafica(
      dto.type,
      dto.dist_o_alcaldia ?? 0,
      dto.seccion ?? 0,
      dto.casilla ?? null,
      dto.es_distribucion ?? false,
    );
    return { success: true, resumen, agrupado };
  }

  @Post('pruebadistribucion')
  @ApiOperation({
    summary:
      'Votos crudos por casilla (sin agregar) más el agrupado por candidato, separado en casillas normales y voto en el extranjero',
  })
  pruebaDistribucion(@Body() dto: PruebaDistribucionQueryDto) {
    return this.graficaService.pruebaDistribucion(
      dto.type,
      dto.dist_o_alcaldia ?? 0,
      dto.seccion ?? 0,
      dto.casilla ?? null,
      dto.es_distribucion ?? false,
    );
  }

  @Post('distribucion')
  @ApiOperation({
    summary: 'Detalle de votos por casilla de una sección (grilla)',
  })
  distribucion(@Body() dto: ComboTerceroDto) {
    return this.distribucionService.obtener(
      dto.type,
      dto.seleccion,
      dto.seccion,
    );
  }

  @Post('actas/rp')
  @ApiOperation({
    summary:
      'Actas de Representación Proporcional (casillas especiales), opcionalmente de un distrito',
  })
  actasRp(@Body() dto: ActasRpDto) {
    return this.actasModalidadService.rp(dto.seleccion);
  }

  @Post('actas/extranjero')
  @ApiOperation({
    summary: 'Actas de voto en el extranjero para un tipo de elección',
  })
  actasExtranjero(@Body() dto: ActasExtranjeroDto) {
    return this.actasModalidadService.extranjero(dto.type);
  }

  @Post('combos/primero')
  @ApiOperation({
    summary: 'Catálogo de distritos o alcaldías (primer combo del sidebar)',
  })
  primero(@Body() dto: TipoEleccionDto) {
    return this.combosService.primero(dto.type);
  }

  @Post('combos/segundo')
  @ApiOperation({
    summary: 'Secciones dentro del distrito/alcaldía elegido (segundo combo)',
  })
  segundo(@Body() dto: ComboSegundoDto) {
    return this.combosService.segundo(dto.type, dto.seleccion);
  }

  @Post('combos/tercero')
  @ApiOperation({
    summary: 'Tipos de casilla dentro de la sección elegida (tercer combo)',
  })
  tercero(@Body() dto: ComboTerceroDto) {
    return this.combosService.tercero(dto.type, dto.seleccion, dto.seccion);
  }

  @Get('api_seccion.php')
  @ApiOperation({
    summary: 'Busca distrito/delegación a partir de un número de sección',
  })
  buscarSeccion(@Query() dto: BusquedaSeccionDto) {
    return this.busquedaSeccionService.buscar(dto.seccion);
  }
}
