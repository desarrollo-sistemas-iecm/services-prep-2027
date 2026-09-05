import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity({ name: 'scd_cat_tipo_eleccion' })
export class ScdCatTipoEleccionEntity {
  @PrimaryColumn({ name: 'rowid', type: 'int' })
  rowid: number;

  @Column({ name: 'id_tipo_eleccion', type: 'int', nullable: true })
  idTipoEleccion: number | null;

  @Column({ name: 'descripcion', type: 'text', nullable: true })
  descripcion: string | null;

  @Column({ name: 'id_usuario', type: 'int', nullable: true })
  idUsuario: number | null;

  @Column({ name: 'fecha_alta', type: 'text', nullable: true })
  fechaAlta: string | null;

  @Column({ name: 'fecha_modif', type: 'text', nullable: true })
  fechaModif: string | null;

  @Column({ name: 'estatus', type: 'int', nullable: true })
  estatus: number | null;
}
