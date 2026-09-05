import { DataSource } from 'typeorm';
import { CorteReleaseEntity } from '../modules/cortes/entities/corte-release.entity';
import { BitacoraEntryEntity } from '../modules/cortes/entities/bitacora-entry.entity';

try {
  process.loadEnvFile();
} catch {
  // .env is optional when the environment already provides the variables (CI, prod).
}

const controlDataSource = new DataSource({
  type: 'better-sqlite3',
  database: process.env.CONTROL_DB_STORAGE ?? './data/control.db3',
  entities: [CorteReleaseEntity, BitacoraEntryEntity],
  migrations: ['src/database/migrations/*.ts'],
  synchronize: false,
  logging: process.env.DB_LOGGING === 'true',
});

export default controlDataSource;
