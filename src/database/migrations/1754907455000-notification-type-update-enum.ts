import { MigrationInterface, QueryRunner } from 'typeorm';

export class NotificationTypeUpdateEnum1754907455000
  implements MigrationInterface
{
  name = 'NotificationTypeUpdateEnum1754907455000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            ALTER TYPE "public"."notifications_type_enum"
            RENAME TO "notifications_type_enum_old"
        `);
    await queryRunner.query(`
            CREATE TYPE "public"."notifications_type_enum" AS ENUM(
                'SEND',
                'CLAIM',
                'REFUND',
                'BATCH_SEND',
                'WALLET_CREATE',
                'REQUEST_PAYMENT',
                'RECEIVED_PAYMENT',
                'ADD_TO_BATCH',
                'GIFT_SEND',
                'GIFT_OPEN',
                'GIFT_CLAIM'
            )
        `);
    await queryRunner.query(`
            ALTER TABLE "notifications"
            ALTER COLUMN "type" TYPE "public"."notifications_type_enum" USING "type"::"text"::"public"."notifications_type_enum"
        `);
    await queryRunner.query(`
            DROP TYPE "public"."notifications_type_enum_old"
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            CREATE TYPE "public"."notifications_type_enum_old" AS ENUM(
                'SEND',
                'CLAIM',
                'REFUND',
                'BATCH_SEND',
                'WALLET_CREATE',
                'REQUEST_PAYMENT',
                'RECEIVED_PAYMENT',
                'ADD_TO_BATCH',
                'GIFT_SEND',
                'GIFT_OPEN',
                'GIFT_CLAIM'
            )
        `);
    await queryRunner.query(`
            ALTER TABLE "notifications"
            ALTER COLUMN "type" TYPE "public"."notifications_type_enum_old" USING "type"::"text"::"public"."notifications_type_enum_old"
        `);
    await queryRunner.query(`
            DROP TYPE "public"."notifications_type_enum"
        `);
    await queryRunner.query(`
            ALTER TYPE "public"."notifications_type_enum_old"
            RENAME TO "notifications_type_enum"
        `);
  }
}
