import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, Min } from 'class-validator';

export class ActasRpDto {
  @ApiPropertyOptional({
    description:
      'Id de distrito a filtrar; si se omite, regresa las actas RP de toda la entidad',
    example: 5,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  seleccion?: number;
}
