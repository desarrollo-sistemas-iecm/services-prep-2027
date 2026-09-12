import { DataSource } from 'typeorm';
import { RESULTADOS_LEGACY_ENTITIES } from '../../../resultados-legacy/resultados-legacy.module';

/**
 * DataSource SQLite en memoria con el mismo esquema que `resultados-legacy`,
 * usado solo en pruebas de integración de este módulo — nunca contra el
 * `database.db3` real (de solo lectura, dataset externo del difusor).
 */
export async function createTestDataSource(): Promise<DataSource> {
  const dataSource = new DataSource({
    type: 'better-sqlite3',
    database: ':memory:',
    entities: RESULTADOS_LEGACY_ENTITIES,
    synchronize: true,
    dropSchema: true,
  });
  await dataSource.initialize();
  return dataSource;
}
