import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as path from 'path';
import * as sqlite3 from 'sqlite3';

export interface HealthCheckResult {
  ok: boolean;
  msg: string;
  checks: {
    app: boolean;
    db_exists: boolean;
    db_integrity: 'ok' | 'fail' | 'missing' | 'timeout';
  };
}

const INTEGRITY_CHECK_TIMEOUT_MS = 3000;

@Injectable()
export class HealthService {
  constructor(private readonly configService: ConfigService) {}

  async check(): Promise<HealthCheckResult> {
    const dbPath = path.resolve(
      process.cwd(),
      this.configService.get<string>('DB_STORAGE') ?? './data/database.db3',
    );
    const exists = fs.existsSync(dbPath);

    const dbIntegrity = exists
      ? await this.runIntegrityCheck(dbPath)
      : 'missing';

    return {
      ok: true,
      msg: 'ok',
      checks: {
        app: true,
        db_exists: exists,
        db_integrity: dbIntegrity,
      },
    };
  }

  private runIntegrityCheck(
    dbPath: string,
  ): Promise<'ok' | 'fail' | 'timeout'> {
    return new Promise((resolve) => {
      let settled = false;
      const timer = setTimeout(() => {
        if (settled) return;
        settled = true;
        db.close();
        resolve('timeout');
      }, INTEGRITY_CHECK_TIMEOUT_MS);

      const db = new sqlite3.Database(
        dbPath,
        sqlite3.OPEN_READONLY,
        (openError) => {
          if (openError) {
            if (settled) return;
            settled = true;
            clearTimeout(timer);
            resolve('fail');
            return;
          }

          db.get(
            'PRAGMA integrity_check',
            (queryError, row: { integrity_check?: string }) => {
              if (settled) return;
              settled = true;
              clearTimeout(timer);
              db.close();
              resolve(
                !queryError && row?.integrity_check === 'ok' ? 'ok' : 'fail',
              );
            },
          );
        },
      );
    });
  }
}
