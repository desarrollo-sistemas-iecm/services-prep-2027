import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity({ name: 'cain_cat_distrito' })
export class CainCatDistritoEntity {
  @PrimaryColumn({ name: 'rowid', type: 'int' })
  rowid: number;

  @Column({ name: 'id_distrito', type: 'int', nullable: true })
  idDistrito: number | null;

  @Column({ name: 'id_delegacion', type: 'int', nullable: true })
  idDelegacion: number | null;

  @Column({ name: 'romano', type: 'text', nullable: true })
  romano: string | null;

  @Column({ name: 'direccion', type: 'text', nullable: true })
  direccion: string | null;

  @Column({ name: 'colonia', type: 'text', nullable: true })
  colonia: string | null;

  @Column({ name: 'cp', type: 'int', nullable: true })
  cp: number | null;

  @Column({ name: 'telefono1', type: 'text', nullable: true })
  telefono1: string | null;

  @Column({ name: 'telefono2', type: 'text', nullable: true })
  telefono2: string | null;

  @Column({ name: 'telefono3', type: 'text', nullable: true })
  telefono3: string | null;

  @Column({ name: 'coordinador', type: 'text', nullable: true })
  coordinador: string | null;

  @Column({ name: 'secretario', type: 'text', nullable: true })
  secretario: string | null;

  @Column({ name: 'num_envio', type: 'text', nullable: true })
  numEnvio: string | null;

  @Column({ name: 'fecha_alta', type: 'text', nullable: true })
  fechaAlta: string | null;

  @Column({ name: 'fecha_modifica', type: 'text', nullable: true })
  fechaModifica: string | null;

  @Column({ name: 'fecha_baja', type: 'text', nullable: true })
  fechaBaja: string | null;

  @Column({ name: 'estatus', type: 'int', nullable: true })
  estatus: number | null;
}
