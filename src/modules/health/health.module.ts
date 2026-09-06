import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HealthController } from './controllers/health.controller';
import { VersionController } from './controllers/version.controller';
import { HealthService } from './services/health.service';
import { CorteReleaseEntity } from '../cortes/entities/corte-release.entity';

@Module({
  imports: [TypeOrmModule.forFeature([CorteReleaseEntity], 'control')],
  controllers: [HealthController, VersionController],
  providers: [HealthService],
})
export class HealthModule {}
