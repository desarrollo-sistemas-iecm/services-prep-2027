export interface CombinacionVotos {
  integrantes: number[];
  votos: number;
  /** Porcentaje de convenio por integrante (mismo orden), p. ej. candidatura común PVEM-PT-MORENA `26.67&20&53.33`. */
  porcentajes?: number[];
}

const tienePorcentajesValidos = ({
  integrantes,
  porcentajes,
}: CombinacionVotos): boolean =>
  porcentajes !== undefined &&
  porcentajes.length === integrantes.length &&
  porcentajes.every((porcentaje) => Number.isFinite(porcentaje));

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
 */
export function distribuirVotosCombinaciones(
  votosPartidos: ReadonlyMap<number, number>,
  combinaciones: CombinacionVotos[],
): Map<number, number> {
  const resultado = new Map(votosPartidos);
  const sumar = (id: number, votos: number) =>
    resultado.set(id, (resultado.get(id) ?? 0) + votos);

  const conPorcentajes = combinaciones.filter(
    (combinacion) =>
      combinacion.votos > 0 &&
      tienePorcentajesValidos(combinacion) &&
      combinacion.integrantes.every((id) => votosPartidos.has(id)),
  );
  for (const { integrantes, votos, porcentajes = [] } of conPorcentajes) {
    // Centésimas de punto enteras: `votos * 53.33` en coma flotante puede
    // quedar en `...99999` y truncar un voto de menos.
    const partes = porcentajes.map((porcentaje) =>
      Math.floor((votos * Math.round(porcentaje * 100)) / 10000),
    );
    integrantes.forEach((id, indice) => sumar(id, partes[indice]));
    const residuo = votos - partes.reduce((suma, parte) => suma + parte, 0);
    sumar(integrantes[porcentajes.indexOf(Math.max(...porcentajes))], residuo);
  }

  const combinacionesValidas = combinaciones
    .filter((combinacion) => !conPorcentajes.includes(combinacion))
    .map(({ integrantes, votos }) => ({
      integrantes: integrantes.filter((id) => votosPartidos.has(id)),
      votos,
    }))
    .filter(({ integrantes, votos }) => integrantes.length > 0 && votos > 0);

  const repartoIgualitario = new Map(resultado);
  for (const { integrantes, votos } of combinacionesValidas) {
    const parte = Math.floor(votos / integrantes.length);
    for (const id of integrantes) {
      repartoIgualitario.set(id, (repartoIgualitario.get(id) ?? 0) + parte);
    }
  }

  const conResiduos = new Map(repartoIgualitario);
  for (const { integrantes, votos } of combinacionesValidas) {
    const residuo = votos % integrantes.length;
    const ordenadosPorVotos = [...integrantes].sort(
      (a, b) =>
        (repartoIgualitario.get(b) ?? 0) - (repartoIgualitario.get(a) ?? 0),
    );
    for (const id of ordenadosPorVotos.slice(0, residuo)) {
      conResiduos.set(id, (conResiduos.get(id) ?? 0) + 1);
    }
  }

  return conResiduos;
}
