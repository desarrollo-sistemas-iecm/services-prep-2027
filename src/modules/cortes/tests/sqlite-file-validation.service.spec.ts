import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import Database from 'better-sqlite3';
import { SqliteFileValidationService } from '../services/sqlite-file-validation.service';
import { RESULTADOS_LEGACY_TABLE_NAMES } from '../../resultados-legacy/resultados-legacy.module';

describe('SqliteFileValidationService', () => {
  let service: SqliteFileValidationService;
  let tmpDir: string;

  beforeEach(() => {
    service = new SqliteFileValidationService();
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cortes-validation-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  function createValidDatabase(): string {
    const filePath = path.join(tmpDir, 'valid.db3');
    const db = new Database(filePath);
    for (const table of RESULTADOS_LEGACY_TABLE_NAMES) {
      db.exec(`CREATE TABLE "${table}" (id INTEGER)`);
    }
    db.close();
    return filePath;
  }

  it('should accept a database with integrity ok and every expected table', async () => {
    const filePath = createValidDatabase();

    const result = await service.validate(filePath);

    expect(result).toEqual({ valid: true });
  });

  it('should reject a database missing an expected table', async () => {
    const filePath = path.join(tmpDir, 'missing-table.db3');
    const db = new Database(filePath);
    db.exec('CREATE TABLE corte (id INTEGER)');
    db.close();

    const result = await service.validate(filePath);

    expect(result.valid).toBe(false);
    expect(result.reason).toContain('Faltan tablas esperadas');
  });

  it('should reject a file that is not a valid SQLite database', async () => {
    const filePath = path.join(tmpDir, 'not-sqlite.db3');
    fs.writeFileSync(filePath, 'this is not a sqlite file');

    const result = await service.validate(filePath);

    expect(result.valid).toBe(false);
  });
});
