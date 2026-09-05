import {
  Injectable,
  UnauthorizedException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import {
  canonicalManifestPayload,
  ManifestDto,
  parseManifest,
} from '../dto/manifest.dto';
import { UploadCorteDto } from '../dto/upload-corte.dto';

@Injectable()
export class ManifestVerificationService {
  constructor(private readonly configService: ConfigService) {}

  /**
   * Verifica el hash del archivo, la firma HMAC-SHA256 (v1, secreto compartido)
   * y que los campos del multipart coincidan con los del manifest.
   */
  verify(
    rawManifest: string,
    dto: UploadCorteDto,
    fileSha256: string,
  ): ManifestDto {
    const manifest = parseManifest(rawManifest);

    if (
      manifest.cutId !== dto.cutId ||
      manifest.version !== dto.version ||
      manifest.activationAt !== dto.activationAt
    ) {
      throw new UnprocessableEntityException(
        'El manifest no coincide con los campos enviados en el formulario',
      );
    }

    if (manifest.sha256 !== fileSha256) {
      throw new UnprocessableEntityException(
        'El sha256 del manifest no coincide con el archivo recibido',
      );
    }

    const secret = this.configService.getOrThrow<string>(
      'CORTES_MANIFEST_HMAC_SECRET',
    );
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(canonicalManifestPayload(manifest))
      .digest('hex');

    const expected = Buffer.from(expectedSignature, 'hex');
    const received = Buffer.from(manifest.signature, 'hex');

    if (
      expected.length !== received.length ||
      !crypto.timingSafeEqual(expected, received)
    ) {
      throw new UnauthorizedException('La firma del manifest no es válida');
    }

    return manifest;
  }
}
