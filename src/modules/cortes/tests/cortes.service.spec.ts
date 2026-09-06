import { ConflictException } from '@nestjs/common';
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { DataSource, Repository } from 'typeorm';
import { CortesService } from '../services/cortes.service';
import { ManifestVerificationService } from '../services/manifest-verification.service';
import { SqliteFileValidationService } from '../services/sqlite-file-validation.service';
import { ActivationService } from '../services/activation.service';
import { CorteReleaseEntity } from '../entities/corte-release.entity';
import { CorteStatus } from '../enums/corte-status.enum';
import { UploadCorteDto } from '../dto/upload-corte.dto';

describe('CortesService', () => {
  let service: CortesService;
  let corteReleaseRepository: jest.Mocked<
    Pick<Repository<CorteReleaseEntity>, 'findOne'>
  >;
  let controlDataSource: { transaction: jest.Mock };
  let manifestVerificationService: jest.Mocked<
    Pick<ManifestVerificationService, 'verify'>
  >;
  let sqliteFileValidationService: jest.Mocked<
    Pick<SqliteFileValidationService, 'validate'>
  >;
  let activationService: jest.Mocked<
    Pick<ActivationService, 'scheduleOrActivate'>
  >;
  let stagedFilePath: string;

  const dto: UploadCorteDto = {
    cutId: 'corte-1',
    version: '1.0',
    activationAt: '2026-09-06T15:00:00.000Z',
    manifest: '{}',
  };

  beforeEach(() => {
    stagedFilePath = path.join(
      fs.mkdtempSync(path.join(os.tmpdir(), 'cortes-service-')),
      'db.db3',
    );
    fs.writeFileSync(stagedFilePath, 'contenido de prueba');

    corteReleaseRepository = { findOne: jest.fn() };

    const transactionalManager = {
      getRepository: jest.fn().mockReturnValue({
        create: jest.fn((data: Record<string, unknown>) => data),
        save: jest.fn((data: Record<string, unknown>) =>
          Promise.resolve({ id: 1, ...data }),
        ),
        update: jest.fn().mockResolvedValue(undefined),
      }),
    };
    controlDataSource = {
      transaction: jest.fn((callback: (manager: unknown) => unknown) =>
        callback(transactionalManager),
      ),
    };

    manifestVerificationService = { verify: jest.fn() };
    sqliteFileValidationService = {
      validate: jest.fn().mockResolvedValue({ valid: true }),
    };
    activationService = {
      scheduleOrActivate: jest.fn().mockResolvedValue(undefined),
    };

    service = new CortesService(
      controlDataSource as unknown as DataSource,
      corteReleaseRepository as unknown as Repository<CorteReleaseEntity>,
      manifestVerificationService as unknown as ManifestVerificationService,
      sqliteFileValidationService as unknown as SqliteFileValidationService,
      activationService as unknown as ActivationService,
    );
  });

  it('should create a new release and return status uploaded on first upload', async () => {
    corteReleaseRepository.findOne.mockResolvedValue(null);

    const outcome = await service.upload(dto, stagedFilePath, 'difusor-1');

    expect(outcome).toEqual({
      cutId: 'corte-1',
      status: CorteStatus.UPLOADED,
      reused: false,
    });
    expect(manifestVerificationService.verify).toHaveBeenCalled();
  });

  it('should return the existing status idempotently when the same cutId and file hash are replayed', async () => {
    const existing = {
      cutId: 'corte-1',
      fileSha256: crypto
        .createHash('sha256')
        .update('contenido de prueba')
        .digest('hex'),
      status: CorteStatus.VALIDATED,
    };
    corteReleaseRepository.findOne.mockResolvedValue(
      existing as CorteReleaseEntity,
    );

    const outcome = await service.upload(dto, stagedFilePath, 'difusor-1');

    expect(outcome).toEqual({
      cutId: 'corte-1',
      status: CorteStatus.VALIDATED,
      reused: true,
    });
    expect(manifestVerificationService.verify).not.toHaveBeenCalled();
  });

  it('should reject with 409 when the same cutId arrives with a different file', async () => {
    corteReleaseRepository.findOne.mockResolvedValue({
      cutId: 'corte-1',
      fileSha256: 'a-different-hash',
      status: CorteStatus.UPLOADED,
    } as CorteReleaseEntity);

    await expect(
      service.upload(dto, stagedFilePath, 'difusor-1'),
    ).rejects.toThrow(ConflictException);
  });

  it('should return null when there is no release for the given cutId', async () => {
    corteReleaseRepository.findOne.mockResolvedValue(null);

    const result = await service.getStatus('unknown');

    expect(result).toBeNull();
  });
});
