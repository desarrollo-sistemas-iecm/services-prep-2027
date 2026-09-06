import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { getRepositoryToken } from '@nestjs/typeorm';
import * as fs from 'fs';
import * as sqlite3 from 'sqlite3';
import { HealthService } from '../services/health.service';
import { CorteReleaseEntity } from '../../cortes/entities/corte-release.entity';
import { CorteStatus } from '../../cortes/enums/corte-status.enum';

jest.mock('fs');
jest.mock('sqlite3', () => ({
  Database: jest.fn(),
  OPEN_READONLY: 1,
}));

describe('HealthService', () => {
  let service: HealthService;
  let corteReleaseRepository: { findOne: jest.Mock };
  const mockedFs = fs as jest.Mocked<typeof fs>;

  beforeEach(async () => {
    jest.clearAllMocks();
    corteReleaseRepository = { findOne: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        HealthService,
        {
          provide: ConfigService,
          useValue: { get: () => './data/database.db3' },
        },
        {
          provide: getRepositoryToken(CorteReleaseEntity, 'control'),
          useValue: corteReleaseRepository,
        },
      ],
    }).compile();

    service = module.get(HealthService);
  });

  it('should report status alive on live()', () => {
    expect(service.live()).toEqual({
      ok: true,
      msg: 'ok',
      data: { status: 'alive' },
    });
  });

  it('should report waiting_for_first_cut when no release is activated', async () => {
    corteReleaseRepository.findOne.mockResolvedValue(null);

    const result = await service.ready();

    expect(result.data).toEqual({ status: 'waiting_for_first_cut' });
  });

  it('should report ready with the active cut details when one is activated', async () => {
    corteReleaseRepository.findOne.mockResolvedValue({
      cutId: 'corte-1',
      version: '1.0',
      status: CorteStatus.ACTIVATED,
      updatedAt: new Date('2026-09-05T18:05:00.000Z'),
    });

    const result = await service.ready();

    expect(result.data).toEqual({
      status: 'ready',
      cutId: 'corte-1',
      version: '1.0',
      activatedAt: '2026-09-05T18:05:00.000Z',
    });
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
