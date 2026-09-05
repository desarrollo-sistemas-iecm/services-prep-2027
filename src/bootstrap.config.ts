import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';

export function configureValidation(app: INestApplication): void {
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );
}

export function configureSecurity(app: INestApplication): void {
  app.use(helmet());
}

export function configureCors(app: INestApplication): void {
  const configService = app.get(ConfigService);
  const origins = (configService.get<string>('CORS_ORIGINS') ?? '')
    .split(',')
    .map((origin) => origin.trim())
    .filter((origin) => origin.length > 0);

  app.enableCors({
    origin: origins,
    credentials: true,
  });
}

export function configureSwagger(app: INestApplication): void {
  const configService = app.get(ConfigService);
  const swaggerPath = configService.get<string>('SWAGGER_PATH') ?? 'docs';

  const documentConfig = new DocumentBuilder()
    .setTitle(configService.get<string>('SWAGGER_TITLE') ?? 'PREP API')
    .setDescription(configService.get<string>('SWAGGER_DESCRIPTION') ?? '')
    .setVersion(configService.get<string>('SWAGGER_VERSION') ?? '1.0.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, documentConfig);
  SwaggerModule.setup(swaggerPath, app, document);
}

export function configureApp(app: INestApplication): void {
  const configService = app.get(ConfigService);
  const apiPrefix = configService.get<string>('API_PREFIX') ?? 'api/v1';

  app.setGlobalPrefix(apiPrefix);

  configureSecurity(app);
  configureCors(app);
  configureValidation(app);
  configureSwagger(app);
}
