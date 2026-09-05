import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity({ name: 'scd_candidatos_jdel' })
export class ScdCandidatosJdelEntity {
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

  @Column({ name: 'campo_votos', type: 'text', nullable: true })
  campoVotos: string | null;

  @Column({ name: 'fecha_alta', type: 'text', nullable: true })
  fechaAlta: string | null;
}
