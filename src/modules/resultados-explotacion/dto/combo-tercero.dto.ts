import { ApiProperty } from '@nestjs/swagger';
import { IsInt } from 'class-validator';
import { ComboSegundoDto } from './combo-segundo.dto';

export class ComboTerceroDto extends ComboSegundoDto {
  @ApiProperty({
    description: 'Id de sección elegida en el segundo combo',
    example: 101,
  })
  @IsInt()
  seccion: number;
}
