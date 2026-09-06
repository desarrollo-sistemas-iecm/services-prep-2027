import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as fs from 'fs';
import * as path from 'path';
import * as sqlite3 from 'sqlite3';
import { CorteReleaseEntity } from '../../cortes/entities/corte-release.entity';
import { CorteStatus } from '../../cortes/enums/corte-status.enum';

export interface HealthCheckResult {
  ok: boolean;
  msg: string;
  checks: {
    app: boolean;
    db_exists: boolean;
    db_integrity: 'ok' | 'fail' | 'missing' | 'timeout';
  };
}

export interface LiveCheckResult {
  ok: boolean;
  msg: string;
  data: { status: 'alive' };
}

export type ReadyCheckResult =
  | { ok: boolean; msg: string; data: { status: 'waiting_for_first_cut' } }
  | {
      ok: boolean;
      msg: string;
      data: {
        status: 'ready';
        cutId: string;
        version: string;
        activatedAt: string;
      };
    };

const INTEGRITY_CHECK_TIMEOUT_MS = 3000;

@Injectable()
export class HealthService {
  constructor(
    private readonly configService: ConfigService,
    @InjectRepository(CorteReleaseEntity, 'control')
    private readonly corteReleaseRepository: Repository<CorteReleaseEntity>,
  ) {}

  live(): LiveCheckResult {
    return { ok: true, msg: 'ok', data: { status: 'alive' } };
  }

  async ready(): Promise<ReadyCheckResult> {
    const active = await this.corteReleaseRepository.findOne({
      where: { status: CorteStatus.ACTIVATED },
    });

    if (!active) {
      return {
        ok: true,
        msg: 'Esperando el primer corte',
        data: { status: 'waiting_for_first_cut' },
      };
    }

    return {
      ok: true,
      msg: 'La información se obtuvo correctamente.',
      data: {
        status: 'ready',
        cutId: active.cutId,
        version: active.version,
        activatedAt: active.updatedAt.toISOString(),
      },
    };
  }

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
