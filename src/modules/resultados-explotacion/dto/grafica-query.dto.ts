import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional } from 'class-validator';
import { FiltroGeograficoDto } from './filtro-geografico.dto';

export class GraficaQueryDto extends FiltroGeograficoDto {
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
