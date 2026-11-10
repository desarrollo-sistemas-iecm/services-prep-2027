import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, Min } from 'class-validator';
import { ComboSegundoDto } from './combo-segundo.dto';

/**
 * Body de `/distribucion`. A diferencia de `ComboTerceroDto`, `seccion` es
 * opcional: la vista "Detalle por Casilla" a nivel distrito/alcaldía lista
 * todas las casillas sin sección elegida, igual que `actas_grid_data.php`
 * con `item_2` vacío.
 */
export class DistribucionQueryDto extends ComboSegundoDto {
  @ApiPropertyOptional({
    description:
      'Id de sección; si se omite, regresa todas las casillas del distrito/alcaldía',
    example: 101,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  seccion?: number;
}
