import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import * as fs from 'fs';
import * as path from 'path';
import { CorteLegacyEntity } from '../../resultados-legacy/entities/corte-legacy.entity';
import { campoInconsistencia } from '../utils/campo-inconsistencia.util';
import { OBSERVACIONES_INE_SQL } from '../utils/observaciones-ine.util';
import { calcularEstadisticasIne } from '../utils/estadisticas-ine.util';
import { formatearFechaCorteTexto } from '../utils/fecha-corte.util';
import { construirCsvIne } from '../utils/csv-ine-builder.util';
import { crearZipBuffer } from '../utils/zip-buffer.util';
import { normalizarAlcaldia } from '../utils/normalizar-alcaldia.util';
import {
  ExportIneGenerador,
  ExportIneResultado,
} from '../interfaces/export-ine-generador.interface';

type FilaCruda = Record<string, string | number | null>;

const COLUMNAS_ALC = [
  'CLAVE_CASILLA',
  'CLAVE_ACTA',
  'ID_ENTIDAD',
  'ENTIDAD',
  'ID_ALCALDIA',
  'ALCALDIA',
  'SECCION',
  'ID_CASILLA',
  'TIPO_CASILLA',
  'EXT_CONTIGUA',
  'UBICACION_CASILLA',
  'TIPO_ACTA',
  'TOTAL_BOLETAS_SOBRANTES',
  'PERSONAS_VOTARON',
  'TOTAL_REP_PARTIDO_CI_VOTARON',
  'TOTAL_VOTOS_SACADOS',
  'PAN',
  'PRI',
  'PRD',
  'PVEM',
  'PT',
  'MC',
  'MORENA',
  'CSP',
  'MORENA_PT_PVEM',
  'PAN_PRI_PRD',
  'PAN_PRI',
  'PAN_PRD',
  'PRI_PRD',
  'NO_REGISTRADAS',
  'NULOS',
  'TOTAL_VOTOS_ASENTADOS',
  'TOTAL_VOTOS_CALCULADOS',
  'LISTA_NOMINAL',
  'REPRESENTANTES_PP_CI',
  'OBSERVACIONES',
  'CONTABILIZADAS',
  'MECANISMO_TRASLADO',
  'CODIGO_INTEGRIDAD',
  'FECHA_HORA_ACOPIO',
  'FECHA_HORA_CAPTURA',
  'FECHA_HORA_VERIFICACION',
  'ORIGEN',
  'DIGITALIZACION',
  'TIPO_DOCUMENTO',
] as const;

// Portado literal de export_ine_alc.php (consigueFranjaALC), salvo ALCALDIA: en vez del CASE hardcodeado
// de 16 ramas, se hace LEFT JOIN a cain_cat_delegacion y se normaliza en JS (ver normalizar-alcaldia.util).
const DETALLE_ALC_SQL = `
SELECT
  '09' || printf('%04d', P.id_seccion) || substr(P.tipo_casilla, 1, 3) || '00' AS CLAVE_CASILLA,
  '09' || printf('%04d', P.id_seccion) || substr(P.tipo_casilla, 1, 3) || '00' || P.tipo_casilla AS CLAVE_ACTA,
  '09' AS ID_ENTIDAD,
  'CIUDAD DE MÉXICO' AS ENTIDAD,
  printf('%03d', P.id_delegacion) AS ID_ALCALDIA,
  D.nombre_delegacion AS ALCALDIA_RAW,
  CASE WHEN P.tipo_casilla IN ('A1','A2','A3') THEN 'N/A' ELSE printf('%04d', P.id_seccion) END AS SECCION,
  CASE WHEN P.tipo_casilla IN ('A1','A2','A3') THEN 'N/A' ELSE substr(P.tipo_casilla, 2, 2) END AS ID_CASILLA,
  substr(P.tipo_casilla, 1, 1) AS TIPO_CASILLA,
  '00' AS EXT_CONTIGUA,
  '01' AS UBICACION_CASILLA,
  CASE WHEN substr(P.tipo_casilla, 1, 1) = 'S' THEN 'A04E'
       WHEN substr(P.tipo_casilla, 1, 1) = 'A' THEN 'A03VA'
       WHEN substr(P.tipo_casilla, 1, 1) = 'P' THEN 'A03PPP'
       WHEN substr(P.tipo_casilla, 1, 1) = 'U' THEN 'A06UE'
       ELSE 'A04' END AS TIPO_ACTA,
  ${campoInconsistencia('P.boletas_sob', 'TOTAL_BOLETAS_SOBRANTES')},
  ${campoInconsistencia('P.ciudadanos_votaron', 'PERSONAS_VOTARON')},
  ${campoInconsistencia('P.representantes_votaron', 'TOTAL_REP_PARTIDO_CI_VOTARON')},
  ${campoInconsistencia('P.votacion_total', 'TOTAL_VOTOS_SACADOS')},
  ${campoInconsistencia('P.votos_part_1', 'PAN')},
  ${campoInconsistencia('P.votos_part_2', 'PRI')},
  ${campoInconsistencia('P.votos_part_3', 'PRD')},
  ${campoInconsistencia('P.votos_part_4', 'PVEM')},
  ${campoInconsistencia('P.votos_part_5', 'PT')},
  ${campoInconsistencia('P.votos_part_6', 'MC')},
  ${campoInconsistencia('P.votos_part_7', 'MORENA')},
  ${campoInconsistencia('P.votos_part_9', 'CSP')},
  ${campoInconsistencia('P.votos_part_14', 'MORENA_PT_PVEM')},
  ${campoInconsistencia('P.votos_part_10', 'PAN_PRI_PRD')},
  ${campoInconsistencia('P.votos_part_11', 'PAN_PRI')},
  ${campoInconsistencia('P.votos_part_12', 'PAN_PRD')},
  ${campoInconsistencia('P.votos_part_13', 'PRI_PRD')},
  ${campoInconsistencia('P.votos_cand_no_reg', 'NO_REGISTRADAS')},
  ${campoInconsistencia('P.votos_nulos', 'NULOS', 'ILEGIBLE')},
  P.boletas_sob AS TOTAL_VOTOS_ASENTADOS,
  P.votacion_total AS TOTAL_VOTOS_CALCULADOS,
  C.lista_nominal AS LISTA_NOMINAL,
  P.representantes_votaron AS REPRESENTANTES_PP_CI,
  ${OBSERVACIONES_INE_SQL},
  CASE WHEN P.contabilizar = 'T' THEN '1' ELSE '0' END AS CONTABILIZADAS,
  'F' AS MECANISMO_TRASLADO,
  CASE WHEN A.sha_img_alc IS NULL THEN 'N/A' ELSE A.sha_img_alc END AS CODIGO_INTEGRIDAD,
  CASE WHEN P.ue_identificacion = 'INE-UE-IECM' AND A.fechaRecepcion = '' THEN strftime('%d/%m/%Y %H:%M:%S', datetime(P.fecha_alta)) || ' (UTC-6)'
       ELSE strftime('%d/%m/%Y %H:%M:%S', datetime(A.fechaRecepcion)) || ' (UTC-6)' END AS FECHA_HORA_ACOPIO,
  strftime('%d/%m/%Y %H:%M:%S', datetime(P.fecha_alta)) || ' (UTC-6)' AS FECHA_HORA_CAPTURA,
  CASE WHEN P.ue_identificacion = 'INE-UE-IECM' THEN strftime('%d/%m/%Y %H:%M:%S', datetime(P.fecha_alta)) || ' (UTC-6)'
       ELSE strftime('%d/%m/%Y %H:%M:%S', datetime(P.fecha_modif)) || ' (UTC-6)' END AS FECHA_HORA_VERIFICACION,
  CASE WHEN P.capturado_por = 1 THEN 'CATD' WHEN P.capturado_por = 2 THEN 'CATD' WHEN P.capturado_por = 3 THEN 'CASILLA' WHEN P.capturado_por = 4 THEN 'CASILLA' ELSE 'N/A' END AS ORIGEN,
  CASE WHEN P.capturado_por = 1 THEN CASE WHEN substr(P.tipo_casilla, 1, 1) = 'S' THEN 'MOVIL' ELSE 'ESCANER' END
       WHEN P.capturado_por = 2 THEN 'ESCANER' WHEN P.capturado_por = 3 THEN 'MOVIL' WHEN P.capturado_por = 4 THEN 'MOVIL' ELSE 'N/A' END AS DIGITALIZACION,
  CASE WHEN substr(P.tipo_casilla, 1, 1) = 'S' THEN 'ACTA UE' ELSE 'ACTA PREP' END AS TIPO_DOCUMENTO
FROM scd_casillas AS C
LEFT JOIN prep_votos P
  ON P.id_distrito = C.id_distrito AND P.id_delegacion = C.id_delegacion
 AND P.id_seccion = C.id_seccion AND P.tipo_casilla = C.tipo_casilla
LEFT JOIN dig_actas_prep AS A ON P.clave_mdc = A.acta
LEFT JOIN cain_cat_delegacion AS D ON D.id_delegacion = P.id_delegacion
WHERE P.id_tipo_eleccion = 4`;

function valorColumnaAlc(
  fila: FilaCruda,
  columna: (typeof COLUMNAS_ALC)[number],
): string | number | null {
  if (columna === 'ALCALDIA') {
    return normalizarAlcaldia(fila.ALCALDIA_RAW as string | null);
  }
  return fila[columna];
}

@Injectable()
export class ExportAlcService implements ExportIneGenerador {
  private readonly candidaturasCsv: Buffer;
  private readonly leemeTxt: Buffer;

  constructor(
    @InjectDataSource('resultados') private readonly dataSource: DataSource,
    private readonly configService: ConfigService,
  ) {
    this.candidaturasCsv = fs.readFileSync(
      path.join(__dirname, '../assets/candidaturas/CDMX_ALC_CANDIDATURAS.csv'),
    );
    this.leemeTxt = fs.readFileSync(
      path.join(__dirname, '../assets/leeme/LEEME_A.txt'),
    );
  }

  async generar(
    fechacorte: string,
    corte: CorteLegacyEntity,
  ): Promise<ExportIneResultado> {
    const filas = await this.dataSource.query<FilaCruda[]>(DETALLE_ALC_SQL);

    const ajusteEsperadas = -(
      this.configService.get<number>('INE_AJUSTE_ESPERADAS_ALC') ?? 0
    );
    const estadisticas = await calcularEstadisticasIne(
      this.dataSource,
      'id_tipo_eleccion = 4',
      ajusteEsperadas,
    );

    const csv = construirCsvIne({
      tituloEleccion: 'ALCALDIAS',
      fechaCorteTexto: formatearFechaCorteTexto(corte),
      estadisticas,
      columnas: COLUMNAS_ALC,
      filas: filas.map((fila) =>
        COLUMNAS_ALC.map((columna) => valorColumnaAlc(fila, columna)),
      ),
    });

    const zipBuffer = await crearZipBuffer([
      { name: 'CDMX_ALC_2024.csv', content: csv },
      {
        name: 'CDMX_ALC_CANDIDATURAS_2024.csv',
        content: this.candidaturasCsv,
      },
      { name: 'leeme.txt', content: this.leemeTxt },
    ]);

    return { filename: `${fechacorte}_PREP_ALC_CDMX.zip`, zipBuffer };
  }
}
