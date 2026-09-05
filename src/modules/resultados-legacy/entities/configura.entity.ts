import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity({ name: 'configura' })
export class ConfiguraEntity {
  @PrimaryColumn({ name: 'rowid', type: 'int' })
  rowid: number;

  @Column({ name: 'header', type: 'text', nullable: true })
  header: string | null;

  @Column({ name: 'footer', type: 'text', nullable: true })
  footer: string | null;

  @Column({ name: 'logo', type: 'text', nullable: true })
  logo: string | null;

  @Column({ name: 'tipo', type: 'text', nullable: true })
  tipo: string | null;

  @Column({ name: 'hostactas', type: 'text', nullable: true })
  hostActas: string | null;

  @Column({ name: 'hostactasext', type: 'text', nullable: true })
  hostActasExt: string | null;

  @Column({ name: 'hostQR', type: 'text', nullable: true })
  hostQr: string | null;

  @Column({ name: 'hostQRext', type: 'text', nullable: true })
  hostQrExt: string | null;

  @Column({ name: 'horaabre', type: 'text', nullable: true })
  horaAbre: string | null;
}
