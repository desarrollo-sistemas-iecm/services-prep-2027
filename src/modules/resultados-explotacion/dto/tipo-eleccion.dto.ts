import { ApiProperty } from '@nestjs/swagger';
import { IsIn } from 'class-validator';
import {
  TIPOS_ELECCION_VALIDOS,
  TipoEleccion,
} from '../enums/tipo-eleccion.enum';

export class TipoEleccionDto {
  @ApiProperty({
    description:
      'Tipo de elección: 1=Jefatura de Gobierno, 2=Diputación MR, 3=Representación Proporcional, 4=Alcaldía',
    enum: TIPOS_ELECCION_VALIDOS,
    example: TipoEleccion.JEFATURA_GOBIERNO,
  })
  @IsIn(TIPOS_ELECCION_VALIDOS, {
    message: `type debe ser uno de: ${TIPOS_ELECCION_VALIDOS.join(', ')}`,
  })
  type: TipoEleccion;
}
