-- CreateEnum
CREATE TYPE "CategoryShapeEnum" AS ENUM ('CIRCLE', 'DIAMOND', 'SQUARE', 'TRIANGLE');

-- CreateEnum
CREATE TYPE "NotificationsStatusEnum" AS ENUM ('UNREAD', 'READ');

-- CreateEnum
CREATE TYPE "NotificationsTypeEnum" AS ENUM ('NOP');

-- CreateEnum
CREATE TYPE "PaymentLinkStatusEnum" AS ENUM ('ACTIVE', 'DEACTIVATED');

-- CreateTable
CREATE TABLE "address_book" (
    "id" SERIAL NOT NULL,
    "created_at" TIMESTAMP(6) NOT NULL,
    "updated_at" TIMESTAMP(6) NOT NULL,
    "user_address" VARCHAR NOT NULL,
    "name" VARCHAR NOT NULL,
    "address" VARCHAR NOT NULL,
    "email" VARCHAR,
    "token" JSON,
    "order" SERIAL NOT NULL,
    "categoryId" INTEGER NOT NULL,

    CONSTRAINT "address_book_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "categories" (
    "id" SERIAL NOT NULL,
    "created_at" TIMESTAMP(6) NOT NULL,
    "updated_at" TIMESTAMP(6) NOT NULL,
    "name" VARCHAR NOT NULL,
    "shape" "CategoryShapeEnum" NOT NULL DEFAULT 'CIRCLE',
    "color" VARCHAR NOT NULL,
    "order" SERIAL NOT NULL,
    "owner_address" VARCHAR NOT NULL,

    CONSTRAINT "categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_link" (
    "id" SERIAL NOT NULL,
    "code" VARCHAR NOT NULL,
    "created_at" TIMESTAMP(6) NOT NULL,
    "updated_at" TIMESTAMP(6) NOT NULL,
    "title" VARCHAR NOT NULL,
    "description" VARCHAR NOT NULL,
    "amount" VARCHAR NOT NULL,
    "status" "PaymentLinkStatusEnum" NOT NULL DEFAULT 'ACTIVE',
    "order" SERIAL NOT NULL,
    "payee" VARCHAR NOT NULL,
    "accepted_tokens" JSONB,
    "accepted_chains" JSONB,

    CONSTRAINT "payment_link_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_link_record" (
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

-- CreateTable
CREATE TABLE "notifications" (
    "id" SERIAL NOT NULL,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "title" TEXT NOT NULL,
    "message" TEXT,
    "type" "NotificationsTypeEnum" NOT NULL,
    "status" "NotificationsStatusEnum" NOT NULL DEFAULT 'UNREAD',
    "metadata" JSONB,
    "action_url" VARCHAR,
    "wallet_address" VARCHAR NOT NULL,
    "read_at" TIMESTAMP(6),

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "categories_name_key" ON "categories"("name");

-- CreateIndex
CREATE INDEX "categories_order_idx" ON "categories"("order");

-- CreateIndex
CREATE UNIQUE INDEX "payment_link_code_key" ON "payment_link"("code");

-- CreateIndex
CREATE INDEX "payment_link_code_idx" ON "payment_link"("code");

-- CreateIndex
CREATE INDEX "payment_link_payee_idx" ON "payment_link"("payee");

-- CreateIndex
CREATE INDEX "payment_link_order_idx" ON "payment_link"("order");

-- CreateIndex
CREATE INDEX "notifications_status_idx" ON "notifications"("status");

-- CreateIndex
CREATE INDEX "notifications_type_idx" ON "notifications"("type");

-- CreateIndex
CREATE INDEX "notifications_wallet_address_idx" ON "notifications"("wallet_address");

-- CreateIndex
CREATE INDEX "notifications_wallet_address_created_at_idx" ON "notifications"("wallet_address", "created_at");

-- CreateIndex
CREATE INDEX "notifications_wallet_address_status_idx" ON "notifications"("wallet_address", "status");

-- AddForeignKey
ALTER TABLE "address_book" ADD CONSTRAINT "address_book_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "categories"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "payment_link_record" ADD CONSTRAINT "payment_link_record_payment_link_id_fkey" FOREIGN KEY ("payment_link_id") REFERENCES "payment_link"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
