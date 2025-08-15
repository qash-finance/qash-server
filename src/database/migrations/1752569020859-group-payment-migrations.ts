import { MigrationInterface, QueryRunner } from 'typeorm';

export class Migrationsts1752569020859 implements MigrationInterface {
  name = '1752569002804Migrations.ts1752569020859';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            CREATE TABLE "group_payment_group" (
                "id" SERIAL NOT NULL,
                "created_at" TIMESTAMP NOT NULL,
                "updated_at" TIMESTAMP NOT NULL,
                "name" character varying NOT NULL,
                "owner_address" character varying NOT NULL,
                "members" jsonb NOT NULL,
                CONSTRAINT "PK_a3156767eace573c78d91539d17" PRIMARY KEY ("id")
            )
        `);
    await queryRunner.query(`
            CREATE TYPE "public"."group_payment_status_enum" AS ENUM('pending', 'completed', 'expired')
        `);
    await queryRunner.query(`
            CREATE TABLE "group_payment" (
                "id" SERIAL NOT NULL,
                "created_at" TIMESTAMP NOT NULL,
                "updated_at" TIMESTAMP NOT NULL,
                "owner_address" character varying NOT NULL,
                "token" character varying NOT NULL,
                "amount" character varying NOT NULL,
                "per_member" double precision NOT NULL,
                "link_code" character varying NOT NULL,
                "status" "public"."group_payment_status_enum" NOT NULL DEFAULT 'pending',
                "groupId" integer,
                CONSTRAINT "UQ_752feb6e3dfa73076192e02fdd1" UNIQUE ("link_code"),
                CONSTRAINT "PK_ea09ef9c3c7a5942a32052f5530" PRIMARY KEY ("id")
            )
        `);
    await queryRunner.query(`
            CREATE TYPE "public"."group_payment_member_status_status_enum" AS ENUM('pending', 'paid', 'denied')
        `);
    await queryRunner.query(`
            CREATE TABLE "group_payment_member_status" (
                "id" SERIAL NOT NULL,
                "created_at" TIMESTAMP NOT NULL,
                "updated_at" TIMESTAMP NOT NULL,
                "member_address" character varying NOT NULL,
                "status" "public"."group_payment_member_status_status_enum" NOT NULL DEFAULT 'pending',
                "paid_at" TIMESTAMP,
                "groupPaymentId" integer,
                CONSTRAINT "PK_ab9afa0912b24e8c7fd448ad49a" PRIMARY KEY ("id")
            )
        `);
    await queryRunner.query(`
            ALTER TABLE "group_payment"
            ADD CONSTRAINT "FK_2043920d55348e76ec85cc7a697" FOREIGN KEY ("groupId") REFERENCES "group_payment_group"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
        `);
    await queryRunner.query(`
            ALTER TABLE "group_payment_member_status"
            ADD CONSTRAINT "FK_2b5e0e8e862cc615b7784956138" FOREIGN KEY ("groupPaymentId") REFERENCES "group_payment"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            ALTER TABLE "group_payment_member_status" DROP CONSTRAINT "FK_2b5e0e8e862cc615b7784956138"
        `);
    await queryRunner.query(`
            ALTER TABLE "group_payment" DROP CONSTRAINT "FK_2043920d55348e76ec85cc7a697"
        `);
    await queryRunner.query(`
            DROP TABLE "group_payment_member_status"
        `);
    await queryRunner.query(`
            DROP TYPE "public"."group_payment_member_status_status_enum"
        `);
    await queryRunner.query(`
            DROP TABLE "group_payment"
        `);
    await queryRunner.query(`
            DROP TYPE "public"."group_payment_status_enum"
        `);
    await queryRunner.query(`
            DROP TABLE "group_payment_group"
        `);
  }
}
