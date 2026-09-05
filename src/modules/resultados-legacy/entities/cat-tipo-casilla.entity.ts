import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity({ name: 'cat_tipo_casilla' })
export class CatTipoCasillaEntity {
  @PrimaryColumn({ name: 'rowid', type: 'int' })
  rowid: number;

  @Column({ name: 'id_tipo', type: 'int', nullable: true })
  idTipo: number | null;

  @Column({ name: 'casilla', type: 'text', nullable: true })
  casilla: string | null;

  @Column({ name: 'descripcion', type: 'text', nullable: true })
  descripcion: string | null;
}
