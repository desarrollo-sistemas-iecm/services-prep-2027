import * as fs from 'fs';
import * as path from 'path';
import Database from 'better-sqlite3';
import { DataSource } from 'typeorm';
import { CorteReleaseEntity } from '../src/modules/cortes/entities/corte-release.entity';
import { BitacoraEntryEntity } from '../src/modules/cortes/entities/bitacora-entry.entity';
import { RESULTADOS_LEGACY_TABLE_NAMES } from '../src/modules/resultados-legacy/resultados-legacy.module';

const CONTROL_DB_PATH = path.resolve(__dirname, '../data/control_test.db3');
const RESULTADOS_DB_PATH = path.resolve(
  __dirname,
  'fixtures/resultados-fixture_test.db3',
);

export default async function globalSetup(): Promise<void> {
  process.env.NODE_ENV = 'test';
  process.env.API_PREFIX = 'api/v1';
  process.env.PORT = '3999';
  process.env.JWT_SECRET = 'test-only-jwt-secret-0000000000000000';
  process.env.JWT_EXPIRES_IN = '1h';
  process.env.CORTES_MANIFEST_HMAC_SECRET =
    'test-only-hmac-secret-0000000000000000';
  process.env.CORTES_MAX_UPLOAD_MB = '5';
  process.env.CORTES_UPLOAD_RATE_LIMIT = '100';
  process.env.SWAGGER_TITLE = 'PREP API (test)';
  process.env.SWAGGER_DESCRIPTION = 'test';
  process.env.SWAGGER_VERSION = '1.0.0';
  process.env.SWAGGER_PATH = 'docs';
  process.env.CORS_ORIGINS = 'http://localhost:3000';
  process.env.DB_LOGGING = 'false';

  fs.rmSync(CONTROL_DB_PATH, { force: true });
  process.env.CONTROL_DB_STORAGE = CONTROL_DB_PATH;

  fs.mkdirSync(path.dirname(RESULTADOS_DB_PATH), { recursive: true });
  fs.rmSync(RESULTADOS_DB_PATH, { force: true });
  const fixtureDb = new Database(RESULTADOS_DB_PATH);
  for (const table of RESULTADOS_LEGACY_TABLE_NAMES) {
    fixtureDb.exec(`CREATE TABLE "${table}" (id INTEGER)`);
  }
  fixtureDb.close();
  process.env.DB_STORAGE = RESULTADOS_DB_PATH;

  const controlDataSource = new DataSource({
    type: 'better-sqlite3',
    database: CONTROL_DB_PATH,
    entities: [CorteReleaseEntity, BitacoraEntryEntity],
    migrations: [path.resolve(__dirname, '../src/database/migrations/*.ts')],
    synchronize: false,
  });
  await controlDataSource.initialize();
  await controlDataSource.runMigrations();
  await controlDataSource.destroy();
}
