import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule, JwtSignOptions } from '@nestjs/jwt';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CortesController } from './controllers/cortes.controller';
import { CorteReleaseEntity } from './entities/corte-release.entity';
import { BitacoraEntryEntity } from './entities/bitacora-entry.entity';
import { JwtDifusorGuard } from './guards/jwt-difusor.guard';
import { CortesService } from './services/cortes.service';
import { ManifestVerificationService } from './services/manifest-verification.service';
import { SqliteFileValidationService } from './services/sqlite-file-validation.service';
import { ActivationService } from './services/activation.service';

@Module({
  imports: [
    TypeOrmModule.forFeature(
      [CorteReleaseEntity, BitacoraEntryEntity],
      'control',
    ),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.getOrThrow<string>('JWT_SECRET'),
        signOptions: {
          expiresIn: configService.getOrThrow<string>(
            'JWT_EXPIRES_IN',
          ) as JwtSignOptions['expiresIn'],
          algorithm: 'HS256',
        },
      }),
    }),
  ],
  controllers: [CortesController],
  providers: [
    CortesService,
    ManifestVerificationService,
    SqliteFileValidationService,
    ActivationService,
    JwtDifusorGuard,
  ],
  exports: [ActivationService, CortesService],
})
export class CortesModule {}
