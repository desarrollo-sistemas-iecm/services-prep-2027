import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, Min } from 'class-validator';

export class BusquedaSeccionDto {
  @ApiProperty({
    description: 'Número de sección electoral a buscar',
    example: 101,
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  seccion: number;
}
