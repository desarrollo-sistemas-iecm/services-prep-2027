import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity({ name: 'sedimde_enc_seguimiento' })
export class SedimdeEncSeguimientoEntity {
  @PrimaryColumn({ name: 'rowid', type: 'int' })
  rowid: number;

  @Column({ name: 'id_delegacion', type: 'int', nullable: true })
  idDelegacion: number | null;

  @Column({ name: 'id_distrito', type: 'int', nullable: true })
  idDistrito: number | null;

  @Column({ name: 'id_seccion', type: 'int', nullable: true })
  idSeccion: number | null;

  @Column({ name: 'id_casilla', type: 'text', nullable: true })
  idCasilla: string | null;

  @Column({ name: 'id_distrito_asistente', type: 'int', nullable: true })
  idDistritoAsistente: number | null;

  @Column({ name: 'id_asistente', type: 'int', nullable: true })
  idAsistente: number | null;

  @Column({ name: 'nombre_funcionario', type: 'text', nullable: true })
  nombreFuncionario: string | null;

  @Column({ name: 'cant_bol', type: 'int', nullable: true })
  cantBol: number | null;

  @Column({ name: 'delfolio_bol', type: 'int', nullable: true })
  delfolioBol: number | null;

  @Column({ name: 'alfolio_bol', type: 'int', nullable: true })
  alfolioBol: number | null;

  @Column({ name: 'deletra_ln', type: 'text', nullable: true })
  deletraLn: string | null;

  @Column({ name: 'aletra_ln', type: 'text', nullable: true })
  aletraLn: string | null;

  @Column({ name: 'canthojas_ln', type: 'int', nullable: true })
  canthojasLn: number | null;

  @Column({ name: 'fecha_prog', type: 'text', nullable: true })
  fechaProg: string | null;

  @Column({ name: 'lugar_prog', type: 'text', nullable: true })
  lugarProg: string | null;

  @Column({ name: 'dm_entregado', type: 'text', nullable: true })
  dmEntregado: string | null;

  @Column({ name: 'dm_fecha_entregado', type: 'text', nullable: true })
  dmFechaEntregado: string | null;

  @Column({ name: 'dm_lugar_entregado', type: 'text', nullable: true })
  dmLugarEntregado: string | null;

  @Column({ name: 'dm_nombre_funcionario', type: 'text', nullable: true })
  dmNombreFuncionario: string | null;

  @Column({ name: 'id_personalentrega', type: 'int', nullable: true })
  idPersonalEntrega: number | null;

  @Column({ name: 'cm_llegada', type: 'int', nullable: true })
  cmLlegada: number | null;

  @Column({ name: 'cm_fecha_llegada', type: 'text', nullable: true })
  cmFechaLlegada: string | null;

  @Column({ name: 'pe_llegada', type: 'int', nullable: true })
  peLlegada: number | null;

  @Column({ name: 'pe_fecha_llegada', type: 'text', nullable: true })
  peFechaLlegada: string | null;

  @Column({ name: 'pe_recibido', type: 'int', nullable: true })
  peRecibido: number | null;

  @Column({ name: 'pe_fecha_recibido', type: 'text', nullable: true })
  peFechaRecibido: string | null;

  @Column({ name: 'pe_alterado', type: 'int', nullable: true })
  peAlterado: number | null;

  @Column({ name: 'pe_causa', type: 'text', nullable: true })
  peCausa: string | null;

  @Column({ name: 'pe_acta_jg', type: 'int', nullable: true })
  peActaJg: number | null;

  @Column({ name: 'pe_acta_damr', type: 'int', nullable: true })
  peActaDamr: number | null;

  @Column({ name: 'pe_acta_darp', type: 'int', nullable: true })
  peActaDarp: number | null;

  @Column({ name: 'pe_acta_jd', type: 'int', nullable: true })
  peActaJd: number | null;

  @Column({ name: 'pe_nombre_funcionario', type: 'text', nullable: true })
  peNombreFuncionario: string | null;

  @Column({ name: 'pe_cargo_funcionario', type: 'text', nullable: true })
  peCargoFuncionario: string | null;

  @Column({ name: 'id_personalrecibe', type: 'int', nullable: true })
  idPersonalRecibe: number | null;

  @Column({ name: 'id_estado_seg', type: 'int', nullable: true })
  idEstadoSeg: number | null;

  @Column({ name: 'seg_obs', type: 'text', nullable: true })
  segObs: string | null;

  @Column({ name: 'id_usuario', type: 'int', nullable: true })
  idUsuario: number | null;

  @Column({ name: 'fecha_alta', type: 'text', nullable: true })
  fechaAlta: string | null;

  @Column({ name: 'fecha_modif', type: 'text', nullable: true })
  fechaModif: string | null;

  @Column({ name: 'status', type: 'int', nullable: true })
  status: number | null;

  @Column({ name: 'delfoliojd_bol', type: 'int', nullable: true })
  delfolioJdBol: number | null;

  @Column({ name: 'alfoliojd_bol', type: 'int', nullable: true })
  alfolioJdBol: number | null;

  @Column({ name: 'delfoliodip_bol', type: 'int', nullable: true })
  delfolioDipBol: number | null;

  @Column({ name: 'alfoliodip_bol', type: 'int', nullable: true })
  alfolioDipBol: number | null;

  @Column({ name: 'id_casilla1', type: 'text', nullable: true })
  idCasilla1: string | null;

  @Column({ name: 'tipo_casilla', type: 'text', nullable: true })
  tipoCasilla: string | null;

  @Column({ name: 'ext_contigua', type: 'int', nullable: true })
  extContigua: number | null;

  @Column({ name: 'cant_bol2', type: 'int', nullable: true })
  cantBol2: number | null;

  @Column({ name: 'delfolio_bol2', type: 'int', nullable: true })
  delfolioBol2: number | null;

  @Column({ name: 'alfolio_bol2', type: 'int', nullable: true })
  alfolioBol2: number | null;

  @Column({ name: 'cant_act_matele', type: 'text', nullable: true })
  cantActMatele: string | null;

  @Column({ name: 'delfolio_bol3', type: 'int', nullable: true })
  delfolioBol3: number | null;

  @Column({ name: 'alfolio_bol3', type: 'int', nullable: true })
  alfolioBol3: number | null;
}
