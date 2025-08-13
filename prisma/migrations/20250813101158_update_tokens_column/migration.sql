/*
  Warnings:

  - You are about to drop the column `token` on the `group_payment` table. All the data in the column will be lost.
  - You are about to drop the column `token` on the `request_payment` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "public"."group_payment" DROP COLUMN "token",
ADD COLUMN     "tokens" JSONB;

-- AlterTable
ALTER TABLE "public"."request_payment" DROP COLUMN "token",
ADD COLUMN     "tokens" JSONB;
