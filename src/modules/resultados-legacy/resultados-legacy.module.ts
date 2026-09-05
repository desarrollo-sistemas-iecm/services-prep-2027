import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CainCatDelegacionEntity } from './entities/cain-cat-delegacion.entity';
import { CainCatDistDeleEntity } from './entities/cain-cat-dist-dele.entity';
import { CainCatDistritoEntity } from './entities/cain-cat-distrito.entity';
import { CatTipoCasillaEntity } from './entities/cat-tipo-casilla.entity';
import { ConfiguraEntity } from './entities/configura.entity';
import { CorteLegacyEntity } from './entities/corte-legacy.entity';
import { DigActasPrepEntity } from './entities/dig-actas-prep.entity';
import { NourbanasEntity } from './entities/nourbanas.entity';
import { PrepCatInconsistenciasEntity } from './entities/prep-cat-inconsistencias.entity';
import { PrepInconsistenciasEntity } from './entities/prep-inconsistencias.entity';
import { PrepVotosEntity } from './entities/prep-votos.entity';
import { ScdCandidatosJdelEntity } from './entities/scd-candidatos-jdel.entity';
import { ScdCandidatosJgobEntity } from './entities/scd-candidatos-jgob.entity';
import { ScdCandidatosMrEntity } from './entities/scd-candidatos-mr.entity';
import { ScdCasillasEntity } from './entities/scd-casillas.entity';
import { ScdCatParticipantesEntity } from './entities/scd-cat-participantes.entity';
import { ScdCatTipoEleccionEntity } from './entities/scd-cat-tipo-eleccion.entity';
import { ScdParticipantesJdelEntity } from './entities/scd-participantes-jdel.entity';
import { ScdParticipantesJgobEntity } from './entities/scd-participantes-jgob.entity';
import { ScdParticipantesMrEntity } from './entities/scd-participantes-mr.entity';
import { ScdParticipantesRpEntity } from './entities/scd-participantes-rp.entity';
import { SedimdeEncSeguimientoEntity } from './entities/sedimde-enc-seguimiento.entity';

export const RESULTADOS_LEGACY_ENTITIES = [
  CainCatDelegacionEntity,
  CainCatDistDeleEntity,
  CainCatDistritoEntity,
  CatTipoCasillaEntity,
  ConfiguraEntity,
  CorteLegacyEntity,
  DigActasPrepEntity,
  NourbanasEntity,
  PrepCatInconsistenciasEntity,
  PrepInconsistenciasEntity,
  PrepVotosEntity,
  ScdCandidatosJdelEntity,
  ScdCandidatosJgobEntity,
  ScdCandidatosMrEntity,
  ScdCasillasEntity,
  ScdCatParticipantesEntity,
  ScdCatTipoEleccionEntity,
  ScdParticipantesJdelEntity,
  ScdParticipantesJgobEntity,
  ScdParticipantesMrEntity,
  ScdParticipantesRpEntity,
  SedimdeEncSeguimientoEntity,
];

export const RESULTADOS_LEGACY_TABLE_NAMES = [
  'cain_cat_delegacion',
  'cain_cat_dist_dele',
  'cain_cat_distrito',
  'cat_tipo_casilla',
  'configura',
  'corte',
  'dig_actas_prep',
  'nourbanas',
  'prep_cat_inconsistencias',
  'prep_inconsistencias',
  'prep_votos',
  'scd_candidatos_jdel',
  'scd_candidatos_jgob',
  'scd_candidatos_mr',
  'scd_casillas',
  'scd_cat_participantes',
  'scd_cat_tipo_eleccion',
  'scd_participantes_jdel',
  'scd_participantes_jgob',
  'scd_participantes_mr',
  'scd_participantes_rp',
  'sedimde_enc_seguimiento',
];

/**
 * Entidades de solo lectura sobre el dataset de resultados (`DB_STORAGE`),
 * reemplazado por completo en cada publicación de corte. Ningún servicio de
 * este módulo debe invocar save/remove/insert/update sobre estos repositorios.
 */
@Module({
  imports: [TypeOrmModule.forFeature(RESULTADOS_LEGACY_ENTITIES, 'resultados')],
  exports: [TypeOrmModule],
})
export class ResultadosLegacyModule {}
