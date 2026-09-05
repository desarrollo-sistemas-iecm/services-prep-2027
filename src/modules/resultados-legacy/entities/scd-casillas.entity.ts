import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity({ name: 'scd_casillas' })
export class ScdCasillasEntity {
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

  @Column({ name: 'clave_mdc', type: 'text', nullable: true })
  claveMdc: string | null;

  @Column({ name: 'empadronados', type: 'int', nullable: true })
  empadronados: number | null;

  @Column({ name: 'lista_nominal', type: 'int', nullable: true })
  listaNominal: number | null;

  @Column({ name: 'urna_electronica', type: 'int', nullable: true })
  urnaElectronica: number | null;

  @Column({ name: 'id_usuario', type: 'int', nullable: true })
  idUsuario: number | null;

  @Column({ name: 'fecha_alta', type: 'text', nullable: true })
  fechaAlta: string | null;

  @Column({ name: 'fecha_modif', type: 'text', nullable: true })
  fechaModif: string | null;

  @Column({ name: 'estatus', type: 'text', nullable: true })
  estatus: string | null;
}
