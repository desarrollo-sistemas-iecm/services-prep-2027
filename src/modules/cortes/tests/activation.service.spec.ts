import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { ConfigService } from '@nestjs/config';
import { DataSource, Repository } from 'typeorm';
import { ActivationService } from '../services/activation.service';
import { CorteReleaseEntity } from '../entities/corte-release.entity';
import { CorteStatus } from '../enums/corte-status.enum';

describe('ActivationService', () => {
  let service: ActivationService;
  let corteReleaseRepository: jest.Mocked<
    Pick<Repository<CorteReleaseEntity>, 'findOne' | 'find'>
  >;
  let controlDataSource: { transaction: jest.Mock };
  let resultadosDataSource: {
    isInitialized: boolean;
    destroy: jest.Mock;
    initialize: jest.Mock;
    query: jest.Mock;
  };
  let configService: { getOrThrow: jest.Mock };
  let dataDir: string;
  let dbStoragePath: string;
  let stagingDir: string;

  const buildRelease = (
    overrides: Partial<CorteReleaseEntity> = {},
  ): CorteReleaseEntity => ({
    id: 1,
    cutId: 'corte-nuevo',
    version: '2.0',
    activationAt: new Date(Date.now() - 1000),
    status: CorteStatus.VALIDATED,
    fileSha256: 'hash',
    stagedFilePath: '',
    issuedBySubject: null,
    failureReason: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  });

  function stageFile(content: string): string {
    const stagedPath = path.join(stagingDir, 'corte.db3');
    fs.writeFileSync(stagedPath, content);
    return stagedPath;
  }

  beforeEach(() => {
    dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'activation-service-'));
    dbStoragePath = path.join(dataDir, 'database.db3');
    stagingDir = fs.mkdtempSync(path.join(os.tmpdir(), 'activation-staging-'));

    corteReleaseRepository = { findOne: jest.fn(), find: jest.fn() };

    const transactionalManager = {
      getRepository: jest.fn().mockReturnValue({
        update: jest.fn().mockResolvedValue(undefined),
        create: jest.fn((data: Record<string, unknown>) => data),
        save: jest.fn((data: Record<string, unknown>) =>
          Promise.resolve({ id: 99, ...data }),
        ),
      }),
    };
    controlDataSource = {
      transaction: jest.fn((callback: (manager: unknown) => unknown) =>
        callback(transactionalManager),
      ),
    };

    resultadosDataSource = {
      isInitialized: true,
      destroy: jest.fn().mockResolvedValue(undefined),
      initialize: jest.fn().mockResolvedValue(undefined),
      query: jest.fn().mockResolvedValue([{ count: 0 }]),
    };

    configService = { getOrThrow: jest.fn().mockReturnValue(dbStoragePath) };

    service = new ActivationService(
      controlDataSource as unknown as DataSource,
      corteReleaseRepository as unknown as Repository<CorteReleaseEntity>,
      resultadosDataSource as unknown as DataSource,
      configService as unknown as ConfigService,
    );
  });

  afterEach(() => {
    fs.rmSync(dataDir, { recursive: true, force: true });
    fs.rmSync(stagingDir, { recursive: true, force: true });
  });

  it('should activate a validated release when there is no previous active cut', async () => {
    const stagedPath = stageFile('contenido nuevo');
    const release = buildRelease({ stagedFilePath: stagedPath });
    corteReleaseRepository.findOne
      .mockResolvedValueOnce(release)
      .mockResolvedValueOnce(null);

    await service.activate(release.cutId);

    expect(fs.readFileSync(dbStoragePath, 'utf-8')).toBe('contenido nuevo');
    expect(resultadosDataSource.destroy).toHaveBeenCalled();
    expect(resultadosDataSource.initialize).toHaveBeenCalled();
    expect(controlDataSource.transaction).toHaveBeenCalled();
  });

  it('should archive the previous active file when activating a newer version', async () => {
    fs.writeFileSync(dbStoragePath, 'contenido anterior');
    const stagedPath = stageFile('contenido nuevo');
    const release = buildRelease({
      stagedFilePath: stagedPath,
      version: '2.0',
    });
    const previousActive = buildRelease({
      id: 2,
      cutId: 'corte-anterior',
      version: '1.0',
      status: CorteStatus.ACTIVATED,
    });
    corteReleaseRepository.findOne
      .mockResolvedValueOnce(release)
      .mockResolvedValueOnce(previousActive);

    await service.activate(release.cutId);

    const archiveDir = path.join(dataDir, 'archive');
    const archivedFiles = fs.readdirSync(archiveDir);
    expect(archivedFiles).toHaveLength(1);
    expect(
      fs.readFileSync(path.join(archiveDir, archivedFiles[0]), 'utf-8'),
    ).toBe('contenido anterior');
    expect(fs.readFileSync(dbStoragePath, 'utf-8')).toBe('contenido nuevo');
  });

  it('should mark the release as failed without touching files when its version is not newer than the active one', async () => {
    fs.writeFileSync(dbStoragePath, 'contenido anterior');
    const stagedPath = stageFile('contenido nuevo');
    const release = buildRelease({
      stagedFilePath: stagedPath,
      version: '1.0',
    });
    const previousActive = buildRelease({
      id: 2,
      cutId: 'corte-anterior',
      version: '1.0',
      status: CorteStatus.ACTIVATED,
    });
    corteReleaseRepository.findOne
      .mockResolvedValueOnce(release)
      .mockResolvedValueOnce(previousActive);

    await service.activate(release.cutId);

    expect(fs.readFileSync(dbStoragePath, 'utf-8')).toBe('contenido anterior');
    expect(resultadosDataSource.destroy).not.toHaveBeenCalled();
    expect(controlDataSource.transaction).toHaveBeenCalledTimes(1);
  });

  it('should restore the previous file and mark the release as failed when reinitializing the datasource fails', async () => {
    fs.writeFileSync(dbStoragePath, 'contenido anterior');
    const stagedPath = stageFile('contenido nuevo');
    const release = buildRelease({ stagedFilePath: stagedPath });
    corteReleaseRepository.findOne
      .mockResolvedValueOnce(release)
      .mockResolvedValueOnce(null);
    resultadosDataSource.initialize
      .mockRejectedValueOnce(new Error('no abre'))
      .mockResolvedValueOnce(undefined);

    await service.activate(release.cutId);

    expect(fs.readFileSync(dbStoragePath, 'utf-8')).toBe('contenido anterior');
    expect(resultadosDataSource.initialize).toHaveBeenCalledTimes(2);
  });

  it('should activate immediately, on module init, a validated release whose activation date already passed (recovery after restart)', async () => {
    const stagedPath = stageFile('contenido nuevo');
    const release = buildRelease({
      stagedFilePath: stagedPath,
      activationAt: new Date(Date.now() - 5000),
    });
    corteReleaseRepository.find.mockResolvedValue([release]);
    corteReleaseRepository.findOne
      .mockResolvedValueOnce(release)
      .mockResolvedValueOnce(null);

    await service.onModuleInit();

    expect(fs.readFileSync(dbStoragePath, 'utf-8')).toBe('contenido nuevo');
  });
});
