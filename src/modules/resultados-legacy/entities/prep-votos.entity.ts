import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity({ name: 'prep_votos' })
export class PrepVotosEntity {
  @PrimaryColumn({ name: 'rowid', type: 'int' })
  rowid: number;

  @Column({ name: 'id_distrito', type: 'int', nullable: false })
  idDistrito: number;

  @Column({ name: 'id_delegacion', type: 'int', nullable: true })
  idDelegacion: number | null;

  @Column({ name: 'id_seccion', type: 'int', nullable: true })
  idSeccion: number | null;

  @Column({ name: 'tipo_casilla', type: 'text', nullable: true })
  tipoCasilla: string | null;

  @Column({ name: 'clave_mdc', type: 'text', nullable: true })
  claveMdc: string | null;

  @Column({ name: 'id_tipo_eleccion', type: 'int', nullable: true })
  idTipoEleccion: number | null;

  @Column({ name: 'tipo_acta', type: 'int', nullable: true })
  tipoActa: number | null;

  @Column({ name: 'votos_part_1', type: 'int', nullable: true })
  votosPart1: number | null;

  @Column({ name: 'votos_part_2', type: 'int', nullable: true })
  votosPart2: number | null;

  @Column({ name: 'votos_part_3', type: 'int', nullable: true })
  votosPart3: number | null;

  @Column({ name: 'votos_part_4', type: 'int', nullable: true })
  votosPart4: number | null;

  @Column({ name: 'votos_part_5', type: 'int', nullable: true })
  votosPart5: number | null;

  @Column({ name: 'votos_part_6', type: 'int', nullable: true })
  votosPart6: number | null;

  @Column({ name: 'votos_part_7', type: 'int', nullable: true })
  votosPart7: number | null;

  @Column({ name: 'votos_part_8', type: 'int', nullable: true })
  votosPart8: number | null;

  @Column({ name: 'votos_part_9', type: 'int', nullable: true })
  votosPart9: number | null;

  @Column({ name: 'votos_part_10', type: 'int', nullable: true })
  votosPart10: number | null;

  @Column({ name: 'votos_part_11', type: 'int', nullable: true })
  votosPart11: number | null;

  @Column({ name: 'votos_part_12', type: 'int', nullable: true })
  votosPart12: number | null;

  @Column({ name: 'votos_part_13', type: 'int', nullable: true })
  votosPart13: number | null;

  @Column({ name: 'votos_part_14', type: 'int', nullable: true })
  votosPart14: number | null;

  @Column({ name: 'votos_part_15', type: 'int', nullable: true })
  votosPart15: number | null;

  @Column({ name: 'votos_part_16', type: 'int', nullable: true })
  votosPart16: number | null;

  @Column({ name: 'votos_part_17', type: 'int', nullable: true })
  votosPart17: number | null;

  @Column({ name: 'votos_part_18', type: 'int', nullable: true })
  votosPart18: number | null;

  @Column({ name: 'votos_part_19', type: 'int', nullable: true })
  votosPart19: number | null;

  @Column({ name: 'votos_part_20', type: 'int', nullable: true })
  votosPart20: number | null;

  @Column({ name: 'votos_part_21', type: 'int', nullable: true })
  votosPart21: number | null;

  @Column({ name: 'votos_part_22', type: 'int', nullable: true })
  votosPart22: number | null;

  @Column({ name: 'votos_part_23', type: 'int', nullable: true })
  votosPart23: number | null;

  @Column({ name: 'votos_part_24', type: 'int', nullable: true })
  votosPart24: number | null;

  @Column({ name: 'votos_part_25', type: 'int', nullable: true })
  votosPart25: number | null;

  @Column({ name: 'votos_part_26', type: 'int', nullable: true })
  votosPart26: number | null;

  @Column({ name: 'votos_part_27', type: 'int', nullable: true })
  votosPart27: number | null;

  @Column({ name: 'votos_part_28', type: 'int', nullable: true })
  votosPart28: number | null;

  @Column({ name: 'votos_part_29', type: 'int', nullable: true })
  votosPart29: number | null;

  @Column({ name: 'votos_part_30', type: 'int', nullable: true })
  votosPart30: number | null;

  @Column({ name: 'votos_part_31', type: 'int', nullable: true })
  votosPart31: number | null;

  @Column({ name: 'votos_part_32', type: 'int', nullable: true })
  votosPart32: number | null;

  @Column({ name: 'votos_part_33', type: 'int', nullable: true })
  votosPart33: number | null;

  @Column({ name: 'votos_part_34', type: 'int', nullable: true })
  votosPart34: number | null;

  @Column({ name: 'votos_part_35', type: 'int', nullable: true })
  votosPart35: number | null;

  @Column({ name: 'total_votos_cc1', type: 'int', nullable: true })
  totalVotosCc1: number | null;

  @Column({ name: 'total_votos_cc2', type: 'int', nullable: true })
  totalVotosCc2: number | null;

  @Column({ name: 'total_votos_cc3', type: 'int', nullable: true })
  totalVotosCc3: number | null;

  @Column({ name: 'total_votos_cc4', type: 'int', nullable: true })
  totalVotosCc4: number | null;

  @Column({ name: 'total_votos_cc5', type: 'int', nullable: true })
  totalVotosCc5: number | null;

  @Column({ name: 'total_votos_cc6', type: 'int', nullable: true })
  totalVotosCc6: number | null;

  @Column({ name: 'total_votos_cc7', type: 'int', nullable: true })
  totalVotosCc7: number | null;

  @Column({ name: 'total_votos_cc8', type: 'int', nullable: true })
  totalVotosCc8: number | null;

  @Column({ name: 'total_votos_cc9', type: 'int', nullable: true })
  totalVotosCc9: number | null;

  @Column({ name: 'votos_cand_no_reg', type: 'int', nullable: true })
  votosCandNoReg: number | null;

  @Column({ name: 'votos_nulos', type: 'int', nullable: true })
  votosNulos: number | null;

  @Column({ name: 'votacion_total', type: 'int', nullable: true })
  votacionTotal: number | null;

  @Column({ name: 'boletas_sob', type: 'int', nullable: true })
  boletasSob: number | null;

  @Column({ name: 'ciudadanos_votaron', type: 'int', nullable: true })
  ciudadanosVotaron: number | null;

  @Column({ name: 'representantes_votaron', type: 'int', nullable: true })
  representantesVotaron: number | null;

  @Column({ name: 'total_votaron', type: 'int', nullable: true })
  totalVotaron: number | null;

  @Column({ name: 'boletas_extraidas', type: 'int', nullable: true })
  boletasExtraidas: number | null;

  @Column({ name: 'total_sobres', type: 'int', nullable: true })
  totalSobres: number | null;

  @Column({ name: 'id_usuario', type: 'int', nullable: true })
  idUsuario: number | null;

  @Column({ name: 'fecha_alta', type: 'text', nullable: true })
  fechaAlta: string | null;

  @Column({ name: 'fecha_modif', type: 'text', nullable: true })
  fechaModif: string | null;

  @Column({ name: 'estatus', type: 'text', nullable: true })
  estatus: string | null;

  @Column({ name: 'validado', type: 'text', nullable: true })
  validado: string | null;

  @Column({ name: 'editado', type: 'text', nullable: true })
  editado: string | null;

  @Column({ name: 'inconsistencia', type: 'int', nullable: true })
  inconsistencia: number | null;

  @Column({ name: 'exede_ln', type: 'text', nullable: true })
  exedeLn: string | null;

  @Column({ name: 'contabilizar', type: 'text', nullable: true })
  contabilizar: string | null;

  @Column({ name: 'capturado_por', type: 'int', nullable: true })
  capturadoPor: number | null;

  @Column({ name: 'en_verificacion', type: 'int', nullable: true })
  enVerificacion: number | null;

  @Column({
    name: 'ue_identificador_comprobante',
    type: 'text',
    nullable: true,
  })
  ueIdentificadorComprobante: string | null;

  @Column({ name: 'ue_circunscripcion_federal', type: 'text', nullable: true })
  ueCircunscripcionFederal: string | null;

  @Column({ name: 'ue_id_casilla', type: 'text', nullable: true })
  ueIdCasilla: string | null;

  @Column({ name: 'ue_tipo_casilla', type: 'text', nullable: true })
  ueTipoCasilla: string | null;

  @Column({ name: 'ue_id_ext_contigua', type: 'text', nullable: true })
  ueIdExtContigua: string | null;

  @Column({ name: 'ue_tipo_documento', type: 'text', nullable: true })
  ueTipoDocumento: string | null;

  @Column({ name: 'ue_personas_votaron', type: 'text', nullable: true })
  uePersonasVotaron: string | null;

  @Column({ name: 'ue_identificacion', type: 'text', nullable: true })
  ueIdentificacion: string | null;

  @Column({ name: 'ue_votos_partidos', type: 'text', nullable: true })
  ueVotosPartidos: string | null;

  @Column({ name: 'ue_version_software', type: 'text', nullable: true })
  ueVersionSoftware: string | null;

  @Column({ name: 'ue_fecha_impresion', type: 'text', nullable: true })
  ueFechaImpresion: string | null;

  @Column({ name: 'ue_codigo_integridad', type: 'text', nullable: true })
  ueCodigoIntegridad: string | null;

  @Column({ name: 'ue_qr', type: 'text', nullable: true })
  ueQr: string | null;
}
