import { filaCsv } from './csv-latin1.util';
import { formatoPorcentajeIne } from './porcentaje-ine.util';
import { EstadisticasIne } from './estadisticas-ine.util';

const ENCABEZADOS_ESTADISTICAS = [
  'ACTAS_ESPERADAS',
  'ACTAS_REGISTRADAS',
  'ACTAS_FUERA_CATALOGO',
  'ACTAS_CAPTURADAS',
  'PORCENTAJE_ACTAS_CAPTURADAS',
  'ACTAS_CONTABILIZADAS',
  'PORCENTAJE_ACTAS_CONTABILIZADAS',
  'PORCENTAJE_ACTAS_INCONSISTENCIAS',
  'ACTAS_NO_CONTABILIZADAS',
  'LISTA_NOMINAL_ACTAS_CONTABILIZADAS',
  'TOTAL_VOTOS_C_CS',
  'TOTAL_VOTOS_S_CS',
  'PORCENTAJE_PARTICIPACION_CIUDADANA',
];

/**
 * Arma el CSV completo (Latin-1) en el orden exacto confirmado contra el PHP real: título, fecha de
 * corte, línea de 4 tabs, encabezados de estadísticas, valores de estadísticas, otra línea de 4 tabs,
 * encabezados de columnas, una fila por acta.
 */
export function construirCsvIne(params: {
  tituloEleccion: string;
  fechaCorteTexto: string;
  estadisticas: EstadisticasIne;
  columnas: readonly string[];
  filas: (string | number | null)[][];
}): Buffer {
  const {
    tituloEleccion,
    fechaCorteTexto,
    estadisticas: e,
    columnas,
    filas,
  } = params;
  const filaBlanco = filaCsv(['\t', '\t', '\t', '\t']);

  const partes: Buffer[] = [
    filaCsv([tituloEleccion]),
    filaCsv([fechaCorteTexto]),
    filaBlanco,
    filaCsv(ENCABEZADOS_ESTADISTICAS),
    filaCsv([
      e.esperadas,
      e.registradas,
      e.fueraCatalogo,
      e.registradas,
      formatoPorcentajeIne(e.registradas, e.esperadas),
      e.contabilizadas,
      formatoPorcentajeIne(e.contabilizadas, e.esperadas),
      formatoPorcentajeIne(e.inconsistencias, e.esperadas),
      e.noContabilizadas,
      e.listaNominalContabilizada,
      e.votacionTotalContabilizada,
      e.votacionTotalContabilizada -
        e.actasEspecialesContabilizadas -
        e.noContabilizadas,
      formatoPorcentajeIne(
        e.votacionTotalContabilizada,
        e.listaNominalContabilizada,
      ),
    ]),
    filaBlanco,
    filaCsv([...columnas]),
    ...filas.map((fila) => filaCsv(fila)),
  ];

  return Buffer.concat(partes);
}
