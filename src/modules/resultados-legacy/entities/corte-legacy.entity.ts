import { Column, Entity, PrimaryColumn } from 'typeorm';

/**
 * Registro histórico interno del sistema PREP anterior (tabla `corte`).
 * No confundir con `CorteReleaseEntity` (módulo `cortes`), que es nuestro
 * propio control de publicación de archivos database.db3.
 */
@Entity({ name: 'corte' })
export class CorteLegacyEntity {
  @PrimaryColumn({ name: 'id', type: 'int' })
  id: number;

  @Column({ name: 'corte_fecha', type: 'text', nullable: true })
  corteFecha: string | null;

  @Column({ name: 'corte_hora', type: 'text', nullable: true })
  corteHora: string | null;

  @Column({ name: 'dia', type: 'text', nullable: true })
  dia: string | null;

  @Column({ name: 'mes', type: 'text', nullable: true })
  mes: string | null;

  @Column({ name: 'anio', type: 'int', nullable: true })
  anio: number | null;

  @Column({ name: 'hora', type: 'text', nullable: true })
  hora: string | null;

  @Column({ name: 'minuto', type: 'text', nullable: true })
  minuto: string | null;

  @Column({ name: 'segundo', type: 'text', nullable: true })
  segundo: string | null;
}
