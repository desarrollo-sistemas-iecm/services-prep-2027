import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { CorteStatus } from '../enums/corte-status.enum';

/**
 * Control propio de publicación de cortes (base `control.db3`).
 * No confundir con `CorteLegacyEntity` (tabla `corte` dentro de
 * `database.db3`, dataset ajeno reemplazado por el difusor).
 */
@Entity({ name: 'corte_releases' })
export class CorteReleaseEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Index({ unique: true })
  @Column({ name: 'cut_id', type: 'varchar', length: 64 })
  cutId: string;

  @Column({ name: 'version', type: 'varchar', length: 32 })
  version: string;

  @Column({ name: 'activation_at', type: 'datetime' })
  activationAt: Date;

  @Column({ type: 'varchar', length: 16, default: CorteStatus.UPLOADED })
  status: CorteStatus;

  @Column({ name: 'file_sha256', type: 'varchar', length: 64 })
  fileSha256: string;

  @Column({ name: 'staged_file_path', type: 'varchar', length: 512 })
  stagedFilePath: string;

  @Column({
    name: 'issued_by_subject',
    type: 'varchar',
    length: 128,
    nullable: true,
  })
  issuedBySubject: string | null;

  @Column({
    name: 'failure_reason',
    type: 'varchar',
    length: 256,
    nullable: true,
  })
  failureReason: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
