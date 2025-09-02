/*
  Warnings:

  - The `token` column on the `request_payment` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- AlterTable
ALTER TABLE "public"."request_payment" DROP COLUMN "token",
ADD COLUMN     "token" JSONB;
