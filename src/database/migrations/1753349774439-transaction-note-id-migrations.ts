import { MigrationInterface, QueryRunner } from 'typeorm';

export class Migrationsts1753349774439 implements MigrationInterface {
  name = '1753349762349Migrations.ts1753349774439';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            ALTER TABLE "transactions"
            ADD "note_id" character varying
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            ALTER TABLE "transactions" DROP COLUMN "note_id"
        `);
  }
}
