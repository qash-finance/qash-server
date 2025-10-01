/*
  Warnings:

  - Added the required column `color` to the `categories` table without a default value. This is not possible if the table is not empty.
  - Added the required column `owner_address` to the `categories` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "public"."CategoryShapeEnum" AS ENUM ('CIRCLE', 'DIAMOND', 'SQUARE', 'TRIANGLE');

-- AlterTable
ALTER TABLE "public"."categories" ADD COLUMN     "color" VARCHAR NOT NULL,
ADD COLUMN     "order" SERIAL NOT NULL,
ADD COLUMN     "owner_address" VARCHAR NOT NULL,
ADD COLUMN     "shape" "public"."CategoryShapeEnum" NOT NULL DEFAULT 'CIRCLE';

-- CreateIndex
CREATE INDEX "categories_order_idx" ON "public"."categories"("order");
