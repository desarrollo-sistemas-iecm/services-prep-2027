import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as sqlite3 from 'sqlite3';
import { HealthService } from '../services/health.service';

jest.mock('fs');
jest.mock('sqlite3', () => ({
  Database: jest.fn(),
  OPEN_READONLY: 1,
}));

describe('HealthService', () => {
  let service: HealthService;
  const mockedFs = fs as jest.Mocked<typeof fs>;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        HealthService,
        {
          provide: ConfigService,
          useValue: { get: () => './data/database.db3' },
        },
      ],
    }).compile();

    service = module.get(HealthService);
  });

  it('should report db_integrity missing when the database file does not exist', async () => {
    mockedFs.existsSync.mockReturnValue(false);

    const result = await service.check();

    expect(result).toEqual({
      ok: true,
      msg: 'ok',
      checks: { app: true, db_exists: false, db_integrity: 'missing' },
    });
  });

  it('should report db_integrity ok when PRAGMA integrity_check returns ok', async () => {
    mockedFs.existsSync.mockReturnValue(true);
    mockSqliteDatabase({
      openError: null,
      integrityRow: { integrity_check: 'ok' },
    });

    const result = await service.check();

    expect(result.checks).toEqual({
      app: true,
      db_exists: true,
      db_integrity: 'ok',
    });
  });

  it('should report db_integrity fail when PRAGMA integrity_check does not return ok', async () => {
    mockedFs.existsSync.mockReturnValue(true);
    mockSqliteDatabase({
      openError: null,
      integrityRow: { integrity_check: 'corruption found' },
    });

    const result = await service.check();

    expect(result.checks.db_integrity).toBe('fail');
  });

  it('should report db_integrity fail when the file cannot be opened read-only', async () => {
    mockedFs.existsSync.mockReturnValue(true);
    mockSqliteDatabase({
      openError: new Error('cannot open'),
      integrityRow: null,
    });

    const result = await service.check();

    expect(result.checks.db_integrity).toBe('fail');
  });

  it('should not hang and report timeout when integrity_check never resolves', async () => {
    jest.useFakeTimers();
    mockedFs.existsSync.mockReturnValue(true);
    mockSqliteDatabase({
      openError: null,
      integrityRow: null,
      neverResolve: true,
    });

    const resultPromise = service.check();
    await jest.advanceTimersByTimeAsync(3000);
    const result = await resultPromise;

    expect(result.checks.db_integrity).toBe('timeout');
    jest.useRealTimers();
  });

  function mockSqliteDatabase(options: {
    openError: Error | null;
    integrityRow: { integrity_check: string } | null;
    neverResolve?: boolean;
  }) {
    const close = jest.fn();
    const get = jest.fn(
      (_sql: string, callback: (err: Error | null, row: unknown) => void) => {
        if (options.neverResolve) return;
        setImmediate(() => callback(null, options.integrityRow));
      },
    );

    (sqlite3.Database as unknown as jest.Mock).mockImplementation(
      (_path: string, _mode: number, callback: (err: Error | null) => void) => {
        setImmediate(() => callback(options.openError));
        return { get, close };
      },
    );
  }
});
