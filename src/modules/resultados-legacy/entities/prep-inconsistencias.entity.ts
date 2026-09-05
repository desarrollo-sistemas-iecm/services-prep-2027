import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity({ name: 'prep_inconsistencias' })
export class PrepInconsistenciasEntity {
  @PrimaryColumn({ name: 'rowid', type: 'int' })
  rowid: number;

  @Column({ name: 'id_distrito', type: 'int', nullable: true })
  idDistrito: number | null;

  @Column({ name: 'id_delegacion', type: 'int', nullable: true })
  idDelegacion: number | null;

  @Column({ name: 'id_seccion', type: 'int', nullable: true })
  idSeccion: number | null;

  @Column({ name: 'tipo_casilla', type: 'text', nullable: true })
  tipoCasilla: string | null;

  @Column({ name: 'id_tipo_eleccion', type: 'int', nullable: true })
  idTipoEleccion: number | null;

  @Column({ name: 'tipo_acta', type: 'int', nullable: true })
  tipoActa: number | null;

  @Column({ name: 'id_inconsistencia', type: 'int', nullable: true })
  idInconsistencia: number | null;

  @Column({ name: 'campo', type: 'text', nullable: true })
  campo: string | null;

  @Column({ name: 'id_usuario', type: 'int', nullable: true })
  idUsuario: number | null;

  @Column({ name: 'fecha_alta', type: 'text', nullable: true })
  fechaAlta: string | null;

  @Column({ name: 'fecha_modif', type: 'text', nullable: true })
  fechaModif: string | null;

  @Column({ name: 'estatus', type: 'text', nullable: true })
  estatus: string | null;
}
