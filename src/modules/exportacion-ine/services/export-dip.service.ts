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
import {
  ExportIneGenerador,
  ExportIneResultado,
} from '../interfaces/export-ine-generador.interface';

type FilaCruda = Record<string, string | number | null>;

const COLUMNAS_DIP = [
  'CLAVE_CASILLA',
  'CLAVE_ACTA',
  'ID_ENTIDAD',
  'ENTIDAD',
  'ID_DISTRITO_LOCAL',
  'DISTRITO_LOCAL',
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
  'TOTAL_VOTOS_CALCULADO',
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

// Portado literal de export_ine_dip.php (consigueFranjaDIP). TOTAL_BOLETAS_SOBRANTES/PERSONAS_VOTARON/
// TOTAL_REP_PARTIDO_CI_VOTARON/TOTAL_VOTOS_SACADOS NO se envuelven con campoInconsistencia en dip
// (a diferencia de alc) -- confirmado contra el PHP real.
const DETALLE_DIP_SQL = `
SELECT
  '09' || printf('%04d', P.id_seccion) || substr(P.tipo_casilla, 1, 3) || '00' AS CLAVE_CASILLA,
  '09' || printf('%04d', P.id_seccion) || substr(P.tipo_casilla, 1, 3) || '00' || P.tipo_casilla AS CLAVE_ACTA,
  '09' AS ID_ENTIDAD,
  'CIUDAD DE MÉXICO' AS ENTIDAD,
  printf('%03d', P.id_distrito) AS ID_DISTRITO_LOCAL,
  printf('%03d', P.id_distrito) AS DISTRITO_LOCAL,
  CASE WHEN P.tipo_casilla IN ('A1','A2','A3') THEN 'N/A' ELSE printf('%04d', P.id_seccion) END AS SECCION,
  CASE WHEN P.tipo_casilla IN ('A1','A2','A3') THEN 'N/A' ELSE substr(P.tipo_casilla, 2, 2) END AS ID_CASILLA,
  substr(P.tipo_casilla, 1, 1) AS TIPO_CASILLA,
  '00' AS EXT_CONTIGUA,
  '01' AS UBICACION_CASILLA,
  CASE WHEN substr(P.tipo_casilla, 1, 1) = 'S' AND P.id_tipo_eleccion = 2 THEN 'A03EMR'
       WHEN substr(P.tipo_casilla, 1, 1) = 'S' AND P.id_tipo_eleccion = 3 THEN 'A03ERP'
       WHEN substr(P.tipo_casilla, 1, 1) = 'A' THEN 'A02VA'
       WHEN substr(P.tipo_casilla, 1, 1) = 'P' THEN 'A02PPP'
       WHEN substr(P.tipo_casilla, 1, 1) = 'M' THEN 'A02'
       WHEN substr(P.tipo_casilla, 1, 1) = 'U' AND P.id_tipo_eleccion = 2 THEN 'A05UEMR'
       WHEN substr(P.tipo_casilla, 1, 1) = 'U' AND P.id_tipo_eleccion = 3 THEN 'A05UERP'
       ELSE 'A03' END AS TIPO_ACTA,
  P.boletas_sob AS TOTAL_BOLETAS_SOBRANTES,
  P.ciudadanos_votaron AS PERSONAS_VOTARON,
  P.representantes_votaron AS TOTAL_REP_PARTIDO_CI_VOTARON,
  P.votacion_total AS TOTAL_VOTOS_SACADOS,
  ${campoInconsistencia('P.votos_part_1', 'PAN')},
  ${campoInconsistencia('P.votos_part_2', 'PRI')},
  ${campoInconsistencia('P.votos_part_3', 'PRD')},
  ${campoInconsistencia('P.votos_part_4', 'PVEM')},
  ${campoInconsistencia('P.votos_part_5', 'PT')},
  ${campoInconsistencia('P.votos_part_6', 'MC')},
  ${campoInconsistencia('P.votos_part_7', 'MORENA')},
  ${campoInconsistencia('P.votos_part_8', 'CSP')},
  ${campoInconsistencia('P.votos_part_14', 'MORENA_PT_PVEM')},
  ${campoInconsistencia('P.votos_part_10', 'PAN_PRI_PRD')},
  ${campoInconsistencia('P.votos_part_11', 'PAN_PRI')},
  ${campoInconsistencia('P.votos_part_12', 'PAN_PRD')},
  ${campoInconsistencia('P.votos_part_13', 'PRI_PRD')},
  ${campoInconsistencia('P.votos_cand_no_reg', 'NO_REGISTRADAS')},
  ${campoInconsistencia('P.votos_nulos', 'NULOS', 'ILEGIBLE')},
  P.boletas_sob AS TOTAL_VOTOS_ASENTADOS,
  P.votacion_total AS TOTAL_VOTOS_CALCULADO,
  C.lista_nominal AS LISTA_NOMINAL,
  P.representantes_votaron AS REPRESENTANTES_PP_CI,
  ${OBSERVACIONES_INE_SQL},
  CASE WHEN P.contabilizar = 'T' THEN '1' ELSE '0' END AS CONTABILIZADAS,
  'F' AS MECANISMO_TRASLADO,
  CASE WHEN A.sha_img_dmr IS NULL THEN 'N/A' ELSE A.sha_img_dmr END AS CODIGO_INTEGRIDAD,
  CASE WHEN P.ue_identificacion = 'INE-UE-IECM' AND A.fechaRecepcion = '' THEN strftime('%d/%m/%Y %H:%M:%S', datetime(P.fecha_alta)) || ' (UTC-6)'
       ELSE strftime('%d/%m/%Y %H:%M:%S', datetime(A.fechaRecepcion)) || ' (UTC-6)' END AS FECHA_HORA_ACOPIO,
  strftime('%d/%m/%Y %H:%M:%S', datetime(P.fecha_alta)) || ' (UTC-6)' AS FECHA_HORA_CAPTURA,
  CASE WHEN P.ue_identificacion = 'INE-UE-IECM' THEN strftime('%d/%m/%Y %H:%M:%S', datetime(P.fecha_alta)) || ' (UTC-6)'
       ELSE strftime('%d/%m/%Y %H:%M:%S', datetime(P.fecha_modif)) || ' (UTC-6)' END AS FECHA_HORA_VERIFICACION,
  CASE WHEN P.capturado_por = 1 THEN 'CATD' WHEN P.capturado_por = 2 THEN 'CATD' WHEN P.capturado_por = 3 THEN 'CASILLA' WHEN P.capturado_por = 4 THEN 'CASILLA' ELSE 'N/A' END AS ORIGEN,
  CASE WHEN P.capturado_por = 1 THEN 'MOVIL' WHEN P.capturado_por = 2 THEN 'MOVIL'
       WHEN P.capturado_por = 3 THEN 'ESCANER' WHEN P.capturado_por = 4 THEN 'ESCANER' ELSE 'N/A' END AS DIGITALIZACION,
  CASE WHEN substr(P.tipo_casilla, 1, 1) = 'S' THEN 'ACTA UE' ELSE 'ACTA PREP' END AS TIPO_DOCUMENTO
FROM scd_casillas AS C
LEFT JOIN prep_votos P
  ON P.id_distrito = C.id_distrito AND P.id_delegacion = C.id_delegacion
 AND P.id_seccion = C.id_seccion AND P.tipo_casilla = C.tipo_casilla
LEFT JOIN dig_actas_prep AS A ON P.clave_mdc = A.acta
WHERE P.id_tipo_eleccion IN (2,3)`;

@Injectable()
export class ExportDipService implements ExportIneGenerador {
  private readonly candidaturasCsv: Buffer;
  private readonly leemeTxt: Buffer;

  constructor(
    @InjectDataSource('resultados') private readonly dataSource: DataSource,
    private readonly configService: ConfigService,
  ) {
    this.candidaturasCsv = fs.readFileSync(
      path.join(
        __dirname,
        '../assets/candidaturas/CDMX_DIP_LOC_CANDIDATURAS.csv',
      ),
    );
    this.leemeTxt = fs.readFileSync(
      path.join(__dirname, '../assets/leeme/LEEME_D.txt'),
    );
  }

  async generar(
    fechacorte: string,
    corte: CorteLegacyEntity,
  ): Promise<ExportIneResultado> {
    const filas = await this.dataSource.query<FilaCruda[]>(DETALLE_DIP_SQL);

    const ajusteEsperadas =
      this.configService.get<number>('INE_AJUSTE_ESPERADAS_DIP') ?? 0;
    const estadisticas = await calcularEstadisticasIne(
      this.dataSource,
      'id_tipo_eleccion IN (2,3)',
      ajusteEsperadas,
    );

    const csv = construirCsvIne({
      tituloEleccion: 'DIPUTACION LOCALES',
      fechaCorteTexto: formatearFechaCorteTexto(corte),
      estadisticas,
      columnas: COLUMNAS_DIP,
      filas: filas.map((fila) => COLUMNAS_DIP.map((columna) => fila[columna])),
    });

    const zipBuffer = await crearZipBuffer([
      { name: 'CDMX_DIP_LOC_2024.csv', content: csv },
      {
        name: 'CDMX_DIP_LOC_CANDIDATURAS_2024.csv',
        content: this.candidaturasCsv,
      },
      { name: 'leeme.txt', content: this.leemeTxt },
    ]);

    return { filename: `${fechacorte}_PREP_DIP_LOC_CDMX.zip`, zipBuffer };
  }
}
