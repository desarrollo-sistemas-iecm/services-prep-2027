import { Injectable } from '@nestjs/common';
import * as sqlite3 from 'sqlite3';
import { RESULTADOS_LEGACY_TABLE_NAMES } from '../../resultados-legacy/resultados-legacy.module';

export interface SqliteFileValidationResult {
  valid: boolean;
  reason?: string;
}

/**
 * Tablas que un archivo database.db3 subido por el difusor debe contener
 * como mínimo, las mismas que ya se mapearon como entidades de solo lectura.
 */
const EXPECTED_TABLES = RESULTADOS_LEGACY_TABLE_NAMES;

@Injectable()
export class SqliteFileValidationService {
  async validate(filePath: string): Promise<SqliteFileValidationResult> {
    const db = await this.openReadOnly(filePath);
    if (!db) {
      return {
        valid: false,
        reason: 'No se pudo abrir el archivo como base SQLite',
      };
    }

    try {
      const integrity = await this.integrityCheck(db);
      if (integrity !== 'ok') {
        return { valid: false, reason: 'PRAGMA integrity_check falló' };
      }

      const tables = await this.listTables(db);
      const missing = EXPECTED_TABLES.filter(
        (table) => !tables.includes(table),
      );
      if (missing.length > 0) {
        return {
          valid: false,
          reason: `Faltan tablas esperadas: ${missing.join(', ')}`,
        };
      }

      return { valid: true };
    } finally {
      db.close();
    }
  }

  private openReadOnly(filePath: string): Promise<sqlite3.Database | null> {
    return new Promise((resolve) => {
      const db = new sqlite3.Database(
        filePath,
        sqlite3.OPEN_READONLY,
        (error) => {
          resolve(error ? null : db);
        },
      );
    });
  }

  private integrityCheck(db: sqlite3.Database): Promise<string> {
    return new Promise((resolve) => {
      db.get(
        'PRAGMA integrity_check',
        (error, row: { integrity_check?: string }) => {
          resolve(
            !error && row?.integrity_check ? row.integrity_check : 'fail',
          );
        },
      );
    });
  }

  private listTables(db: sqlite3.Database): Promise<string[]> {
    return new Promise((resolve) => {
      db.all(
        "SELECT name FROM sqlite_master WHERE type = 'table'",
        (error, rows: { name: string }[]) => {
          resolve(!error && rows ? rows.map((row) => row.name) : []);
        },
      );
    });
  }
}
