import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity({ name: 'prep_cat_inconsistencias' })
export class PrepCatInconsistenciasEntity {
  @PrimaryColumn({ name: 'rowid', type: 'int' })
  rowid: number;

  @Column({ name: 'id_inconsistencia', type: 'int', nullable: true })
  idInconsistencia: number | null;

  @Column({ name: 'tipo_inconsistencia', type: 'int', nullable: true })
  tipoInconsistencia: number | null;

  @Column({ name: 'descripcion', type: 'text', nullable: true })
  descripcion: string | null;

  @Column({ name: 'descripcion_abrev', type: 'text', nullable: true })
  descripcionAbrev: string | null;

  @Column({ name: 'id_usuario', type: 'int', nullable: true })
  idUsuario: number | null;

  @Column({ name: 'fecha_alta', type: 'text', nullable: true })
  fechaAlta: string | null;

  @Column({ name: 'fecha_modif', type: 'text', nullable: true })
  fechaModif: string | null;

  @Column({ name: 'estatus', type: 'text', nullable: true })
  estatus: string | null;
}
