import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity({ name: 'cain_cat_dist_dele' })
export class CainCatDistDeleEntity {
  @PrimaryColumn({ name: 'rowid', type: 'int' })
  rowid: number;

  @Column({ name: 'id_distrito', type: 'int', nullable: true })
  idDistrito: number | null;

  @Column({ name: 'id_delegacion', type: 'int', nullable: true })
  idDelegacion: number | null;

  @Column({ name: 'fecha_alta', type: 'text', nullable: true })
  fechaAlta: string | null;

  @Column({ name: 'fecha_modifica', type: 'text', nullable: true })
  fechaModifica: string | null;

  @Column({ name: 'fecha_baja', type: 'text', nullable: true })
  fechaBaja: string | null;

  @Column({ name: 'estatus', type: 'int', nullable: true })
  estatus: number | null;
}
