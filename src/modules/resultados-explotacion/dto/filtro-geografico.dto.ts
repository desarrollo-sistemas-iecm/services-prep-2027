import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';
import { TipoEleccionDto } from './tipo-eleccion.dto';

/** Filtro por distrito/alcaldía, sección y casilla del sidebar; `0`/`null` = sin filtrar. */
export class FiltroGeograficoDto extends TipoEleccionDto {
  @ApiPropertyOptional({
    description: 'Id de distrito o delegación a filtrar',
    default: 0,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  dist_o_alcaldia?: number = 0;

  @ApiPropertyOptional({ description: 'Id de sección a filtrar', default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  seccion?: number = 0;

  @ApiPropertyOptional({
    description: 'Tipo de casilla a filtrar (ej. B01)',
    nullable: true,
  })
  @IsOptional()
  @IsString()
  @MaxLength(10)
  casilla?: string | null = null;
}
