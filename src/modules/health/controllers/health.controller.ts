import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { HealthCheckResult, HealthService } from '../services/health.service';

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

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
