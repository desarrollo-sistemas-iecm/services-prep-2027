import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsBoolean, IsInt, IsOptional, IsString } from 'class-validator';
import { TipoEleccionDto } from './tipo-eleccion.dto';

export class GraficaQueryDto extends TipoEleccionDto {
  @ApiPropertyOptional({
    description: 'Id de distrito o delegación a filtrar',
    default: 0,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  dist_o_alcaldia?: number = 0;

  @ApiPropertyOptional({ description: 'Id de sección a filtrar', default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  seccion?: number = 0;

  @ApiPropertyOptional({
    description: 'Tipo de casilla a filtrar',
    nullable: true,
  })
  @IsOptional()
  @IsString()
  casilla?: string | null = null;

  @ApiPropertyOptional({
    description: 'Incluir candidatos no registrados y votos nulos',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  mostrar_no_reg_y_nulos?: boolean = false;

  @ApiPropertyOptional({
    description:
      'true para "Votos por Partido Político": un renglón por partido, repartiendo entre sus integrantes los votos de las combinaciones de coalición o candidatura común',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  es_distribucion?: boolean = false;
}
