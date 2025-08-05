import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdateTokensToJson1754364903000 implements MigrationInterface {
  name = 'UpdateTokensToJson1754364903000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Drop token column and add tokens column for request_payment
    await queryRunner.query(`
            ALTER TABLE "request_payment" DROP COLUMN "token"
        `);
    await queryRunner.query(`
            ALTER TABLE "request_payment" ADD COLUMN "tokens" jsonb
        `);
    await queryRunner.query(`
            ALTER TABLE "request_payment" ADD COLUMN "txid" varchar
        `);
    
    // Drop token column and add tokens column for group_payment
    await queryRunner.query(`
            ALTER TABLE "group_payment" DROP COLUMN "token"
        `);
    await queryRunner.query(`
            ALTER TABLE "group_payment" ADD COLUMN "tokens" jsonb
        `);
    await queryRunner.query(`
            ALTER TABLE "group_payment" ADD COLUMN "txid" varchar
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // No rollback needed since tables are empty
  }
}