import { ApiProperty } from '@nestjs/swagger';
import { IsISO8601, IsString, Length, Matches } from 'class-validator';

export class UploadCorteDto {
  @ApiProperty({
    description:
      'Identificador único del corte, usado como clave de idempotencia',
    example: 'corte-2026-09-05-01',
  })
  @IsString()
  @Matches(/^[a-zA-Z0-9_-]{1,64}$/, {
    message:
      'cutId solo admite letras, números, guiones y guiones bajos (máx. 64 caracteres)',
  })
  cutId: string;

  @ApiProperty({ description: 'Versión o número del corte', example: '1.0' })
  @IsString()
  @Length(1, 32)
  version: string;

  @ApiProperty({
    description: 'Fecha/hora programada de activación (ISO 8601)',
    example: '2026-09-06T15:00:00Z',
  })
  @IsISO8601()
  activationAt: string;

  @ApiProperty({
    description: 'Manifiesto firmado como cadena JSON',
    type: String,
  })
  @IsString()
  manifest: string;
}
