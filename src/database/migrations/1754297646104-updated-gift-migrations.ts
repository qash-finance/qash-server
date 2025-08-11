import { MigrationInterface, QueryRunner } from 'typeorm';

export class Migrationsts1754297646104 implements MigrationInterface {
  name = '1754297633009Migrations.ts1754297646104';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            ALTER TABLE "notifications" DROP CONSTRAINT "FK_notifications_wallet_address"
        `);
    await queryRunner.query(`
            ALTER TABLE "address_book" DROP CONSTRAINT "FK_address_book_category"
        `);
    await queryRunner.query(`
            DROP INDEX "public"."IDX_notifications_wallet_address"
        `);
    await queryRunner.query(`
            DROP INDEX "public"."IDX_notifications_status"
        `);
    await queryRunner.query(`
            DROP INDEX "public"."IDX_notifications_type"
        `);
    await queryRunner.query(`
            DROP INDEX "public"."IDX_notifications_wallet_address_status"
        `);
    await queryRunner.query(`
            DROP INDEX "public"."IDX_notifications_wallet_address_created_at"
        `);
    await queryRunner.query(`
            ALTER TABLE "gift"
                RENAME COLUMN "secret_hash" TO "secret_number"
        `);
    await queryRunner.query(`
            ALTER TABLE "gift"
                RENAME CONSTRAINT "UQ_86900efd866b220cc5768ad7a97" TO "UQ_49bfd4f4402656beb08835dd1bb"
        `);
    await queryRunner.query(`
            ALTER TABLE "notifications"
            ALTER COLUMN "created_at" DROP DEFAULT
        `);
    await queryRunner.query(`
            ALTER TABLE "notifications"
            ALTER COLUMN "updated_at" DROP DEFAULT
        `);
    await queryRunner.query(`
            ALTER TABLE "gift" DROP CONSTRAINT "UQ_49bfd4f4402656beb08835dd1bb"
        `);
    await queryRunner.query(`
            ALTER TABLE "address_book"
            ALTER COLUMN "categoryId" DROP NOT NULL
        `);
    await queryRunner.query(`
            CREATE INDEX "IDX_14081dff4b5d73765462993aab" ON "notifications" ("wallet_address")
        `);
    await queryRunner.query(`
            CREATE INDEX "IDX_b48194bb16ae8086958786c2c5" ON "notifications" ("wallet_address", "created_at")
        `);
    await queryRunner.query(`
            CREATE INDEX "IDX_d36dccd1f362fcdba0118e280c" ON "notifications" ("wallet_address", "status")
        `);
    await queryRunner.query(`
            ALTER TABLE "notifications"
            ADD CONSTRAINT "FK_14081dff4b5d73765462993aab5" FOREIGN KEY ("wallet_address") REFERENCES "wallet_auth_keys"("wallet_address") ON DELETE NO ACTION ON UPDATE NO ACTION
        `);
    await queryRunner.query(`
            ALTER TABLE "address_book"
            ADD CONSTRAINT "FK_d3f083b654fd2eeb2552bb1aa97" FOREIGN KEY ("categoryId") REFERENCES "categories"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
        `);
    await queryRunner.query(`
            ALTER TABLE "gift"
            ADD "note_id" character varying
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            ALTER TABLE "address_book" DROP CONSTRAINT "FK_d3f083b654fd2eeb2552bb1aa97"
        `);
    await queryRunner.query(`
            ALTER TABLE "notifications" DROP CONSTRAINT "FK_14081dff4b5d73765462993aab5"
        `);
    await queryRunner.query(`
            DROP INDEX "public"."IDX_d36dccd1f362fcdba0118e280c"
        `);
    await queryRunner.query(`
            DROP INDEX "public"."IDX_b48194bb16ae8086958786c2c5"
        `);
    await queryRunner.query(`
            DROP INDEX "public"."IDX_14081dff4b5d73765462993aab"
        `);
    await queryRunner.query(`
            ALTER TABLE "address_book"
            ALTER COLUMN "categoryId"
            SET NOT NULL
        `);
    await queryRunner.query(`
            ALTER TABLE "gift"
            ADD CONSTRAINT "UQ_49bfd4f4402656beb08835dd1bb" UNIQUE ("secret_number")
        `);
    await queryRunner.query(`
            ALTER TABLE "notifications"
            ALTER COLUMN "updated_at"
            SET DEFAULT now()
        `);
    await queryRunner.query(`
            ALTER TABLE "notifications"
            ALTER COLUMN "created_at"
            SET DEFAULT now()
        `);
    await queryRunner.query(`
            ALTER TABLE "gift"
                RENAME CONSTRAINT "UQ_49bfd4f4402656beb08835dd1bb" TO "UQ_86900efd866b220cc5768ad7a97"
        `);
    await queryRunner.query(`
            ALTER TABLE "gift"
                RENAME COLUMN "secret_number" TO "secret_hash"
        `);
    await queryRunner.query(`
            CREATE INDEX "IDX_notifications_wallet_address_created_at" ON "notifications" ("created_at", "wallet_address")
        `);
    await queryRunner.query(`
            CREATE INDEX "IDX_notifications_wallet_address_status" ON "notifications" ("status", "wallet_address")
        `);
    await queryRunner.query(`
            CREATE INDEX "IDX_notifications_type" ON "notifications" ("type")
        `);
    await queryRunner.query(`
            CREATE INDEX "IDX_notifications_status" ON "notifications" ("status")
        `);
    await queryRunner.query(`
            CREATE INDEX "IDX_notifications_wallet_address" ON "notifications" ("wallet_address")
        `);
    await queryRunner.query(`
            ALTER TABLE "address_book"
            ADD CONSTRAINT "FK_address_book_category" FOREIGN KEY ("categoryId") REFERENCES "categories"("id") ON DELETE
            SET NULL ON UPDATE NO ACTION
        `);
    await queryRunner.query(`
            ALTER TABLE "notifications"
            ADD CONSTRAINT "FK_notifications_wallet_address" FOREIGN KEY ("wallet_address") REFERENCES "wallet_auth_keys"("wallet_address") ON DELETE CASCADE ON UPDATE NO ACTION
        `);
    await queryRunner.query(`
            ALTER TABLE "gift" DROP COLUMN "note_id"
        `);
  }
}
