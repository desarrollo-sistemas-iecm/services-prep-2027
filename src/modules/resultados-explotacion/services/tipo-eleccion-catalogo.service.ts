import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TipoEleccion } from '../enums/tipo-eleccion.enum';
import { ScdCandidatosJgobEntity } from '../../resultados-legacy/entities/scd-candidatos-jgob.entity';
import { ScdCandidatosMrEntity } from '../../resultados-legacy/entities/scd-candidatos-mr.entity';
import { ScdCandidatosJdelEntity } from '../../resultados-legacy/entities/scd-candidatos-jdel.entity';
import { ScdParticipantesJgobEntity } from '../../resultados-legacy/entities/scd-participantes-jgob.entity';
import { ScdParticipantesMrEntity } from '../../resultados-legacy/entities/scd-participantes-mr.entity';
import { ScdParticipantesRpEntity } from '../../resultados-legacy/entities/scd-participantes-rp.entity';
import { ScdParticipantesJdelEntity } from '../../resultados-legacy/entities/scd-participantes-jdel.entity';
import { ScdCatParticipantesEntity } from '../../resultados-legacy/entities/scd-cat-participantes.entity';

export interface CandidatoCatalogo {
  idParticipante: number;
  descripcion: string | null;
  siglas: string | null;
  campoVotos: string;
}

export interface ParticipanteCatalogo {
  idParticipante: number;
  descripcion: string | null;
  siglas: string | null;
  tipoParticipante: number | null;
  prelacion: number | null;
  integrantes: string | null;
}

export interface CombinacionCatalogo {
  campoVotos: string;
  integrantes: number[];
  porcentajes?: number[];
}

export interface CatalogoDistribucion {
  partidos: CandidatoCatalogo[];
  combinaciones: CombinacionCatalogo[];
}

/** `'4&5&7'` → `[4, 5, 7]`; vacío o nulo → `[]`. */
const separarLista = (valor: string | null): number[] =>
  (valor ?? '')
    .split('&')
    .filter((elemento) => elemento.trim() !== '')
    .map(Number);

/**
 * Nombre de la columna que identifica un voto individual (`votos_part_N`) o
 * de candidatura común/coalición (`total_votos_ccN`) en `prep_votos`.
 * Validado contra un allowlist antes de interpolarse en SQL crudo — no viene
 * de entrada del cliente, pero sí de una columna de texto en catálogo
 * (`scd_candidatos_*.campo_votos`), y SQL no permite parametrizar nombres de
 * columna.
 */
const CAMPO_VOTOS_PATTERN = /^(votos_part_\d{1,2}|total_votos_cc\d)$/;

export function asColumnaVotosSegura(campoVotos: string): string {
  if (!CAMPO_VOTOS_PATTERN.test(campoVotos)) {
    throw new Error(`Nombre de columna de votos no reconocido: ${campoVotos}`);
  }
  return campoVotos;
}

/**
 * Catálogos y reglas de mapeo por tipo de elección, centralizados aquí para
 * no repetir el switch(type) en cada servicio — es la duplicación más grande
 * señalada en `docs/CONSULTAS_SQL_PREP2024.md` ("Duplicación de queries", punto 1).
 */
@Injectable()
export class TipoEleccionCatalogoService {
  constructor(
    @InjectRepository(ScdCandidatosJgobEntity, 'resultados')
    private readonly candidatosJgobRepo: Repository<ScdCandidatosJgobEntity>,
    @InjectRepository(ScdCandidatosMrEntity, 'resultados')
    private readonly candidatosMrRepo: Repository<ScdCandidatosMrEntity>,
    @InjectRepository(ScdCandidatosJdelEntity, 'resultados')
    private readonly candidatosJdelRepo: Repository<ScdCandidatosJdelEntity>,
    @InjectRepository(ScdParticipantesJgobEntity, 'resultados')
    private readonly participantesJgobRepo: Repository<ScdParticipantesJgobEntity>,
    @InjectRepository(ScdParticipantesMrEntity, 'resultados')
    private readonly participantesMrRepo: Repository<ScdParticipantesMrEntity>,
    @InjectRepository(ScdParticipantesRpEntity, 'resultados')
    private readonly participantesRpRepo: Repository<ScdParticipantesRpEntity>,
    @InjectRepository(ScdParticipantesJdelEntity, 'resultados')
    private readonly participantesJdelRepo: Repository<ScdParticipantesJdelEntity>,
    @InjectRepository(ScdCatParticipantesEntity, 'resultados')
    private readonly catParticipantesRepo: Repository<ScdCatParticipantesEntity>,
  ) {}

  /**
   * Columna geográfica usada por `prep_votos`/`scd_casillas` y por las tablas
   * de candidatos/participantes: `id_distrito` para JG/MR/RP, `id_delegacion`
   * para ALC. Ver tabla "Mapeo de tipo de elección" en
   * `docs/MIGRACION_APIS_PREP2024.md`.
   */
  geoColumn(type: TipoEleccion): 'id_distrito' | 'id_delegacion' {
    return type === TipoEleccion.ALCALDIA ? 'id_delegacion' : 'id_distrito';
  }

  /**
   * Regla distinta y específica de `api_subcategories.php`/`api_items.php`
   * (combos 2 y 3): ahí solo JG/MR filtran por `id_distrito`; RP y ALC
   * filtran por `id_delegacion`. No unificar con `geoColumn()`.
   */
  geoColumnCombo(type: TipoEleccion): 'id_distrito' | 'id_delegacion' {
    return type === TipoEleccion.JEFATURA_GOBIERNO ||
      type === TipoEleccion.DIPUTACION_MR
      ? 'id_distrito'
      : 'id_delegacion';
  }

  /**
   * Catálogo de candidatos (`getCandidatos()` en `funciones.php`, doc §1.15).
   * RP no tiene tabla `scd_candidatos_rp` — regresa vacío, igual que en 2024.
   */
  async getCandidatos(type: TipoEleccion): Promise<CandidatoCatalogo[]> {
    switch (type) {
      case TipoEleccion.JEFATURA_GOBIERNO:
        return this.mapCandidatos(
          await this.candidatosJgobRepo
            .createQueryBuilder('c')
            .leftJoin(
              ScdCatParticipantesEntity,
              'p',
              'p.idParticipante = c.idParticipante',
            )
            .distinct(true)
            .select('c.idParticipante', 'idParticipante')
            .addSelect('p.descripcion', 'descripcion')
            .addSelect('p.siglas', 'siglas')
            .addSelect('c.campoVotos', 'campoVotos')
            .getRawMany(),
        );
      case TipoEleccion.DIPUTACION_MR:
        return this.mapCandidatos(
          await this.candidatosMrRepo
            .createQueryBuilder('c')
            .leftJoin(
              ScdCatParticipantesEntity,
              'p',
              'p.idParticipante = c.idParticipante',
            )
            .distinct(true)
            .select('c.idParticipante', 'idParticipante')
            .addSelect('p.descripcion', 'descripcion')
            .addSelect('p.siglas', 'siglas')
            .addSelect('c.campoVotos', 'campoVotos')
            .getRawMany(),
        );
      case TipoEleccion.ALCALDIA:
        return this.mapCandidatos(
          await this.candidatosJdelRepo
            .createQueryBuilder('c')
            .leftJoin(
              ScdCatParticipantesEntity,
              'p',
              'p.idParticipante = c.idParticipante',
            )
            .distinct(true)
            .select('c.idParticipante', 'idParticipante')
            .addSelect('p.descripcion', 'descripcion')
            .addSelect('p.siglas', 'siglas')
            .addSelect('c.campoVotos', 'campoVotos')
            .getRawMany(),
        );
      case TipoEleccion.REPRESENTACION_PROPORCIONAL:
        // No existe `scd_candidatos_rp` — igual que en el PHP 2024
        // (`getCandidatos()`), RP no tiene catálogo de candidatos propio. La
        // grilla RP (`ActasModalidadService`) arma sus columnas desde
        // `getParticipantesDistintos(REPRESENTACION_PROPORCIONAL)`, como
        // `actas_grid_data_rp.php` (§6.1). El filtro `id_participante > 11`
        // ("TEMPORAL" en 2024) no se porta: el catálogo vigente solo tiene
        // ids 1–7 y `_voto_prision_ant.php` tampoco lo aplicaba.
        return [];
    }
  }

  private mapCandidatos(
    rows: {
      idParticipante: number;
      descripcion: string | null;
      siglas: string | null;
      campoVotos: string;
    }[],
  ): CandidatoCatalogo[] {
    return rows.map((r) => ({
      idParticipante: r.idParticipante,
      descripcion: r.descripcion,
      siglas: r.siglas,
      campoVotos: r.campoVotos,
    }));
  }

  /**
   * Catálogo de participantes (`getFieldNameElection()`/`actas_grid_data*.php`
   * §1.10 / §4.1). `porDistritoODelegacion`, si se pasa, filtra por el mismo
   * valor de `seleccion` usado en los combos (opcional: varios endpoints
   * traen el catálogo completo sin filtrar).
   */
  async getParticipantes(
    type: TipoEleccion,
    porDistritoODelegacion?: number,
  ): Promise<ParticipanteCatalogo[]> {
    switch (type) {
      case TipoEleccion.JEFATURA_GOBIERNO: {
        const qb = this.participantesJgobRepo
          .createQueryBuilder('x')
          .leftJoin(
            ScdCatParticipantesEntity,
            'p',
            'p.idParticipante = x.idParticipante',
          )
          .select('x.idParticipante', 'idParticipante')
          .addSelect('p.descripcion', 'descripcion')
          .addSelect('p.siglas', 'siglas')
          .addSelect('x.tipoParticipante', 'tipoParticipante')
          .addSelect('x.prelacion', 'prelacion')
          .addSelect('x.integrantes', 'integrantes')
          .orderBy('x.prelacion', 'ASC');
        return this.mapParticipantes(await qb.getRawMany());
      }
      case TipoEleccion.DIPUTACION_MR: {
        const qb = this.participantesMrRepo
          .createQueryBuilder('x')
          .leftJoin(
            ScdCatParticipantesEntity,
            'p',
            'p.idParticipante = x.idParticipante',
          )
          .select('x.idParticipante', 'idParticipante')
          .addSelect('p.descripcion', 'descripcion')
          .addSelect('p.siglas', 'siglas')
          .addSelect('x.tipoParticipante', 'tipoParticipante')
          .addSelect('x.prelacion', 'prelacion')
          .addSelect('x.integrantes', 'integrantes')
          .orderBy('x.prelacion', 'ASC');
        if (porDistritoODelegacion != null) {
          qb.where('x.idDistrito = :seleccion', {
            seleccion: porDistritoODelegacion,
          });
        }
        return this.mapParticipantes(await qb.getRawMany());
      }
      case TipoEleccion.REPRESENTACION_PROPORCIONAL: {
        const qb = this.participantesRpRepo
          .createQueryBuilder('x')
          .leftJoin(
            ScdCatParticipantesEntity,
            'p',
            'p.idParticipante = x.idParticipante',
          )
          .select('x.idParticipante', 'idParticipante')
          .addSelect('p.descripcion', 'descripcion')
          .addSelect('p.siglas', 'siglas')
          .addSelect('x.tipoParticipante', 'tipoParticipante')
          .addSelect('x.prelacion', 'prelacion')
          .addSelect('x.integrantes', 'integrantes')
          .orderBy('x.prelacion', 'ASC');
        if (porDistritoODelegacion != null) {
          qb.where('x.idDistrito = :seleccion', {
            seleccion: porDistritoODelegacion,
          });
        }
        return this.mapParticipantes(await qb.getRawMany());
      }
      case TipoEleccion.ALCALDIA: {
        const qb = this.participantesJdelRepo
          .createQueryBuilder('x')
          .leftJoin(
            ScdCatParticipantesEntity,
            'p',
            'p.idParticipante = x.idParticipante',
          )
          .select('x.idParticipante', 'idParticipante')
          .addSelect('p.descripcion', 'descripcion')
          .addSelect('p.siglas', 'siglas')
          .addSelect('x.tipoParticipante', 'tipoParticipante')
          .addSelect('x.prelacion', 'prelacion')
          .addSelect('x.integrantes', 'integrantes')
          .orderBy('x.prelacion', 'ASC');
        if (porDistritoODelegacion != null) {
          qb.where('x.idDelegacion = :seleccion', {
            seleccion: porDistritoODelegacion,
          });
        }
        return this.mapParticipantes(await qb.getRawMany());
      }
    }
  }

  /**
   * Variante `DISTINCT id_participante` del catálogo de participantes
   * (§6.1/§8.1 de `actas_grid_data_rp.php`/`_voto_prision_ant.php`), para
   * grillas que no filtran por distrito/delegación: sin este dedupe, MR/RP/ALC
   * repiten cada participante una vez por distrito o delegación. Conserva el
   * orden por `prelacion` de `getParticipantes`.
   */
  async getParticipantesDistintos(
    type: TipoEleccion,
  ): Promise<ParticipanteCatalogo[]> {
    const participantes = await this.getParticipantes(type);
    const porId = new Map<number, ParticipanteCatalogo>();
    for (const participante of participantes) {
      if (!porId.has(participante.idParticipante)) {
        porId.set(participante.idParticipante, participante);
      }
    }
    return [...porId.values()];
  }

  /**
   * Catálogo para "Votos por Partido Político" (`consigueCat()` de
   * `funciones_grafica.php`): los participantes sin `integrantesPartidosCC`
   * son partidos (o candidaturas sin partido) con columna propia
   * `votos_part_N`; los que sí lo tienen son combinaciones de coalición o
   * candidatura común cuyos votos (`votos_part_N`) se reparten entre esos
   * partidos (por partes iguales, o por `porcentaje` de convenio cuando lo
   * trae, como la candidatura común en diputaciones y alcaldías). Los
   * partidos van por id, como las columnas `votos_part_N` de 2024: en MR/ALC
   * la `prelacion` cambia por distrito/delegación. RP no tiene la columna en
   * su catálogo y regresa vacío.
   */
  async getCatalogoDistribucion(
    type: TipoEleccion,
  ): Promise<CatalogoDistribucion> {
    const repo = this.participantesConCombinacionesRepo(type);
    if (!repo) {
      return { partidos: [], combinaciones: [] };
    }

    const filas = await repo
      .createQueryBuilder('x')
      .leftJoin(
        ScdCatParticipantesEntity,
        'p',
        'p.idParticipante = x.idParticipante',
      )
      .select('x.idParticipante', 'idParticipante')
      .addSelect('p.descripcion', 'descripcion')
      .addSelect('p.siglas', 'siglas')
      .addSelect('x.integrantesPartidosCC', 'integrantesPartidosCC')
      .addSelect('x.porcentaje', 'porcentaje')
      .orderBy('x.idParticipante', 'ASC')
      .getRawMany<{
        idParticipante: number;
        descripcion: string | null;
        siglas: string | null;
        integrantesPartidosCC: string | null;
        porcentaje: string | null;
      }>();

    const porId = new Map<number, (typeof filas)[number]>();
    for (const fila of filas) {
      if (!porId.has(fila.idParticipante)) {
        porId.set(fila.idParticipante, fila);
      }
    }

    const catalogo: CatalogoDistribucion = { partidos: [], combinaciones: [] };
    for (const {
      idParticipante,
      descripcion,
      siglas,
      integrantesPartidosCC,
      porcentaje,
    } of porId.values()) {
      const campoVotos = asColumnaVotosSegura(`votos_part_${idParticipante}`);
      const integrantes = separarLista(integrantesPartidosCC);

      if (integrantes.length === 0) {
        catalogo.partidos.push({
          idParticipante,
          descripcion,
          siglas,
          campoVotos,
        });
      } else {
        const porcentajes = separarLista(porcentaje);
        catalogo.combinaciones.push({
          campoVotos,
          integrantes,
          ...(porcentajes.length > 0 && { porcentajes }),
        });
      }
    }
    return catalogo;
  }

  private participantesConCombinacionesRepo(
    type: TipoEleccion,
  ): Repository<
    | ScdParticipantesJgobEntity
    | ScdParticipantesMrEntity
    | ScdParticipantesJdelEntity
  > | null {
    switch (type) {
      case TipoEleccion.JEFATURA_GOBIERNO:
        return this.participantesJgobRepo;
      case TipoEleccion.DIPUTACION_MR:
        return this.participantesMrRepo;
      case TipoEleccion.ALCALDIA:
        return this.participantesJdelRepo;
      default:
        return null;
    }
  }

  private mapParticipantes(
    rows: {
      idParticipante: number;
      descripcion: string | null;
      siglas: string | null;
      tipoParticipante: number | null;
      prelacion: number | null;
      integrantes: string | null;
    }[],
  ): ParticipanteCatalogo[] {
    return rows.map((r) => ({
      idParticipante: r.idParticipante,
      descripcion: r.descripcion,
      siglas: r.siglas,
      tipoParticipante: r.tipoParticipante,
      prelacion: r.prelacion,
      integrantes: r.integrantes,
    }));
  }
}
