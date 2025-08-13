/*
  Warnings:

  - You are about to drop the column `secret_hash` on the `gift` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[secret_number]` on the table `gift` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `secret_number` to the `gift` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "public"."UQ_86900efd866b220cc5768ad7a97";

-- AlterTable
ALTER TABLE "public"."gift" DROP COLUMN "secret_hash",
ADD COLUMN     "note_id" VARCHAR,
ADD COLUMN     "secret_number" VARCHAR NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "UQ_49bfd4f4402656beb08835dd1bb" ON "public"."gift"("secret_number");
