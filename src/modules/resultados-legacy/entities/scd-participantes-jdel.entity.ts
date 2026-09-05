import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity({ name: 'scd_participantes_jdel' })
export class ScdParticipantesJdelEntity {
  @PrimaryColumn({ name: 'rowid', type: 'int' })
  rowid: number;

  @Column({ name: 'id_delegacion', type: 'int', nullable: true })
  idDelegacion: number | null;

  @Column({ name: 'id_participante', type: 'int', nullable: true })
  idParticipante: number | null;

  @Column({ name: 'tipo_participante', type: 'int', nullable: true })
  tipoParticipante: number | null;

  @Column({ name: 'prelacion', type: 'int', nullable: true })
  prelacion: number | null;

  @Column({ name: 'integrantes', type: 'text', nullable: true })
  integrantes: string | null;

  @Column({ name: 'integrantesPartidosCC', type: 'text', nullable: true })
  integrantesPartidosCC: string | null;

  @Column({ name: 'porcentaje', type: 'text', nullable: true })
  porcentaje: string | null;

  @Column({ name: 'fecha_alta', type: 'text', nullable: true })
  fechaAlta: string | null;
}
