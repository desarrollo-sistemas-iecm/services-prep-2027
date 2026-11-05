import {
  distribuirVotosCombinaciones,
  repartirVotosCombinaciones,
} from '../utils/distribucion-votos.util';

describe('distribuirVotosCombinaciones', () => {
  it('should split combination votes evenly when they divide exactly', () => {
    const votosPartidos = new Map([
      [1, 10],
      [2, 5],
      [3, 0],
    ]);

    const resultado = distribuirVotosCombinaciones(votosPartidos, [
      { integrantes: [1, 2, 3], votos: 9 },
    ]);

    expect([...resultado]).toEqual([
      [1, 13],
      [2, 8],
      [3, 3],
    ]);
  });

  it('should give the remainder to the members with most votes when the split is not exact', () => {
    const votosPartidos = new Map([
      [1, 2],
      [2, 10],
      [3, 6],
    ]);

    const resultado = distribuirVotosCombinaciones(votosPartidos, [
      { integrantes: [1, 2, 3], votos: 11 },
    ]);

    expect([...resultado]).toEqual([
      [1, 5],
      [2, 14],
      [3, 10],
    ]);
  });

  it('should favor the first listed member when tied for the remainder', () => {
    const votosPartidos = new Map([
      [4, 3],
      [5, 3],
    ]);

    const resultado = distribuirVotosCombinaciones(votosPartidos, [
      { integrantes: [4, 5], votos: 5 },
    ]);

    expect([...resultado]).toEqual([
      [4, 6],
      [5, 5],
    ]);
  });

  it('should keep the total equal to parties plus combinations when several combinations overlap', () => {
    const votosPartidos = new Map([
      [1, 22],
      [2, 10],
      [3, 21],
    ]);
    const combinaciones = [
      { integrantes: [1, 2, 3], votos: 11 },
      { integrantes: [1, 2], votos: 11 },
      { integrantes: [1, 3], votos: 11 },
      { integrantes: [2, 3], votos: 11 },
    ];

    const resultado = distribuirVotosCombinaciones(
      votosPartidos,
      combinaciones,
    );

    const total = [...resultado.values()].reduce((suma, v) => suma + v, 0);
    expect(total).toBe(97);
  });

  it('should ignore members that are not in the parties catalog when splitting', () => {
    const votosPartidos = new Map([[1, 0]]);

    const resultado = distribuirVotosCombinaciones(votosPartidos, [
      { integrantes: [1, 99], votos: 4 },
    ]);

    expect([...resultado]).toEqual([[1, 4]]);
  });

  it('should split by agreement percentages and give the remainder to the largest share when the combination has porcentajes', () => {
    const votosPartidos = new Map([
      [4, 1],
      [5, 1],
      [7, 1],
    ]);

    const resultado = distribuirVotosCombinaciones(votosPartidos, [
      { integrantes: [4, 5, 7], votos: 100, porcentajes: [26.67, 20, 53.33] },
    ]);

    // 26 + 20 + 53 = 99 → residuo 1 a MORENA (53.33%).
    expect([...resultado]).toEqual([
      [4, 27],
      [5, 21],
      [7, 55],
    ]);
  });

  it('should not lose a vote to floating point when the percentage split is exact', () => {
    const votosPartidos = new Map([
      [4, 0],
      [5, 0],
      [7, 0],
    ]);

    const resultado = distribuirVotosCombinaciones(votosPartidos, [
      { integrantes: [4, 5, 7], votos: 10000, porcentajes: [26.67, 20, 53.33] },
    ]);

    expect([...resultado]).toEqual([
      [4, 2667],
      [5, 2000],
      [7, 5333],
    ]);
  });

  it('should fall back to an even split when porcentajes do not match the members', () => {
    const votosPartidos = new Map([
      [4, 0],
      [5, 0],
    ]);

    const resultado = distribuirVotosCombinaciones(votosPartidos, [
      { integrantes: [4, 5], votos: 4, porcentajes: [100] },
    ]);

    expect([...resultado]).toEqual([
      [4, 2],
      [5, 2],
    ]);
  });

  it('should give the remainder to the members with most votes when all porcentajes are equal', () => {
    const votosPartidos = new Map([
      [1, 14235],
      [2, 7873],
      [3, 3825],
    ]);

    const resultado = distribuirVotosCombinaciones(votosPartidos, [
      {
        integrantes: [1, 2, 3],
        votos: 1700,
        porcentajes: [33.3333333, 33.3333333, 33.3333333],
      },
    ]);

    expect([...resultado]).toEqual([
      [1, 14802],
      [2, 8440],
      [3, 4391],
    ]);
  });
});

describe('repartirVotosCombinaciones', () => {
  it('should return the share of each member per combination when several combinations overlap', () => {
    const votosPartidos = new Map([
      [1, 10],
      [2, 5],
    ]);

    const repartos = repartirVotosCombinaciones(votosPartidos, [
      { integrantes: [1, 2], votos: 5 },
      { integrantes: [1, 99], votos: 3 },
    ]);

    expect(repartos).toEqual([
      { integrantes: [1, 2], votos: 5, partes: [3, 2] },
      { integrantes: [1], votos: 3, partes: [3] },
    ]);
  });
});
