import { CorteLegacyEntity } from '../../resultados-legacy/entities/corte-legacy.entity';

export interface ExportIneResultado {
  filename: string;
  zipBuffer: Buffer;
}

/**
 * Contrato común de los generadores de exportación INE (dip, alc — gob queda fuera de esta iteración, ver
 * la spec). El orquestador (`ExportacionIneService`) los corre en paralelo y nestea sus ZIPs resultantes.
 */
export interface ExportIneGenerador {
  generar(
    fechacorte: string,
    corte: CorteLegacyEntity,
  ): Promise<ExportIneResultado>;
}
