import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TipoEleccion } from '../enums/tipo-eleccion.enum';
import { TipoEleccionCatalogoService } from './tipo-eleccion-catalogo.service';
import { CainCatDistritoEntity } from '../../resultados-legacy/entities/cain-cat-distrito.entity';
import { CainCatDelegacionEntity } from '../../resultados-legacy/entities/cain-cat-delegacion.entity';
import { ScdCasillasEntity } from '../../resultados-legacy/entities/scd-casillas.entity';

export interface OpcionCombo {
  id: number | string;
  name: number | string;
}

/**
 * Combos en cascada del sidebar (distrito/alcaldía → sección → tipo de
 * casilla). Migrados desde `api_categories.php` (catálogo hardcodeado en el
 * PHP 2024) para servir el catálogo real ya disponible en
 * `cain_cat_distrito`/`cain_cat_delegacion` — decisión tomada explícitamente
 * en vez de replicar el hardcode. Ver `docs/CONSULTAS_SQL_PREP2024.md` §10-12.
 */
@Injectable()
export class CombosService {
  constructor(
    @InjectRepository(CainCatDistritoEntity, 'resultados')
    private readonly distritoRepo: Repository<CainCatDistritoEntity>,
    @InjectRepository(CainCatDelegacionEntity, 'resultados')
    private readonly delegacionRepo: Repository<CainCatDelegacionEntity>,
    @InjectRepository(ScdCasillasEntity, 'resultados')
    private readonly casillasRepo: Repository<ScdCasillasEntity>,
    private readonly catalogo: TipoEleccionCatalogoService,
  ) {}

  async primero(type: TipoEleccion): Promise<{ categories: OpcionCombo[] }> {
    if (this.catalogo.geoColumnCombo(type) === 'id_distrito') {
      const rows = await this.distritoRepo
        .createQueryBuilder('d')
        .select('DISTINCT d.idDistrito', 'idDistrito')
        .orderBy('d.idDistrito', 'ASC')
        .getRawMany<{ idDistrito: number }>();

      return {
        categories: rows
          .filter((r) => r.idDistrito != null)
          .map((r) => ({ id: r.idDistrito, name: `Distrito ${r.idDistrito}` })),
      };
    }

    const rows = await this.delegacionRepo
      .createQueryBuilder('d')
      .select('d.idDelegacion', 'idDelegacion')
      .addSelect('d.nombreDelegacion', 'nombreDelegacion')
      .orderBy('d.idDelegacion', 'ASC')
      .getRawMany<{ idDelegacion: number; nombreDelegacion: string | null }>();

    return {
      categories: rows
        .filter((r) => r.idDelegacion != null)
        .map((r) => ({
          id: r.idDelegacion,
          name: r.nombreDelegacion ?? `Alcaldía ${r.idDelegacion}`,
        })),
    };
  }

  async segundo(
    type: TipoEleccion,
    seleccion: number,
  ): Promise<{
    subcategories: OpcionCombo[];
    estado: { reg_data: number; reg_cat: number; error: number }[];
  }> {
    const geoColumn = this.catalogo.geoColumnCombo(type);
    const qb = this.casillasRepo
      .createQueryBuilder('c')
      .select('DISTINCT c.idSeccion', 'idSeccion')
      .orderBy('c.idSeccion', 'ASC');

    if (geoColumn === 'id_distrito') {
      qb.where('c.idDistrito = :seleccion', { seleccion });
    } else {
      qb.where('c.idDelegacion = :seleccion', { seleccion });
    }

    const rows = await qb.getRawMany<{ idSeccion: number }>();
    const subcategories: OpcionCombo[] = rows
      .filter((r) => r.idSeccion != null)
      .map((r) => ({ id: r.idSeccion, name: r.idSeccion }));

    // Semántica exacta de `estado` (reg_data/reg_cat/error) no está en los
    // fuentes extraídos en docs/CONSULTAS_SQL_PREP2024.md; se usa el patrón
    // de bandera de éxito visto en el resto de endpoints con esta forma.
    // TODO: confirmar contra la respuesta real de api_subcategories.php 2024.
    return {
      subcategories,
      estado: [{ reg_data: 1, reg_cat: subcategories.length, error: 0 }],
    };
  }

  async tercero(
    type: TipoEleccion,
    seleccion: number,
    seccion: number,
  ): Promise<{
    items: OpcionCombo[];
    estado: { reg_data: number; reg_cat: number; error: number }[];
  }> {
    const geoColumn = this.catalogo.geoColumnCombo(type);
    const qb = this.casillasRepo
      .createQueryBuilder('c')
      .select('DISTINCT c.tipoCasilla', 'tipoCasilla')
      .where('c.idSeccion = :seccion', { seccion })
      .orderBy('c.idSeccion', 'ASC');

    if (geoColumn === 'id_distrito') {
      qb.andWhere('c.idDistrito = :seleccion', { seleccion });
    } else {
      qb.andWhere('c.idDelegacion = :seleccion', { seleccion });
    }

    const rows = await qb.getRawMany<{ tipoCasilla: string | null }>();
    // `id` aquí es el texto de `tipo_casilla` (ej. "S01"), no un entero.
    const items: OpcionCombo[] = rows
      .filter((r): r is { tipoCasilla: string } => r.tipoCasilla != null)
      .map((r) => ({ id: r.tipoCasilla, name: r.tipoCasilla }));

    // TODO: ver nota de `segundo()` sobre la semántica exacta de `estado`.
    return {
      items,
      estado: [{ reg_data: 1, reg_cat: items.length, error: 0 }],
    };
  }
}
