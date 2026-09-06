import { Global, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CorteReleaseEntity } from '../modules/cortes/entities/corte-release.entity';
import { BitacoraEntryEntity } from '../modules/cortes/entities/bitacora-entry.entity';
import { RESULTADOS_LEGACY_ENTITIES } from '../modules/resultados-legacy/resultados-legacy.module';

@Global()
@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      name: 'control',
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        name: 'control',
        type: 'better-sqlite3',
        database: configService.getOrThrow<string>('CONTROL_DB_STORAGE'),
        entities: [CorteReleaseEntity, BitacoraEntryEntity],
        migrations: [__dirname + '/migrations/*{.ts,.js}'],
        // `control.db3` es interno de esta app (no un dataset externo como
        // `resultados`) — corre migraciones automáticamente al conectar para
        // que el contenedor arranque solo sobre un volumen vacío, sin un
        // paso manual de `pnpm run migration:run`.
        migrationsRun: true,
        synchronize: false,
        logging: configService.get<string>('DB_LOGGING') === 'true',
      }),
    }),
    TypeOrmModule.forRootAsync({
      name: 'resultados',
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        name: 'resultados',
        type: 'better-sqlite3',
        database: configService.getOrThrow<string>('DB_STORAGE'),
        entities: RESULTADOS_LEGACY_ENTITIES,
        synchronize: false,
        readonly: true,
        logging: configService.get<string>('DB_LOGGING') === 'true',
      }),
    }),
  ],
  exports: [TypeOrmModule],
})
export class DatabaseModule {}
