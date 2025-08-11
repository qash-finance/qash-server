import { MigrationInterface, QueryRunner } from 'typeorm';

export class GroupPaymentMembersToObject1754905016000 implements MigrationInterface {
  name = 'GroupPaymentMembersToObject1754905016000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Convert members from ["mt...", ...] to [{ address: "mt...", name: "Member-xxxxxx" }, ...]
    // If already objects, ensure they have a name key (random if missing)
    await queryRunner.query(`
      UPDATE "group_payment_group"
      SET "members" = (
        SELECT jsonb_agg(
          CASE
            WHEN jsonb_typeof(elem) = 'string' THEN jsonb_build_object(
              'address', elem,
              'name', to_jsonb('Member-' || substr(md5(random()::text), 1, 6))
            )
            WHEN jsonb_typeof(elem) = 'object' THEN (
              CASE
                WHEN (elem ? 'name') THEN elem
                ELSE elem || jsonb_build_object(
                  'name', to_jsonb('Member-' || substr(md5(random()::text), 1, 6))
                )
              END
            )
            ELSE elem
          END
        )
        FROM jsonb_array_elements("group_payment_group"."members") AS elem
      )
      WHERE "members" IS NOT NULL;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Best-effort: convert back to array of addresses when possible
    await queryRunner.query(`
      UPDATE "group_payment_group"
      SET "members" = (
        SELECT jsonb_agg(
          CASE
            WHEN jsonb_typeof(elem) = 'object' AND (elem ? 'address') THEN to_jsonb(elem->>'address')
            ELSE elem
          END
        )
        FROM jsonb_array_elements("group_payment_group"."members") AS elem
      )
      WHERE "members" IS NOT NULL;
    `);
  }
}


