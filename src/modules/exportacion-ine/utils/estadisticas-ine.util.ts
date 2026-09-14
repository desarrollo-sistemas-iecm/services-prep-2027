import { DataSource } from 'typeorm';

export interface EstadisticasIne {
  esperadas: number;
  registradas: number;
  fueraCatalogo: number;
  contabilizadas: number;
  noContabilizadas: number;
  inconsistencias: number;
  listaNominalContabilizada: number;
  votacionTotalContabilizada: number;
  actasEspecialesContabilizadas: number;
}

/**
 * Las 7 consultas de resumen de `export_ine_dip.php`/`export_ine_alc.php` (idénticas en estructura entre
 * los dos, solo cambia el filtro de tipo de elección) — unificadas aquí en vez de duplicarse. `filtro` va
 * sin prefijo de tabla (p. ej. `'id_tipo_eleccion IN (2,3)'`), igual que en el PHP original, porque solo
 * `prep_votos` tiene esa columna y es válido sin ambigüedad incluso en los JOIN. `ajusteEsperadas` ya debe
 * venir con el signo correcto aplicado por el llamador (dip: sumar `INE_AJUSTE_ESPERADAS_DIP`; alc: restar
 * `INE_AJUSTE_ESPERADAS_ALC`).
 */
export async function calcularEstadisticasIne(
  dataSource: DataSource,
  filtro: string,
  ajusteEsperadas: number,
): Promise<EstadisticasIne> {
  const [capturadas] = await dataSource.query<{ cuantos: number | null }[]>(`
    SELECT COUNT(C.id_distrito) AS cuantos
    FROM prep_votos P
    LEFT JOIN scd_casillas C
      ON P.id_distrito = C.id_distrito AND P.id_delegacion = C.id_delegacion
     AND P.id_seccion = C.id_seccion AND P.tipo_casilla = C.tipo_casilla
    WHERE ${filtro}
  `);

  const [fueraCatalogoRow] = await dataSource.query<
    { actas_fuera_catalogo: number | null }[]
  >(`
    SELECT COUNT(inconsistencia) AS actas_fuera_catalogo
    FROM prep_votos WHERE ${filtro} AND inconsistencia = 5
  `);

  const [inconsistenciasRow] = await dataSource.query<
    { inconsistencia: number | null }[]
  >(`
    SELECT COUNT(inconsistencia) AS inconsistencia
    FROM prep_votos WHERE ${filtro} AND inconsistencia IN (1,2,3,6,7)
  `);

  const [esperadasRow] = await dataSource.query<
    { esperadas: number | null }[]
  >(`
    SELECT COUNT(*) AS esperadas FROM scd_casillas
  `);

  const [contabilizadasRow] = await dataSource.query<
    {
      cuantos: number | null;
      ln: number | null;
      votacion_total: number | null;
    }[]
  >(`
    SELECT COUNT(C.id_distrito) AS cuantos, SUM(C.lista_nominal) AS ln, SUM(votacion_total) AS votacion_total
    FROM prep_votos P
    LEFT JOIN scd_casillas C
      ON P.id_distrito = C.id_distrito AND P.id_delegacion = C.id_delegacion
     AND P.id_seccion = C.id_seccion AND P.tipo_casilla = C.tipo_casilla
    WHERE P.contabilizar = 'T' AND ${filtro}
  `);

  const [noContabilizadasRow] = await dataSource.query<
    { cuantos: number | null }[]
  >(`
    SELECT COUNT(C.id_distrito) AS cuantos
    FROM prep_votos P
    LEFT JOIN scd_casillas C
      ON P.id_distrito = C.id_distrito AND P.id_delegacion = C.id_delegacion
     AND P.id_seccion = C.id_seccion AND P.tipo_casilla = C.tipo_casilla
    WHERE P.contabilizar = 'F' AND ${filtro}
  `);

  const [especialesRow] = await dataSource.query<
    { especial: number | null }[]
  >(`
    SELECT COUNT(*) AS especial FROM prep_votos
    WHERE tipo_casilla LIKE '%S%' AND ${filtro} AND contabilizar = 'T'
  `);

  return {
    esperadas: Number(esperadasRow?.esperadas ?? 0) + ajusteEsperadas,
    registradas: Number(capturadas?.cuantos ?? 0),
    fueraCatalogo: Number(fueraCatalogoRow?.actas_fuera_catalogo ?? 0),
    contabilizadas: Number(contabilizadasRow?.cuantos ?? 0),
    noContabilizadas: Number(noContabilizadasRow?.cuantos ?? 0),
    inconsistencias: Number(inconsistenciasRow?.inconsistencia ?? 0),
    listaNominalContabilizada: Number(contabilizadasRow?.ln ?? 0),
    votacionTotalContabilizada: Number(contabilizadasRow?.votacion_total ?? 0),
    actasEspecialesContabilizadas: Number(especialesRow?.especial ?? 0),
  };
}
