/*
  Warnings:

  - The `frequency` column on the `SchedulePayment` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `status` column on the `SchedulePayment` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- CreateEnum
CREATE TYPE "public"."SchedulePaymentFrequencyEnum" AS ENUM ('DAILY', 'WEEKLY', 'MONTHLY');

-- CreateEnum
CREATE TYPE "public"."SchedulePaymentStatusEnum" AS ENUM ('ACTIVE', 'PAUSED', 'COMPLETED', 'CANCELLED', 'FAILED');

-- AlterTable
ALTER TABLE "public"."SchedulePayment" DROP COLUMN "frequency",
ADD COLUMN     "frequency" "public"."SchedulePaymentFrequencyEnum",
DROP COLUMN "status",
ADD COLUMN     "status" "public"."SchedulePaymentStatusEnum" NOT NULL DEFAULT 'ACTIVE';

-- DropEnum
DROP TYPE "public"."SchedulePaymentFrequency";

-- DropEnum
DROP TYPE "public"."SchedulePaymentStatus";

-- CreateIndex
CREATE INDEX "SchedulePayment_status_next_execution_idx" ON "public"."SchedulePayment"("status", "next_execution");

-- CreateIndex
CREATE INDEX "SchedulePayment_status_idx" ON "public"."SchedulePayment"("status");
