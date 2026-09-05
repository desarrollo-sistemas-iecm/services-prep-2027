import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity({ name: 'dig_actas_prep' })
export class DigActasPrepEntity {
  @PrimaryColumn({ name: 'rowid', type: 'int' })
  rowid: number;

  @Column({ name: 'id_acta', type: 'int', nullable: true })
  idActa: number | null;

  @Column({ name: 'id_distrito', type: 'int', nullable: true })
  idDistrito: number | null;

  @Column({ name: 'acta', type: 'text', nullable: true })
  acta: string | null;

  @Column({ name: 'img_nombre_jgob', type: 'text', nullable: true })
  imgNombreJgob: string | null;

  @Column({ name: 'img_nombre_alc', type: 'text', nullable: true })
  imgNombreAlc: string | null;

  @Column({ name: 'img_nombre_dmr', type: 'text', nullable: true })
  imgNombreDmr: string | null;

  @Column({ name: 'img_nombre_rp', type: 'text', nullable: true })
  imgNombreRp: string | null;

  @Column({ name: 'id_usuario', type: 'int', nullable: true })
  idUsuario: number | null;

  @Column({ name: 'estatus', type: 'int', nullable: true })
  estatus: number | null;

  @Column({ name: 'md5_img_jgob', type: 'text', nullable: true })
  md5ImgJgob: string | null;

  @Column({ name: 'md5_img_alc', type: 'text', nullable: true })
  md5ImgAlc: string | null;

  @Column({ name: 'md5_img_dmr', type: 'text', nullable: true })
  md5ImgDmr: string | null;

  @Column({ name: 'md5_img_rp', type: 'text', nullable: true })
  md5ImgRp: string | null;

  @Column({ name: 'especial', type: 'int', nullable: true })
  especial: number | null;

  @Column({ name: 'fecha_jgob', type: 'text', nullable: true })
  fechaJgob: string | null;

  @Column({ name: 'fecha_alc', type: 'text', nullable: true })
  fechaAlc: string | null;

  @Column({ name: 'fecha_dmr', type: 'text', nullable: true })
  fechaDmr: string | null;

  @Column({ name: 'fecha_rp', type: 'text', nullable: true })
  fechaRp: string | null;

  @Column({ name: 'fechaRecepcion', type: 'text', nullable: true })
  fechaRecepcion: string | null;

  @Column({ name: 'usrRecepcion', type: 'int', nullable: true })
  usrRecepcion: number | null;

  @Column({ name: 'id_delegacion', type: 'int', nullable: true })
  idDelegacion: number | null;

  @Column({ name: 'id_sesion', type: 'int', nullable: true })
  idSesion: number | null;
}
