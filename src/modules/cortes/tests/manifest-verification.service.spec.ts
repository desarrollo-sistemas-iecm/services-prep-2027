import {
  UnauthorizedException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import { ManifestVerificationService } from '../services/manifest-verification.service';
import { canonicalManifestPayload } from '../dto/manifest.dto';
import { UploadCorteDto } from '../dto/upload-corte.dto';

const SECRET = 'a-very-long-shared-secret-1234567890';

function buildDto(overrides: Partial<UploadCorteDto> = {}): UploadCorteDto {
  return {
    cutId: 'corte-1',
    version: '1.0',
    activationAt: '2026-09-06T15:00:00.000Z',
    manifest: '',
    ...overrides,
  };
}

function sign(payload: Record<string, string>): string {
  return crypto
    .createHmac('sha256', SECRET)
    .update(canonicalManifestPayload(payload as never))
    .digest('hex');
}

function buildManifest(
  overrides: Record<string, string> = {},
  sha256 = 'a'.repeat(64),
) {
  const base = {
    cutId: 'corte-1',
    version: '1.0',
    activationAt: '2026-09-06T15:00:00.000Z',
    sha256,
    generatedAt: '2026-09-05T10:00:00.000Z',
    signatureAlgorithm: 'HMAC-SHA256',
    ...overrides,
  };
  const signature = sign(base);
  return JSON.stringify({ ...base, signature });
}

describe('ManifestVerificationService', () => {
  let service: ManifestVerificationService;

  beforeEach(() => {
    const configService = {
      getOrThrow: () => SECRET,
    } as unknown as ConfigService;
    service = new ManifestVerificationService(configService);
  });

  it('should accept a manifest with matching hash, signature and fields', () => {
    const sha256 = 'b'.repeat(64);
    const rawManifest = buildManifest({}, sha256);

    const manifest = service.verify(rawManifest, buildDto(), sha256);

    expect(manifest.cutId).toBe('corte-1');
  });

  it('should reject when the sha256 does not match the uploaded file', () => {
    const rawManifest = buildManifest({}, 'b'.repeat(64));

    expect(() =>
      service.verify(rawManifest, buildDto(), 'c'.repeat(64)),
    ).toThrow(UnprocessableEntityException);
  });

  it('should reject when cutId/version/activationAt do not match the multipart fields', () => {
    const sha256 = 'b'.repeat(64);
    const rawManifest = buildManifest({ version: '2.0' }, sha256);

    expect(() => service.verify(rawManifest, buildDto(), sha256)).toThrow(
      UnprocessableEntityException,
    );
  });

  it('should reject when the HMAC signature is invalid', () => {
    const sha256 = 'b'.repeat(64);
    const manifestObject = JSON.parse(buildManifest({}, sha256)) as Record<
      string,
      string
    >;
    manifestObject.signature = 'f'.repeat(64);

    expect(() =>
      service.verify(JSON.stringify(manifestObject), buildDto(), sha256),
    ).toThrow(UnauthorizedException);
  });
});
