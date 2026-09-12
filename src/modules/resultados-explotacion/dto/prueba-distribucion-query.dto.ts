import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional } from 'class-validator';
import { GraficaQueryDto } from './grafica-query.dto';

export class PruebaDistribucionQueryDto extends GraficaQueryDto {
  @ApiPropertyOptional({
    description:
      'true si la respuesta se usa para la vista de distribución por representación proporcional',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  es_distribucion?: boolean = false;
}
