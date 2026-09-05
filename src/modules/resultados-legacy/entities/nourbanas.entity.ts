import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity({ name: 'nourbanas' })
export class NourbanasEntity {
  @PrimaryColumn({ name: 'rowid', type: 'int' })
  rowid: number;

  @Column({ name: 'iddistrito', type: 'int', nullable: true })
  idDistrito: number | null;

  @Column({ name: 'idseccion', type: 'int', nullable: true })
  idSeccion: number | null;

  @Column({ name: 'idcasilla', type: 'varchar', length: 10, nullable: true })
  idCasilla: string | null;

  @Column({ name: 'tiposeccion', type: 'varchar', length: 10, nullable: true })
  tipoSeccion: string | null;

  @Column({ name: 'clave_mdc', type: 'varchar', length: 15, nullable: true })
  claveMdc: string | null;
}
