import { Controller, Get } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

export interface VersionResult {
  ok: boolean;
  msg: string;
  data: {
    appVersion: string;
    gitCommitBackend: string;
    gitCommitFrontend: string;
    buildDate: string;
    imageDigest: string;
  };
}

/**
 * Metadatos de versión inyectados como build args del Dockerfile (ver
 * deployment-prep-2027/Dockerfile). Sin secretos ni rutas internas.
 */
@ApiTags('version')
@Controller('version')
export class VersionController {
  constructor(private readonly configService: ConfigService) {}

  @Get()
  @ApiOperation({
    summary: 'Metadatos de versión del backend',
    description: 'No requiere autenticación. No expone secretos.',
  })
  @ApiOkResponse({
    schema: {
      example: {
        ok: true,
        msg: 'La información se obtuvo correctamente.',
        data: {
          appVersion: '0.0.1',
          gitCommitBackend: 'a7e9fdc',
          gitCommitFrontend: 'd1649f4',
          buildDate: '2026-09-05T00:00:00.000Z',
          imageDigest: 'unknown',
        },
      },
    },
  })
  getVersion(): VersionResult {
    return {
      ok: true,
      msg: 'La información se obtuvo correctamente.',
      data: {
        appVersion: this.configService.get<string>('APP_VERSION') ?? 'unknown',
        gitCommitBackend:
          this.configService.get<string>('GIT_COMMIT_BACKEND') ?? 'unknown',
        gitCommitFrontend:
          this.configService.get<string>('GIT_COMMIT_FRONTEND') ?? 'unknown',
        buildDate: this.configService.get<string>('BUILD_DATE') ?? 'unknown',
        imageDigest:
          this.configService.get<string>('IMAGE_DIGEST') ?? 'unknown',
      },
    };
  }
}
