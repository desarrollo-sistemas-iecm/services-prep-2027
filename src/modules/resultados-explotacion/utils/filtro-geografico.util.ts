import { ObjectLiteral, SelectQueryBuilder } from 'typeorm';

/** Selección del sidebar: distrito/alcaldía → sección → casilla; `0`/`null` = sin filtrar. */
export interface FiltroGeografico {
  distOAlcaldia: number;
  seccion: number;
  casilla: string | null;
}

export const SIN_FILTRO_GEOGRAFICO: FiltroGeografico = {
  distOAlcaldia: 0,
  seccion: 0,
  casilla: null,
};

/**
 * Aplica el filtro sobre un alias de `prep_votos` o `scd_casillas` (ambas
 * entidades exponen `idDistrito`/`idDelegacion`/`idSeccion`/`tipoCasilla`).
 * `geoColumn` es la de `TipoEleccionCatalogoService.geoColumn()`.
 */
export const aplicarFiltroGeografico = <T extends ObjectLiteral>(
  qb: SelectQueryBuilder<T>,
  alias: string,
  geoColumn: 'id_distrito' | 'id_delegacion',
  { distOAlcaldia, seccion, casilla }: FiltroGeografico,
): SelectQueryBuilder<T> => {
  const columnaGeo =
    geoColumn === 'id_distrito' ? 'idDistrito' : 'idDelegacion';
  if (distOAlcaldia) {
    qb.andWhere(`${alias}.${columnaGeo} = :distOAlcaldia`, { distOAlcaldia });
  }
  if (seccion) qb.andWhere(`${alias}.idSeccion = :seccion`, { seccion });
  if (casilla) qb.andWhere(`${alias}.tipoCasilla = :casilla`, { casilla });
  return qb;
};
