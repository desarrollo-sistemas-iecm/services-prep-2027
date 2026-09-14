import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { AppController } from './app.controller';
import { envValidationSchema } from './config/env.validation';
import { DatabaseModule } from './database/database.module';
import { HealthModule } from './modules/health/health.module';
import { ResultadosLegacyModule } from './modules/resultados-legacy/resultados-legacy.module';
import { ResultadosExplotacionModule } from './modules/resultados-explotacion/resultados-explotacion.module';
import { CortesModule } from './modules/cortes/cortes.module';
import { ExportacionIneModule } from './modules/exportacion-ine/exportacion-ine.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema: envValidationSchema,
    }),
    ThrottlerModule.forRoot([{ name: 'default', ttl: 60000, limit: 100 }]),
    EventEmitterModule.forRoot(),
    DatabaseModule,
    HealthModule,
    ResultadosLegacyModule,
    ResultadosExplotacionModule,
    CortesModule,
    ExportacionIneModule,
  ],
  controllers: [AppController],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
