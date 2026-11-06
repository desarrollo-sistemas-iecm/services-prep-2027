import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { join } from 'path';
import { parseTrustProxy } from './config/trust-proxy.config';

export function configureValidation(app: NestExpressApplication): void {
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

export function configureSecurity(app: NestExpressApplication): void {
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          ...helmet.contentSecurityPolicy.getDefaultDirectives(),
          'upgrade-insecure-requests': null,
        },
      },
    }),
  );
}

export function configureTrustProxy(app: NestExpressApplication): void {
  const configService = app.get(ConfigService);
  app.set(
    'trust proxy',
    parseTrustProxy(configService.get<string>('TRUST_PROXY')),
  );
}

export function configureStaticAssets(app: NestExpressApplication): void {
  app.useStaticAssets(join(__dirname, '..', 'public'));
}

export function configureCors(app: NestExpressApplication): void {
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

export function configureSwagger(app: NestExpressApplication): void {
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

export function configureApp(app: NestExpressApplication): void {
  const configService = app.get(ConfigService);
  const apiPrefix = configService.get<string>('API_PREFIX') ?? 'api/v1';

  configureTrustProxy(app);
  configureStaticAssets(app);
  app.setGlobalPrefix(apiPrefix);

  configureSecurity(app);
  configureCors(app);
  configureValidation(app);
  configureSwagger(app);
}
