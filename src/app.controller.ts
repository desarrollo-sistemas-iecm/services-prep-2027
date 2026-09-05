import { Controller, Get } from '@nestjs/common';
import { ApiExcludeEndpoint, ApiTags } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { AppService } from './app.service';

@ApiTags('index')
@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly configService: ConfigService,
  ) {}

  @ApiExcludeEndpoint()
  @Get()
  getIndex() {
    const swaggerPath =
      this.configService.get<string>('SWAGGER_PATH') ?? 'docs';
    return {
      ok: true,
      msg: this.appService.getHello(),
      data: {
        docs: `/${swaggerPath}`,
      },
    };
  }
}
