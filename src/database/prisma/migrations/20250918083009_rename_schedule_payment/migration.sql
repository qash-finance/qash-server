/*
  Warnings:

  - You are about to drop the `SchedulePayment` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "public"."transactions" DROP CONSTRAINT "transactions_schedule_payment_id_fkey";

-- DropTable
DROP TABLE "public"."SchedulePayment";

-- CreateTable
CREATE TABLE "public"."schedule_payment" (
    "id" SERIAL NOT NULL,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "amount" VARCHAR NOT NULL,
    "tokens" JSONB,
    "message" VARCHAR,
    "frequency" "public"."SchedulePaymentFrequencyEnum",
    "end_date" TIMESTAMP(6),
    "next_execution" TIMESTAMP(6),
    "payer" VARCHAR NOT NULL,
    "payee" VARCHAR NOT NULL,
    "status" "public"."SchedulePaymentStatusEnum" NOT NULL DEFAULT 'ACTIVE',
    "executionCount" INTEGER NOT NULL DEFAULT 0,
    "maxExecutions" INTEGER,

    CONSTRAINT "schedule_payment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "schedule_payment_status_next_execution_idx" ON "public"."schedule_payment"("status", "next_execution");

-- CreateIndex
CREATE INDEX "schedule_payment_payer_idx" ON "public"."schedule_payment"("payer");

-- CreateIndex
CREATE INDEX "schedule_payment_payee_idx" ON "public"."schedule_payment"("payee");

-- CreateIndex
CREATE INDEX "schedule_payment_status_idx" ON "public"."schedule_payment"("status");

-- AddForeignKey
ALTER TABLE "public"."transactions" ADD CONSTRAINT "transactions_schedule_payment_id_fkey" FOREIGN KEY ("schedule_payment_id") REFERENCES "public"."schedule_payment"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
