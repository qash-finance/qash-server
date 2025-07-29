import { MigrationInterface, QueryRunner } from 'typeorm';

export class CategoryAddressBook1753780050759 implements MigrationInterface {
  name = 'CategoryAddressBook1753780050759';

  public async up(queryRunner: QueryRunner): Promise<void> {
    //DROP COLUMN CATEGORY
    await queryRunner.query(`
      ALTER TABLE "address_book" 
      DROP COLUMN "category"
    `);

    // Create categories table
    await queryRunner.query(`
      CREATE TABLE "categories" (
        "id" SERIAL NOT NULL,
        "created_at" TIMESTAMP NOT NULL,
        "updated_at" TIMESTAMP NOT NULL,
        "name" character varying NOT NULL,
        CONSTRAINT "UQ_categories_name" UNIQUE ("name"),
        CONSTRAINT "PK_categories" PRIMARY KEY ("id")
      )
    `);

    // Add categoryId column to address_book table
    await queryRunner.query(`
      ALTER TABLE "address_book" 
      ADD COLUMN "categoryId" integer
    `);

    // Add foreign key constraint
    await queryRunner.query(`
      ALTER TABLE "address_book" 
      ADD CONSTRAINT "FK_address_book_category" 
      FOREIGN KEY ("categoryId") 
      REFERENCES "categories"("id") 
      ON DELETE SET NULL
    `);

    // Make categoryId NOT NULL after data migration
    await queryRunner.query(`
      ALTER TABLE "address_book" 
      ALTER COLUMN "categoryId" SET NOT NULL
    `);

  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Add back the old category column
    await queryRunner.query(`
      ALTER TABLE "address_book" 
      ADD COLUMN "category" character varying NOT NULL
    `);

    // Migrate data back - set category name based on categoryId
    await queryRunner.query(`
      UPDATE "address_book" 
      SET "category" = c."name"
      FROM "categories" c
      WHERE "address_book"."categoryId" = c."id"
    `);

    // Drop foreign key constraint
    await queryRunner.query(`
      ALTER TABLE "address_book" 
      DROP CONSTRAINT "FK_address_book_category"
    `);

    // Drop categoryId column
    await queryRunner.query(`
      ALTER TABLE "address_book" 
      DROP COLUMN "categoryId"
    `);

    // Drop categories table
    await queryRunner.query(`
      DROP TABLE "categories"
    `);
  }
} 