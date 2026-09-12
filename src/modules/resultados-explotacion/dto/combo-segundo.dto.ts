import { ApiProperty } from '@nestjs/swagger';
import { IsInt } from 'class-validator';
import { TipoEleccionDto } from './tipo-eleccion.dto';

export class ComboSegundoDto extends TipoEleccionDto {
  @ApiProperty({
    description:
      'Id de distrito (JG/DMR/RP) o delegación (ALC) elegido en el primer combo',
    example: 1,
  })
  @IsInt()
  seleccion: number;
}
