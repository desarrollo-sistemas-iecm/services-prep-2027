import { DataSource } from 'typeorm';
import { RESULTADOS_LEGACY_ENTITIES } from '../modules/resultados-legacy/resultados-legacy.module';

try {
  process.loadEnvFile();
} catch {
  // .env is optional when the environment already provides the variables (CI, prod).
}

/**
 * Dataset externo, reemplazado por completo por el difusor en cada corte.
 * No se le aplican migraciones: el esquema no es nuestro y `synchronize`
 * permanece en false para no escribir nunca sobre este archivo.
 */
const resultadosDataSource = new DataSource({
  type: 'better-sqlite3',
  database: process.env.DB_STORAGE ?? './data/database.db3',
  entities: RESULTADOS_LEGACY_ENTITIES,
  synchronize: false,
  readonly: true,
  logging: process.env.DB_LOGGING === 'true',
});

export default resultadosDataSource;
