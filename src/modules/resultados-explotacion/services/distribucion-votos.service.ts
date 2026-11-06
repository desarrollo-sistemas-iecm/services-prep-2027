import { Injectable } from '@nestjs/common';
import { readFile } from 'node:fs/promises';
import * as path from 'node:path';
import { TipoEleccion } from '../enums/tipo-eleccion.enum';
import {
  asColumnaVotosSegura,
  CandidaturaDistribucion,
  CombinacionCatalogo,
  TipoEleccionCatalogoService,
} from './tipo-eleccion-catalogo.service';
import {
  FiltrosResumen,
  GraficaService,
  ResumenGraficaFila,
  tiposEleccionConRp,
} from './grafica.service';
import { repartirVotosCombinaciones } from '../utils/distribucion-votos.util';

export interface AporteVotos {
  siglas: string;
  votos: number;
}

export interface DistribucionCandidatura {
  nombre: string;
  siglas: string;
  aportes: AporteVotos[];
  total: number;
}

export interface DistribucionPartido {
  siglas: string;
  individual: number;
  coalicion: AporteVotos[];
  total: number;
}

export interface DistribucionVotosRespuesta {
  candidaturas: DistribucionCandidatura[];
  partidos: DistribucionPartido[];
}

interface CandidatoSirec {
  id_ambito: number;
  id_participante: string;
  nombre_completo: string;
}

interface EleccionSirec {
  type: TipoEleccion;
  candidatos: CandidatoSirec[];
}

const RUTA_CANDIDATOS_SIREC = path.join(
  __dirname,
  '../assets/candidatos-sirec.json',
);

const columnaPartido = (idParticipante: number): string =>
  asColumnaVotosSegura(`votos_part_${idParticipante}`);

const normalizarNombre = (nombre: string): string =>
  nombre.trim().replace(/\s+/g, ' ');

/**
 * "Distribución de votos por Candidatura" y "por Partido Político" a nivel
 * distrito/alcaldía (`DistribucionCategoria_dip_alc` y
 * `DistribucionCategoriaPartido_dip_alc` del front Vue de 2024, que hacían el
 * cálculo en el navegador sobre `funciones_distribucion.php` y
 * `api_distribucion_partido.php`). Aquí todo el cálculo vive en el backend.
 *
 * - Por candidatura: votos de cada integrante de la candidatura (partidos y
 *   combinaciones de coalición/candidatura común) y su total (`campo_votos`).
 *   Solo actas del tipo de elección, como en 2024.
 * - Por partido: votos individuales de cada partido más lo que recibe de
 *   cada combinación, con el mismo reparto (`repartirVotosCombinaciones`) y
 *   universo (diputaciones suma también RP) que la gráfica por partido.
 *
 * El nombre de la persona candidata sale del JSON de SIREC de 2024
 * (`db/candidatos.json`, solo diputaciones y alcaldías); sin él se usa la
 * descripción del catálogo.
 */
@Injectable()
export class DistribucionVotosService {
  private candidatosSirec?: Promise<EleccionSirec[]>;

  constructor(
    private readonly catalogo: TipoEleccionCatalogoService,
    private readonly grafica: GraficaService,
  ) {}

  async obtener(
    type: TipoEleccion,
    distOAlcaldia: number,
    seccion: number,
    casilla: string | null,
  ): Promise<DistribucionVotosRespuesta> {
    const sinDemarcacion =
      type !== TipoEleccion.JEFATURA_GOBIERNO && !distOAlcaldia;
    if (type === TipoEleccion.REPRESENTACION_PROPORCIONAL || sinDemarcacion) {
      return { candidaturas: [], partidos: [] };
    }

    const [candidaturas, catalogoPartidos, siglas, nombres] = await Promise.all(
      [
        this.catalogo.getCandidaturasDistribucion(type, distOAlcaldia),
        this.catalogo.getCatalogoDistribucion(type),
        this.catalogo.getSiglasParticipantes(),
        this.nombresSirec(type, distOAlcaldia),
      ],
    );

    const filtros: FiltrosResumen = {
      tiposEleccion: [type],
      geoColumn: this.catalogo.geoColumn(type),
      distOAlcaldia,
      seccion,
      casilla,
    };

    // Participantes que compiten en la demarcación: las candidaturas y sus integrantes.
    const enDemarcacion = new Set(
      candidaturas.flatMap(({ idParticipante, integrantes }) => [
        Number(idParticipante),
        ...integrantes,
      ]),
    );
    const partidos = catalogoPartidos.partidos.filter(({ idParticipante }) =>
      enDemarcacion.has(Number(idParticipante)),
    );
    const combinaciones = catalogoPartidos.combinaciones.filter(
      ({ campoVotos }) =>
        enDemarcacion.has(Number(campoVotos.replace('votos_part_', ''))),
    );

    const [votosCandidaturas, votosPartidos] = await Promise.all([
      this.grafica.sumarResumen(
        [
          ...new Set(
            candidaturas.flatMap((candidatura) => [
              candidatura.campoVotos,
              ...this.idsAportes(candidatura).map(columnaPartido),
            ]),
          ),
        ],
        filtros,
      ),
      this.grafica.sumarResumen(
        [...partidos, ...combinaciones].map(({ campoVotos }) => campoVotos),
        { ...filtros, tiposEleccion: tiposEleccionConRp(type) },
      ),
    ]);

    return {
      candidaturas: candidaturas.map((candidatura) =>
        this.filaCandidatura(candidatura, votosCandidaturas, siglas, nombres),
      ),
      partidos: this.filasPartidos(
        partidos.map(({ idParticipante }) => Number(idParticipante)),
        combinaciones,
        votosPartidos,
        siglas,
      ),
    };
  }

  /** Integrantes de una coalición o candidatura común más su propia columna de combinación (`votos_part_10`, `votos_part_14`). */
  private idsAportes({
    idParticipante,
    integrantes,
  }: CandidaturaDistribucion): number[] {
    if (integrantes.length === 0) return [];
    return [...new Set([...integrantes, Number(idParticipante)])].sort(
      (a, b) => a - b,
    );
  }

  private filaCandidatura(
    candidatura: CandidaturaDistribucion,
    votos: ResumenGraficaFila,
    siglas: Map<number, string>,
    nombres: Map<number, string>,
  ): DistribucionCandidatura {
    const idParticipante = Number(candidatura.idParticipante);
    const siglasCandidatura = candidatura.siglas ?? '';
    const total = Number(votos[candidatura.campoVotos] ?? 0);
    const aportes = this.idsAportes(candidatura).map((id) => ({
      siglas: siglas.get(id) ?? '',
      votos: Number(votos[columnaPartido(id)] ?? 0),
    }));
    // Como 2024, se omiten los integrantes sin votos (p. ej. PVEM, PT y MORENA
    // cuando la coalición registra todo en `votos_part_14`), salvo que aún no
    // haya votos y se muestre la candidatura completa.
    const conVotos = aportes.filter(({ votos }) => votos > 0);

    return {
      nombre:
        nombres.get(idParticipante) ??
        candidatura.descripcion ??
        siglasCandidatura,
      siglas: siglasCandidatura,
      aportes:
        aportes.length === 0
          ? [{ siglas: siglasCandidatura, votos: total }]
          : conVotos.length > 0
            ? conVotos
            : aportes,
      total,
    };
  }

  private filasPartidos(
    idsPartidos: number[],
    combinaciones: CombinacionCatalogo[],
    votos: ResumenGraficaFila,
    siglas: Map<number, string>,
  ): DistribucionPartido[] {
    const votosIndividuales = new Map(
      idsPartidos.map((id) => [id, Number(votos[columnaPartido(id)] ?? 0)]),
    );
    const repartos = repartirVotosCombinaciones(
      votosIndividuales,
      combinaciones.map(({ campoVotos, integrantes, porcentajes }) => ({
        integrantes,
        votos: Number(votos[campoVotos] ?? 0),
        porcentajes,
      })),
    );

    return idsPartidos.map((id) => {
      const individual = votosIndividuales.get(id) ?? 0;
      const coalicion = repartos.flatMap(({ integrantes, partes }, indice) => {
        const posicion = integrantes.indexOf(id);
        if (posicion === -1) return [];
        const idCombinacion = Number(
          combinaciones[indice].campoVotos.replace('votos_part_', ''),
        );
        return [
          { siglas: siglas.get(idCombinacion) ?? '', votos: partes[posicion] },
        ];
      });
      return {
        siglas: siglas.get(id) ?? '',
        individual,
        coalicion,
        total: coalicion.reduce((suma, { votos }) => suma + votos, individual),
      };
    });
  }

  private async nombresSirec(
    type: TipoEleccion,
    distOAlcaldia: number,
  ): Promise<Map<number, string>> {
    this.candidatosSirec ??= readFile(RUTA_CANDIDATOS_SIREC, 'utf8').then(
      (contenido) => JSON.parse(contenido) as EleccionSirec[],
    );
    const elecciones = await this.candidatosSirec;
    const candidatos =
      elecciones.find((eleccion) => eleccion.type === type)?.candidatos ?? [];

    return new Map(
      candidatos
        .filter(({ id_ambito }) => id_ambito === distOAlcaldia)
        .map(({ id_participante, nombre_completo }) => [
          Number(id_participante),
          normalizarNombre(nombre_completo),
        ]),
    );
  }
}
