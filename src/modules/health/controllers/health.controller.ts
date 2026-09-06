import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { HealthService } from '../services/health.service';
import type {
  HealthCheckResult,
  LiveCheckResult,
  ReadyCheckResult,
} from '../services/health.service';

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get('live')
  @ApiOperation({
    summary: 'Verifica que el proceso NestJS está funcionando',
    description:
      'No requiere autenticación. Siempre responde 200 si el proceso está vivo.',
  })
  @ApiOkResponse({
    schema: { example: { ok: true, msg: 'ok', data: { status: 'alive' } } },
  })
  live(): LiveCheckResult {
    return this.healthService.live();
  }

  @Get('ready')
  @ApiOperation({
    summary: 'Informa si existe una SQLite activa y válida',
    description:
      'Antes del primer corte responde 200 con status "waiting_for_first_cut" para permitir el arranque inicial. No requiere autenticación.',
  })
  @ApiOkResponse({
    schema: {
      example: {
        ok: true,
        msg: 'La información se obtuvo correctamente.',
        data: {
          status: 'ready',
          cutId: 'corte-2026-09-05-01',
          version: '1.0',
          activatedAt: '2026-09-05T18:05:00.000Z',
        },
      },
    },
  })
  ready(): Promise<ReadyCheckResult> {
    return this.healthService.ready();
  }

  @Get()
  @ApiOperation({
    summary: 'Estado de salud del servicio',
    description:
      'Verifica que la aplicación responda y que database.db3 exista con integridad correcta. No requiere autenticación. Este endpoint no usa el envelope {ok,msg,data} estándar: expone {ok,msg,checks} por diseño.',
  })
  @ApiOkResponse({
    description: 'Estado de salud',
    schema: {
      example: {
        ok: true,
        msg: 'ok',
        checks: { app: true, db_exists: true, db_integrity: 'ok' },
      },
    },
  })
  async health(): Promise<HealthCheckResult> {
    return this.healthService.check();
  }
}
