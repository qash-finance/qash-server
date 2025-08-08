import { MigrationInterface, QueryRunner } from 'typeorm';

export class TransactionsRequestPaymentId1754642561000 implements MigrationInterface {
  name = 'TransactionsRequestPaymentId1754642561000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "transactions"
      ADD "request_payment_id" integer
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "transactions" DROP COLUMN "request_payment_id"
    `);
  }
}


