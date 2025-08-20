-- CreateEnum
CREATE TYPE "public"."SchedulePaymentFrequency" AS ENUM ('DAILY', 'WEEKLY', 'MONTHLY');

-- CreateEnum
CREATE TYPE "public"."SchedulePaymentStatus" AS ENUM ('ACTIVE', 'PAUSED', 'COMPLETED', 'CANCELLED', 'FAILED');

-- AlterTable
ALTER TABLE "public"."transactions" ADD COLUMN     "schedule_payment_id" INTEGER;

-- CreateTable
CREATE TABLE "public"."schedule_payment" (
    "id" SERIAL NOT NULL,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "amount" VARCHAR NOT NULL,
    "tokens" JSONB,
    "message" VARCHAR,
    "frequency" "public"."SchedulePaymentFrequency",
    "end_date" TIMESTAMP(6),
    "next_execution" TIMESTAMP(6),
    "payer" VARCHAR NOT NULL,
    "payee" VARCHAR NOT NULL,
    "status" "public"."SchedulePaymentStatus" NOT NULL DEFAULT 'ACTIVE',
    "execution_count" INTEGER NOT NULL DEFAULT 0,
    "max_executions" INTEGER,

    CONSTRAINT "schedule_payment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "IDX_schedule_payment_status_next_execution_date" ON "public"."schedule_payment"("status", "next_execution");

-- CreateIndex
CREATE INDEX "IDX_schedule_payment_payer" ON "public"."schedule_payment"("payer");

-- CreateIndex
CREATE INDEX "IDX_schedule_payment_payee" ON "public"."schedule_payment"("payee");

-- CreateIndex
CREATE INDEX "IDX_schedule_payment_status" ON "public"."schedule_payment"("status");

-- AddForeignKey
ALTER TABLE "public"."transactions" ADD CONSTRAINT "FK_schedule_payment_id" FOREIGN KEY ("schedule_payment_id") REFERENCES "public"."schedule_payment"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
