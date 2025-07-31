import { MigrationInterface, QueryRunner } from 'typeorm';

export class Migrationsts1753340676656 implements MigrationInterface {
  name = '1753340663824Migrations.ts1753340676656';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            ALTER TABLE "transactions"
            ADD "recallable_height" integer
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            ALTER TABLE "transactions" DROP COLUMN "recallable_height"
        `);
  }
}
