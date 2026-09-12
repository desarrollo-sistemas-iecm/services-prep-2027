import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ScdCasillasEntity } from '../../resultados-legacy/entities/scd-casillas.entity';

export interface ResultadoBusquedaSeccion {
  encontrada: {
    id_seccion: string;
    id_delegacion: string;
    id_distrito: string;
    cuantos: number;
  };
}

/**
 * Equivalente a `api_seccion.php` (docs/CONSULTAS_SQL_PREP2024.md §2):
 * `SELECT id_distrito, id_delegacion, id_seccion, count(id_seccion) as cuantos
 *  FROM scd_casillas WHERE id_seccion = {{seccion}} AND estatus='T'`.
 */
@Injectable()
export class BusquedaSeccionService {
  constructor(
    @InjectRepository(ScdCasillasEntity, 'resultados')
    private readonly casillasRepo: Repository<ScdCasillasEntity>,
  ) {}

  async buscar(seccion: number): Promise<ResultadoBusquedaSeccion> {
    const row = await this.casillasRepo
      .createQueryBuilder('c')
      .select('c.idDistrito', 'idDistrito')
      .addSelect('c.idDelegacion', 'idDelegacion')
      .addSelect('c.idSeccion', 'idSeccion')
      .addSelect('COUNT(c.idSeccion)', 'cuantos')
      .where('c.idSeccion = :seccion', { seccion })
      .andWhere("c.estatus = 'T'")
      .groupBy('c.idDistrito')
      .addGroupBy('c.idDelegacion')
      .addGroupBy('c.idSeccion')
      .getRawOne<{
        idDistrito: number | null;
        idDelegacion: number | null;
        idSeccion: number | null;
        cuantos: string | number;
      }>();

    if (!row) {
      return {
        encontrada: {
          id_seccion: `${seccion}`,
          id_delegacion: '0',
          id_distrito: '0',
          cuantos: 0,
        },
      };
    }

    return {
      encontrada: {
        id_seccion: `${row.idSeccion}`,
        id_delegacion: `${row.idDelegacion ?? 0}`,
        id_distrito: `${row.idDistrito ?? 0}`,
        cuantos: Number(row.cuantos),
      },
    };
  }
}
