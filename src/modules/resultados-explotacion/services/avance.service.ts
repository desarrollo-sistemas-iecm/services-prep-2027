import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PrepVotosEntity } from '../../resultados-legacy/entities/prep-votos.entity';
import { ScdCasillasEntity } from '../../resultados-legacy/entities/scd-casillas.entity';
import { CorteLegacyEntity } from '../../resultados-legacy/entities/corte-legacy.entity';
import { TipoEleccion } from '../enums/tipo-eleccion.enum';
import { formatearPorcentaje } from '../utils/porcentaje.util';

export interface AvancePayload {
  actas_capturadas: number;
  actas_capturadas_de: number;
  actas_cap_porcen: string;
  participacion_porcen: string;
  ln: number;
}

export interface CortePayload {
  corte_fecha: string | null;
  corte_hora: string | null;
  dia: string | null;
  mes: string | null;
  anio: number | null;
  hora: string | null;
  minuto: string | null;
  segundo: string | null;
}

interface AgregadoAvance {
  cuantos: string | number | null;
  ln: string | number | null;
  votacionTotal: string | number | null;
}

/**
 * Equivalente a `avance_jg/_alc/_dmr/_rp` de `api_avance_entidad.php`
 * (docs/CONSULTAS_SQL_PREP2024.md §1.3 "capturadas" para el numerador,
 * §1.1 "esperadas" para el denominador global, §1.9 para `corte`).
 *
 * TODO (pendiente, documentado a petición explícita — no confirmado contra
 * un corte real del proceso vigente):
 * - El PHP 2024 aplicaba dos ajustes manuales marcados `OJO!!!` en el
 *   backend original: para DMR (`type=2`) sumaba un número fijo de actas de
 *   RP (`+44`, hardcodeado para el corte de mayo 2024) y para ALC restaba 1
 *   acta de voto extranjero del denominador `actas_capturadas_de`. Aquí se
 *   preserva la intención (DMR combina datos de RP; ALC descuenta 1 acta)
 *   pero el "+44" se reemplaza por una suma real vía
 *   `id_tipo_eleccion IN (2,3)` en vez de repetir el número mágico del
 *   corte 2024. Falta confirmar con el equipo si este ajuste sigue vigente
 *   para el proceso actual.
 * - La fórmula exacta de `participacion_porcen` no está en el SQL extraído;
 *   aquí se calcula como `SUM(votacion_total) / ln`. Confirmar antes de
 *   usarse como dato oficial.
 */
@Injectable()
export class AvanceService {
  constructor(
    @InjectRepository(PrepVotosEntity, 'resultados')
    private readonly votosRepo: Repository<PrepVotosEntity>,
    @InjectRepository(ScdCasillasEntity, 'resultados')
    private readonly casillasRepo: Repository<ScdCasillasEntity>,
    @InjectRepository(CorteLegacyEntity, 'resultados')
    private readonly corteRepo: Repository<CorteLegacyEntity>,
  ) {}

  async obtener(
    type: TipoEleccion,
  ): Promise<{ succes: boolean; avance: AvancePayload; corte: CortePayload }> {
    const tiposEleccionAAgregar =
      type === TipoEleccion.DIPUTACION_MR
        ? [TipoEleccion.DIPUTACION_MR, TipoEleccion.REPRESENTACION_PROPORCIONAL]
        : [type];

    const agregado = await this.votosRepo
      .createQueryBuilder('p')
      .leftJoin(
        ScdCasillasEntity,
        'c',
        'p.idDistrito = c.idDistrito AND p.idDelegacion = c.idDelegacion AND p.idSeccion = c.idSeccion AND p.tipoCasilla = c.tipoCasilla',
      )
      .select('COUNT(c.idDistrito)', 'cuantos')
      .addSelect('SUM(c.listaNominal)', 'ln')
      .addSelect('SUM(p.votacionTotal)', 'votacionTotal')
      .where('p.idTipoEleccion IN (:...tipos)', {
        tipos: tiposEleccionAAgregar,
      })
      .getRawOne<AgregadoAvance>();

    const esperadas = await this.casillasRepo
      .createQueryBuilder('c')
      .select('COUNT(c.estatus)', 'cuantos')
      .where("c.estatus = 'T'")
      .getRawOne<{ cuantos: string | number }>();

    const actasCapturadas = Number(agregado?.cuantos ?? 0);
    const ln = Number(agregado?.ln ?? 0);
    const votacionTotal = Number(agregado?.votacionTotal ?? 0);

    // Ajuste heredado del PHP 2024 (ver TODO de la clase): ALC descuenta 1
    // acta de voto en el extranjero del total de actas esperadas.
    const ajusteAlcExtranjero = type === TipoEleccion.ALCALDIA ? 1 : 0;
    const actasCapturadasDe =
      Number(esperadas?.cuantos ?? 0) - ajusteAlcExtranjero;

    const corteRow = await this.corteRepo.createQueryBuilder('c').getOne();

    return {
      succes: true,
      avance: {
        actas_capturadas: actasCapturadas,
        actas_capturadas_de: actasCapturadasDe,
        actas_cap_porcen: formatearPorcentaje(
          actasCapturadas,
          actasCapturadasDe,
        ),
        participacion_porcen: formatearPorcentaje(votacionTotal, ln),
        ln,
      },
      corte: {
        corte_fecha: corteRow?.corteFecha ?? null,
        corte_hora: corteRow?.corteHora ?? null,
        dia: corteRow?.dia ?? null,
        mes: corteRow?.mes ?? null,
        anio: corteRow?.anio ?? null,
        hora: corteRow?.hora ?? null,
        minuto: corteRow?.minuto ?? null,
        segundo: corteRow?.segundo ?? null,
      },
    };
  }
}
