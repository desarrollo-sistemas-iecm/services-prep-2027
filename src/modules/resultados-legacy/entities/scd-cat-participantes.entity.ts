import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity({ name: 'scd_cat_participantes' })
export class ScdCatParticipantesEntity {
  @PrimaryColumn({ name: 'rowid', type: 'int' })
  rowid: number;

  @Column({ name: 'id_participante', type: 'int', nullable: true })
  idParticipante: number | null;

  @Column({ name: 'descripcion', type: 'text', nullable: true })
  descripcion: string | null;

  @Column({ name: 'siglas', type: 'text', nullable: true })
  siglas: string | null;

  @Column({ name: 'id_usuario', type: 'int', nullable: true })
  idUsuario: number | null;

  @Column({ name: 'fecha_alta', type: 'text', nullable: true })
  fechaAlta: string | null;

  @Column({ name: 'fecha_modif', type: 'text', nullable: true })
  fechaModif: string | null;

  @Column({ name: 'estatus', type: 'text', nullable: true })
  estatus: string | null;
}
