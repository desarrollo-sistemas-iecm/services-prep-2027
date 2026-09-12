/**
 * Códigos de tipo de elección, confirmados en `docs/MIGRACION_APIS_PREP2024.md`
 * (idénticos en los 16 endpoints PHP auditados) y usados sin cambios por
 * `ApiPrepService.typeQuery()` en `publicador-prep-2027`.
 */
export enum TipoEleccion {
  JEFATURA_GOBIERNO = 1,
  DIPUTACION_MR = 2,
  REPRESENTACION_PROPORCIONAL = 3,
  ALCALDIA = 4,
}

export const TIPOS_ELECCION_VALIDOS = [
  TipoEleccion.JEFATURA_GOBIERNO,
  TipoEleccion.DIPUTACION_MR,
  TipoEleccion.REPRESENTACION_PROPORCIONAL,
  TipoEleccion.ALCALDIA,
] as const;
