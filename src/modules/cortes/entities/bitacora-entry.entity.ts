import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity({ name: 'bitacora' })
export class BitacoraEntryEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 64 })
  action: string;

  @Column({ name: 'cut_id', type: 'varchar', length: 64, nullable: true })
  cutId: string | null;

  @Column({
    name: 'actor_subject',
    type: 'varchar',
    length: 128,
    nullable: true,
  })
  actorSubject: string | null;

  @Column({ type: 'varchar', length: 256, nullable: true })
  detail: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
