import { MigrationInterface, QueryRunner } from 'typeorm';

export class NotificationMigrations1753847559000 implements MigrationInterface {
  name = 'NotificationMigrations1753847559000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create notification type enum
    await queryRunner.query(`
            CREATE TYPE "public"."notifications_type_enum" AS ENUM('SEND', 'CLAIM', 'REFUND', 'BATCH_SEND', 'WALLET_CREATE')
        `);
    
    // Create notification status enum
    await queryRunner.query(`
            CREATE TYPE "public"."notifications_status_enum" AS ENUM('UNREAD', 'READ')
        `);

    // Add unique constraint to wallet_auth_keys.wallet_address if it doesn't exist
    await queryRunner.query(`
            ALTER TABLE "wallet_auth_keys" 
            ADD CONSTRAINT "UQ_wallet_auth_keys_wallet_address" UNIQUE ("wallet_address")
        `);

    // Create notifications table
    await queryRunner.query(`
            CREATE TABLE "notifications" (
                "id" SERIAL NOT NULL,
                "created_at" TIMESTAMP NOT NULL DEFAULT now(),
                "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
                "title" text NOT NULL,
                "message" text,
                "type" "public"."notifications_type_enum" NOT NULL,
                "status" "public"."notifications_status_enum" NOT NULL DEFAULT 'UNREAD',
                "metadata" jsonb,
                "action_url" character varying,
                "wallet_address" character varying NOT NULL,
                "read_at" TIMESTAMP,
                CONSTRAINT "PK_notifications_id" PRIMARY KEY ("id")
            )
        `);

    // Create indexes for better query performance
    await queryRunner.query(`
            CREATE INDEX "IDX_notifications_wallet_address" ON "notifications" ("wallet_address")
        `);
    
    await queryRunner.query(`
            CREATE INDEX "IDX_notifications_status" ON "notifications" ("status")
        `);
    
    await queryRunner.query(`
            CREATE INDEX "IDX_notifications_type" ON "notifications" ("type")
        `);
    
    await queryRunner.query(`
            CREATE INDEX "IDX_notifications_wallet_address_status" ON "notifications" ("wallet_address", "status")
        `);

    await queryRunner.query(`
            CREATE INDEX "IDX_notifications_wallet_address_created_at" ON "notifications" ("wallet_address", "created_at")
        `);

    // Add foreign key constraint to wallet_auth_keys table
    await queryRunner.query(`
            ALTER TABLE "notifications"
            ADD CONSTRAINT "FK_notifications_wallet_address" FOREIGN KEY ("wallet_address") REFERENCES "wallet_auth_keys"("wallet_address") ON DELETE CASCADE ON UPDATE NO ACTION
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop foreign key
    await queryRunner.query(`
            ALTER TABLE "notifications" DROP CONSTRAINT "FK_notifications_wallet_address"
        `);

    // Drop indexes
    await queryRunner.query(`
            DROP INDEX "IDX_notifications_wallet_address_created_at"
        `);
    
    await queryRunner.query(`
            DROP INDEX "IDX_notifications_wallet_address_status"
        `);
    
    await queryRunner.query(`
            DROP INDEX "IDX_notifications_type"
        `);
    
    await queryRunner.query(`
            DROP INDEX "IDX_notifications_status"
        `);
    
    await queryRunner.query(`
            DROP INDEX "IDX_notifications_wallet_address"
        `);

    // Drop table
    await queryRunner.query(`
            DROP TABLE "notifications"
        `);

    // Drop enums
    await queryRunner.query(`
            DROP TYPE "public"."notifications_status_enum"
        `);
    
    await queryRunner.query(`
            DROP TYPE "public"."notifications_type_enum"
        `);

    // Drop unique constraint from wallet_auth_keys
    await queryRunner.query(`
            ALTER TABLE "wallet_auth_keys" DROP CONSTRAINT "UQ_wallet_auth_keys_wallet_address"
        `);
  }
} 