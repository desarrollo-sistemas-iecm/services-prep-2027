import { plainToInstance } from 'class-transformer';
import {
  IsIn,
  IsISO8601,
  IsString,
  Length,
  Matches,
  validateSync,
} from 'class-validator';
import { BadRequestException } from '@nestjs/common';

export class ManifestDto {
  @IsString()
  @Matches(/^[a-zA-Z0-9_-]{1,64}$/)
  cutId: string;

  @IsString()
  @Length(1, 32)
  version: string;

  @IsISO8601()
  activationAt: string;

  @IsString()
  @Matches(/^[a-f0-9]{64}$/, {
    message: 'sha256 debe ser un hex de 64 caracteres',
  })
  sha256: string;

  @IsISO8601()
  generatedAt: string;

  @IsIn(['HMAC-SHA256'])
  signatureAlgorithm: string;

  @IsString()
  @Matches(/^[a-f0-9]{64}$/, {
    message: 'signature debe ser un HMAC-SHA256 en hex',
  })
  signature: string;
}

/**
 * Campos del manifiesto usados para calcular la firma, en orden canónico fijo.
 * Deben coincidir exactamente con lo que firma el difusor.
 */
export function canonicalManifestPayload(
  manifest: Omit<ManifestDto, 'signature'>,
): string {
  return JSON.stringify({
    cutId: manifest.cutId,
    version: manifest.version,
    activationAt: manifest.activationAt,
    sha256: manifest.sha256,
    generatedAt: manifest.generatedAt,
    signatureAlgorithm: manifest.signatureAlgorithm,
  });
}

export function parseManifest(rawManifest: string): ManifestDto {
  let parsed: unknown;
  try {
    parsed = JSON.parse(rawManifest);
  } catch {
    throw new BadRequestException('El manifest no es un JSON válido');
  }

  const manifest = plainToInstance(ManifestDto, parsed, {
    excludeExtraneousValues: false,
  });

  const errors = validateSync(manifest, {
    whitelist: true,
    forbidNonWhitelisted: true,
  });
  if (errors.length > 0) {
    throw new BadRequestException('El manifest no cumple el esquema esperado');
  }

  return manifest;
}
