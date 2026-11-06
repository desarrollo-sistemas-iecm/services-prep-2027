import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PrepVotosEntity } from '../../resultados-legacy/entities/prep-votos.entity';
import { ScdCasillasEntity } from '../../resultados-legacy/entities/scd-casillas.entity';
import { TipoEleccion } from '../enums/tipo-eleccion.enum';
import { formatearPorcentaje } from '../utils/porcentaje.util';
import { condicionActaValidada } from '../utils/acta-validada.util';
import {
  aplicarFiltroGeografico,
  FiltroGeografico,
  SIN_FILTRO_GEOGRAFICO,
} from '../utils/filtro-geografico.util';
import { TipoEleccionCatalogoService } from './tipo-eleccion-catalogo.service';

export interface ResumenVotacionPayload {
  votos_acumulados: number;
  candidatos_no_reg: number;
  nulos: number;
  total: number;
  votos_acumulados_por: string;
  votos_sin_especiales: number;
  votos_especiales: number;
  suma_esp_s_esp: number;
  candidatos_no_reg_por: string;
  nulos_por: string;
  total_por: string;
  porcentaje_votos_acumulados: string;
}

interface AgregadoVotos {
  total: string | number | null;
  candidatosNoReg: string | number | null;
  nulos: string | number | null;
  listaNominal: string | number | null;
}

/**
 * Equivalente a `resumen_jg/_alc/_dmr/_rp` de `api_avance_entidad.php`
 * (docs/CONSULTAS_SQL_PREP2024.md §1.2, join `prep_votos`↔`scd_casillas`
 * agrupado por `id_tipo_eleccion`, filtrado por `contabilizar='T'`) más el
 * desglose "sin especiales"/"especiales" de §1.5/§1.6. Como
 * `actas_resumen_data.php` (2024, parámetros `item`/`item_2`/`item_3`), se
 * puede acotar a un distrito/alcaldía, sección o casilla.
 *
 * CORRECCIÓN respecto al doc fuente: §1.5/§1.6 etiquetan `tipo_casilla`
 * empieza con `S` como "casillas normales" y lo demás como "especiales" —
 * invertido. Verificado contra `cat_tipo_casilla` (catálogo real: B, C, S,
 * P, A, M) y la terminología electoral estándar del IECM: `S` = Casilla
 * Especial; `B`/`C` (Básica/Contigua) son las casillas normales. Confirmado
 * también empíricamente contra `data/database.db3` (corte real de 2024): con
 * la condición del doc tal cual, `votos_sin_especiales` daba 0 y
 * `votos_especiales` el 100% de los votos capturados, lo cual es
 * estructuralmente imposible en una elección real. Aquí el filtro SQL es el
 * mismo que documenta el PHP 2024; solo se corrigió a qué campo
 * (`sin especiales` vs `especiales`) se asigna cada resultado.
 *
 * TODO: el documento fuente no especifica la fórmula exacta de
 * `votos_acumulados_por` / `porcentaje_votos_acumulados` (dos campos de
 * porcentaje con nombre similar). Aquí `*_por` se calcula sobre `total`
 * (votación total) y `porcentaje_votos_acumulados` sobre la lista nominal
 * (`ln`) — confirmar contra un corte real de 2024 antes de usarlo en
 * producción electoral.
 */
@Injectable()
export class ResumenVotacionService {
  constructor(
    @InjectRepository(PrepVotosEntity, 'resultados')
    private readonly votosRepo: Repository<PrepVotosEntity>,
    private readonly catalogo: TipoEleccionCatalogoService,
  ) {}

  async obtener(
    type: TipoEleccion,
    filtro: FiltroGeografico = SIN_FILTRO_GEOGRAFICO,
  ): Promise<{ success: boolean; resumen_votacion: ResumenVotacionPayload }> {
    const base = () =>
      aplicarFiltroGeografico(
        this.votosRepo
          .createQueryBuilder('p')
          .leftJoin(
            ScdCasillasEntity,
            'c',
            'p.idDistrito = c.idDistrito AND p.idDelegacion = c.idDelegacion AND p.idSeccion = c.idSeccion AND p.tipoCasilla = c.tipoCasilla',
          )
          .where('p.contabilizar = :contabilizar', { contabilizar: 'T' })
          .andWhere(condicionActaValidada('p.validado'))
          .andWhere('p.idTipoEleccion = :type', { type }),
        'p',
        this.catalogo.geoColumn(type),
        filtro,
      );

    const totales = await base()
      .select('SUM(p.votacionTotal)', 'total')
      .addSelect('SUM(p.votosCandNoReg)', 'candidatosNoReg')
      .addSelect('SUM(p.votosNulos)', 'nulos')
      .addSelect('SUM(c.listaNominal)', 'listaNominal')
      .getRawOne<AgregadoVotos>();

    // `S` = Casilla Especial (ver corrección documentada arriba).
    const especiales = await base()
      .andWhere("substr(p.tipoCasilla, 1, 1) = 'S'")
      .select('SUM(p.votacionTotal)', 'total')
      .getRawOne<{ total: string | number | null }>();

    const sinEspeciales = await base()
      .andWhere("substr(p.tipoCasilla, 1, 1) <> 'S'")
      .select('SUM(p.votacionTotal)', 'total')
      .getRawOne<{ total: string | number | null }>();

    const total = Number(totales?.total ?? 0);
    const candidatosNoReg = Number(totales?.candidatosNoReg ?? 0);
    const nulos = Number(totales?.nulos ?? 0);
    const listaNominal = Number(totales?.listaNominal ?? 0);
    const votosAcumulados = total - candidatosNoReg - nulos;
    const votosSinEspeciales = Number(sinEspeciales?.total ?? 0);
    const votosEspeciales = Number(especiales?.total ?? 0);

    return {
      success: true,
      resumen_votacion: {
        votos_acumulados: votosAcumulados,
        candidatos_no_reg: candidatosNoReg,
        nulos,
        total,
        votos_acumulados_por: formatearPorcentaje(votosAcumulados, total),
        votos_sin_especiales: votosSinEspeciales,
        votos_especiales: votosEspeciales,
        suma_esp_s_esp: votosSinEspeciales + votosEspeciales,
        candidatos_no_reg_por: formatearPorcentaje(candidatosNoReg, total),
        nulos_por: formatearPorcentaje(nulos, total),
        total_por: formatearPorcentaje(total, total),
        porcentaje_votos_acumulados: formatearPorcentaje(
          votosAcumulados,
          listaNominal,
        ),
      },
    };
  }
}
