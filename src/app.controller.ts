import { Controller, Get, Redirect } from '@nestjs/common';
import { ApiExcludeEndpoint, ApiTags } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';

@ApiTags('index')
@Controller()
export class AppController {
  constructor(private readonly configService: ConfigService) {}

  @ApiExcludeEndpoint()
  @Get()
  @Redirect()
  redirectToDocs() {
    const swaggerPath =
      this.configService.get<string>('SWAGGER_PATH') ?? 'docs';
    return { url: `/${swaggerPath}`, statusCode: 302 };
  }
}
