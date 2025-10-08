-- CreateEnum
CREATE TYPE "public"."PaymentLinkStatusEnum" AS ENUM ('ACTIVE', 'DEACTIVATED');

-- CreateTable
CREATE TABLE "public"."payment_link" (
    "id" SERIAL NOT NULL,
    "code" VARCHAR NOT NULL,
    "created_at" TIMESTAMP(6) NOT NULL,
    "updated_at" TIMESTAMP(6) NOT NULL,
    "title" VARCHAR NOT NULL,
    "description" VARCHAR NOT NULL,
    "amount" VARCHAR NOT NULL,
    "status" "public"."PaymentLinkStatusEnum" NOT NULL DEFAULT 'ACTIVE',
    "order" SERIAL NOT NULL,
    "payee" VARCHAR NOT NULL,
    "accepted_tokens" JSONB,
    "accepted_chains" JSONB,

    CONSTRAINT "payment_link_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."payment_link_record" (
    "id" SERIAL NOT NULL,
    "created_at" TIMESTAMP(6) NOT NULL,
    "updated_at" TIMESTAMP(6) NOT NULL,
    "payer" VARCHAR NOT NULL,
    "txid" VARCHAR,
    "payment_link_id" INTEGER NOT NULL,
    "token" JSONB,
    "chain" JSONB,

    CONSTRAINT "payment_link_record_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "payment_link_code_key" ON "public"."payment_link"("code");

-- CreateIndex
CREATE INDEX "payment_link_code_idx" ON "public"."payment_link"("code");

-- CreateIndex
CREATE INDEX "payment_link_payee_idx" ON "public"."payment_link"("payee");

-- CreateIndex
CREATE INDEX "payment_link_order_idx" ON "public"."payment_link"("order");

-- AddForeignKey
ALTER TABLE "public"."payment_link_record" ADD CONSTRAINT "payment_link_record_payment_link_id_fkey" FOREIGN KEY ("payment_link_id") REFERENCES "public"."payment_link"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
