export interface CombinacionVotos {
  integrantes: number[];
  votos: number;
  /** Porcentaje de convenio por integrante (mismo orden), p. ej. candidatura común PVEM-PT-MORENA `26.67&20&53.33`. */
  porcentajes?: number[];
}

/**
 * Porcentajes iguales (coalición PAN-PRI-PRD trae `33.3333333` ×3 en la BD
 * de 2024) equivalen al reparto igualitario y no pasan por aquí: su residuo
 * va a los integrantes con más votos, no todo al primero.
 */
const tienePorcentajesValidos = ({
  integrantes,
  porcentajes,
}: CombinacionVotos): boolean =>
  porcentajes !== undefined &&
  porcentajes.length === integrantes.length &&
  porcentajes.every((porcentaje) => Number.isFinite(porcentaje)) &&
  new Set(porcentajes).size > 1;

/** Votos que cada integrante recibe de una combinación, en el orden de `integrantes`. */
export interface RepartoCombinacion {
  integrantes: number[];
  votos: number;
  partes: number[];
}

/**
 * Reparte los votos de cada combinación de coalición/candidatura común entre
 * sus partidos integrantes, como `consigueDatosJG()` de
 * `funciones_grafica.php` (2024): cada integrante recibe la parte entera
 * (`votos / integrantes`) y el residuo se asigna, un voto por partido, a los
 * integrantes con más votos tras ese reparto igualitario (empates: gana el
 * que aparece primero en `integrantes`).
 *
 * El PHP original solo cubría residuo 2 para algunos partidos (y residuo 1
 * duplicado para `votos_part_1`); aquí se aplica la regla de forma uniforme
 * para que la suma repartida siempre cuadre con los votos de la combinación.
 *
 * Las combinaciones con `porcentajes` de convenio (candidatura común en
 * diputaciones y alcaldías, `consigueDatosDMR()`/`consigueDatosALC()`) se
 * reparten por esos porcentajes truncados y el residuo va al integrante con
 * mayor porcentaje, como hacía el PHP al sumárselo a MORENA.
 *
 * Regresa un reparto por combinación, en el mismo orden; los integrantes que
 * no están en `votosPartidos` se descartan.
 */
export function repartirVotosCombinaciones(
  votosPartidos: ReadonlyMap<number, number>,
  combinaciones: CombinacionVotos[],
): RepartoCombinacion[] {
  const porPorcentaje = (combinacion: CombinacionVotos): boolean =>
    combinacion.votos > 0 &&
    tienePorcentajesValidos(combinacion) &&
    combinacion.integrantes.every((id) => votosPartidos.has(id));

  const repartos = combinaciones.map((combinacion): RepartoCombinacion => {
    const { votos, porcentajes = [] } = combinacion;
    if (porPorcentaje(combinacion)) {
      const { integrantes } = combinacion;
      // Centésimas de punto enteras: `votos * 53.33` en coma flotante puede
      // quedar en `...99999` y truncar un voto de menos.
      const partes = porcentajes.map((porcentaje) =>
        Math.floor((votos * Math.round(porcentaje * 100)) / 10000),
      );
      const residuo = votos - partes.reduce((suma, parte) => suma + parte, 0);
      partes[porcentajes.indexOf(Math.max(...porcentajes))] += residuo;
      return { integrantes, votos, partes };
    }

    const integrantes = combinacion.integrantes.filter((id) =>
      votosPartidos.has(id),
    );
    const parte =
      votos > 0 && integrantes.length > 0
        ? Math.floor(votos / integrantes.length)
        : 0;
    return { integrantes, votos, partes: integrantes.map(() => parte) };
  });

  const repartoIgualitario = new Map(votosPartidos);
  for (const { integrantes, partes } of repartos) {
    integrantes.forEach((id, indice) =>
      repartoIgualitario.set(
        id,
        (repartoIgualitario.get(id) ?? 0) + partes[indice],
      ),
    );
  }

  combinaciones.forEach((combinacion, indiceCombinacion) => {
    const { integrantes, votos, partes } = repartos[indiceCombinacion];
    if (porPorcentaje(combinacion) || votos <= 0 || integrantes.length === 0) {
      return;
    }
    const residuo = votos % integrantes.length;
    const ordenadosPorVotos = [...integrantes].sort(
      (a, b) =>
        (repartoIgualitario.get(b) ?? 0) - (repartoIgualitario.get(a) ?? 0),
    );
    for (const id of ordenadosPorVotos.slice(0, residuo)) {
      partes[integrantes.indexOf(id)] += 1;
    }
  });

  return repartos;
}

/** Votos de cada partido más lo que recibe de todas las combinaciones (`repartirVotosCombinaciones`). */
export function distribuirVotosCombinaciones(
  votosPartidos: ReadonlyMap<number, number>,
  combinaciones: CombinacionVotos[],
): Map<number, number> {
  const resultado = new Map(votosPartidos);
  for (const { integrantes, partes } of repartirVotosCombinaciones(
    votosPartidos,
    combinaciones,
  )) {
    integrantes.forEach((id, indice) =>
      resultado.set(id, (resultado.get(id) ?? 0) + partes[indice]),
    );
  }
  return resultado;
}
