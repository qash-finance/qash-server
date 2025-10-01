/*
  Warnings:

  - The `token` column on the `address_book` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- AlterTable
ALTER TABLE "public"."address_book" ADD COLUMN     "email" VARCHAR,
ADD COLUMN     "order" SERIAL NOT NULL,
DROP COLUMN "token",
ADD COLUMN     "token" JSON;
