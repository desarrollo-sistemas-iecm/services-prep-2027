import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

export class CreateCortesControlTables1757100000000 implements MigrationInterface {
  name = 'CreateCortesControlTables1757100000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'corte_releases',
        columns: [
          {
            name: 'id',
            type: 'integer',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'increment',
          },
          { name: 'cut_id', type: 'varchar', length: '64' },
          { name: 'version', type: 'varchar', length: '32' },
          { name: 'activation_at', type: 'datetime' },
          {
            name: 'status',
            type: 'varchar',
            length: '16',
            default: "'uploaded'",
          },
          { name: 'file_sha256', type: 'varchar', length: '64' },
          { name: 'staged_file_path', type: 'varchar', length: '512' },
          {
            name: 'issued_by_subject',
            type: 'varchar',
            length: '128',
            isNullable: true,
          },
          {
            name: 'failure_reason',
            type: 'varchar',
            length: '256',
            isNullable: true,
          },
          {
            name: 'created_at',
            type: 'datetime',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'updated_at',
            type: 'datetime',
            default: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
    );

    await queryRunner.createIndex(
      'corte_releases',
      new TableIndex({
        name: 'idx_corte_releases_cut_id',
        columnNames: ['cut_id'],
        isUnique: true,
      }),
    );

    await queryRunner.createTable(
      new Table({
        name: 'bitacora',
        columns: [
          {
            name: 'id',
            type: 'integer',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'increment',
          },
          { name: 'action', type: 'varchar', length: '64' },
          { name: 'cut_id', type: 'varchar', length: '64', isNullable: true },
          {
            name: 'actor_subject',
            type: 'varchar',
            length: '128',
            isNullable: true,
          },
          { name: 'detail', type: 'varchar', length: '256', isNullable: true },
          {
            name: 'created_at',
            type: 'datetime',
            default: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
    );

    await queryRunner.createIndex(
      'bitacora',
      new TableIndex({
        name: 'idx_bitacora_cut_id',
        columnNames: ['cut_id'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('bitacora');
    await queryRunner.dropTable('corte_releases');
  }
}
