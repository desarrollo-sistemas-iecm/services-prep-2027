# exportacion-ine

Exporta los resultados del corte activo en el formato ZIP anidado que consumen las herramientas del
INE: un ZIP por elección (Diputaciones y Alcaldías), cada uno con su CSV en Latin-1, su `LEEME_*.txt` y su
catálogo de candidaturas, comprimidos dentro de un ZIP contenedor. Jefatura de Gobierno ("gob") queda
fuera de esta iteración — ver `ExportIneGenerador` en `interfaces/export-ine-generador.interface.ts` y el
comentario de `ExportacionIneModule`.

El módulo es de solo lectura sobre `ResultadosLegacyModule` (la base `resultados`, reemplazada por
completo en cada corte) y usa `CortesModule` únicamente para saber cuál es el corte activo. El ZIP se
regenera una sola vez por corte —al recibir el evento `corte.activated` (ver
`../cortes/events/corte-activated.event.ts`) o al arrancar el proceso si ya hay un corte `ACTIVATED`— y se
cachea en memoria; `GET /api/v1/exportacion-ine` solo sirve esa caché, nunca recalcula por petición.

Este documento sustituye al spec de diseño original (`docs/superpowers/specs/2026-09-14-exportacion-ine-zip-design.md`),
que no está versionado porque `.gitignore` excluye `docs/` en este repositorio (decisión de repo fuera del
alcance de este módulo). Documenta aquí las reglas no obvias para que sobrevivan sin ese spec.

## Por qué los PHP originales no están en este repo

`export_ine_dip.php` y `export_ine_alc.php` (los archivos legado de referencia sobre los que se portó
este módulo) se eliminaron deliberadamente al terminar la migración — eran archivos temporales de
consulta, no parte del sistema. No se espera que existan en este repositorio; toda la lógica que
replican vive ya en `services/export-dip.service.ts`, `services/export-alc.service.ts` y
`utils/campo-inconsistencia.util.ts`.

## La excepción de `NULOS` sin espacio final

`campoInconsistencia()` (`utils/campo-inconsistencia.util.ts`) envuelve cada campo numérico del acta y,
cuando el campo es `NULL` con `inconsistencia IN (1,2)`, lo sustituye por el texto `'ILEGIBLE '` — con un
espacio final. El campo `NULOS` (`votos_nulos`) es la única excepción: usa `'ILEGIBLE'` **sin** espacio
final, pasado explícitamente como el tercer argumento (`ilegibleTexto`) en ambos servicios
(`campoInconsistencia('P.votos_nulos', 'NULOS', 'ILEGIBLE')`). Esto no es un error de este puerto: es una
inconsistencia/typo confirmada en los dos PHP originales y se preserva a propósito para mantener fidelidad
de bytes con la salida legado — "corregirlo" cambiaría el archivo que entregamos al INE.

## Por qué `ALCALDIA` no usa `UPPER()` de SQL

El PHP original resolvía `ALCALDIA` con un `CASE` hardcodeado de 16 ramas sobre el nombre de cada
alcaldía. Este puerto lo reemplaza por un `LEFT JOIN` a `cain_cat_delegacion` (`export-alc.service.ts`,
`DETALLE_ALC_SQL`) seguido de normalización en JavaScript (`utils/normalizar-alcaldia.util.ts`), en vez de
duplicar el `CASE` o de resolverlo con `UPPER()` en SQL. La razón es que `UPPER()` en `better-sqlite3` no
convierte correctamente letras acentuadas (p. ej. no volvería mayúscula la Á de "Álvaro Obregón"), así que
la normalización a mayúsculas sin acentos ni puntos se hace en JS: `normalize('NFD')` para descomponer los
acentos, un `replace` con el rango Unicode de marcas diacríticas combinables (U+0300–U+036F) para
eliminarlos, quitar los puntos y luego `toUpperCase()`.

## Los ajustes `+44`/`-1` ahora son configuración, no código

El PHP 2024 traía ajustes hardcodeados a `ACTAS_ESPERADAS` (ver `utils/estadisticas-ine.util.ts`). En este
puerto son variables de entorno — `INE_AJUSTE_ESPERADAS_DIP` (se suma) e `INE_AJUSTE_ESPERADAS_ALC` (se
resta), ambas `Joi.number().integer().default(0)` en `src/config/env.validation.ts` y leídas vía
`ConfigService` en `export-dip.service.ts`/`export-alc.service.ts`. El valor por defecto es `0` en ambas:
no se debe volver a hardcodear `44` o `1` (ni ningún otro valor) directamente en el código — cualquier
ajuste específico de una elección se configura por entorno.

## Contrato del evento de regeneración

`ExportacionIneService.manejarCorteActivado()` escucha `CORTE_ACTIVATED_EVENT` (definido en
`../cortes/events/corte-activated.event.ts`, junto con el tipo `CorteActivatedPayload`), emitido por
`ActivationService` tras activar un corte. Ambos lados importan el mismo nombre y tipo de evento — no
usar el literal `'corte.activated'` directamente en código nuevo.
