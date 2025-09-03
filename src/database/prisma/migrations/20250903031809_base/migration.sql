-- CreateEnum
CREATE TYPE "public"."SchedulePaymentFrequency" AS ENUM ('DAILY', 'WEEKLY', 'MONTHLY');

-- CreateEnum
CREATE TYPE "public"."SchedulePaymentStatus" AS ENUM ('ACTIVE', 'PAUSED', 'COMPLETED', 'CANCELLED', 'FAILED');

-- CreateEnum
CREATE TYPE "public"."GiftNoteTypeEnum" AS ENUM ('P2ID', 'P2IDR', 'GIFT');

-- CreateEnum
CREATE TYPE "public"."GiftStatusEnum" AS ENUM ('PENDING', 'RECALLED', 'CONSUMED');

-- CreateEnum
CREATE TYPE "public"."GroupPaymentMemberStatusEnum" AS ENUM ('PENDING', 'PAID', 'DENIED');

-- CreateEnum
CREATE TYPE "public"."GroupPaymentStatusEnum" AS ENUM ('PENDING', 'COMPLETED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "public"."NotificationsStatusEnum" AS ENUM ('UNREAD', 'READ');

-- CreateEnum
CREATE TYPE "public"."NotificationsTypeEnum" AS ENUM ('SEND', 'CLAIM', 'REFUND', 'BATCH_SEND', 'WALLET_CREATE', 'REQUEST_PAYMENT', 'RECEIVED_PAYMENT', 'ADD_TO_BATCH', 'GIFT_SEND', 'GIFT_OPEN', 'GIFT_CLAIM');

-- CreateEnum
CREATE TYPE "public"."RequestPaymentStatusEnum" AS ENUM ('PENDING', 'ACCEPTED', 'DENIED');

-- CreateEnum
CREATE TYPE "public"."TransactionsNoteTypeEnum" AS ENUM ('P2ID', 'P2IDR', 'GIFT');

-- CreateEnum
CREATE TYPE "public"."TransactionsStatusEnum" AS ENUM ('PENDING', 'RECALLED', 'CONSUMED');

-- CreateEnum
CREATE TYPE "public"."WalletAuthKeysDeviceTypeEnum" AS ENUM ('DESKTOP', 'MOBILE', 'TABLET', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "public"."WalletAuthKeysStatusEnum" AS ENUM ('ACTIVE', 'REVOKED', 'EXPIRED');

-- CreateTable
CREATE TABLE "public"."address_book" (
    "id" SERIAL NOT NULL,
    "created_at" TIMESTAMP(6) NOT NULL,
    "updated_at" TIMESTAMP(6) NOT NULL,
    "user_address" VARCHAR NOT NULL,
    "name" VARCHAR NOT NULL,
    "address" VARCHAR NOT NULL,
    "token" VARCHAR,
    "categoryId" INTEGER NOT NULL,

    CONSTRAINT "address_book_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."categories" (
    "id" SERIAL NOT NULL,
    "created_at" TIMESTAMP(6) NOT NULL,
    "updated_at" TIMESTAMP(6) NOT NULL,
    "name" VARCHAR NOT NULL,

    CONSTRAINT "categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."gift" (
    "id" SERIAL NOT NULL,
    "created_at" TIMESTAMP(6) NOT NULL,
    "updated_at" TIMESTAMP(6) NOT NULL,
    "sender" VARCHAR NOT NULL,
    "assets" JSONB NOT NULL,
    "private" BOOLEAN NOT NULL DEFAULT true,
    "recallable" BOOLEAN NOT NULL DEFAULT true,
    "recallable_time" TIMESTAMP(6),
    "serial_number" JSONB NOT NULL,
    "note_type" "public"."GiftNoteTypeEnum" NOT NULL DEFAULT 'GIFT',
    "status" "public"."GiftStatusEnum" NOT NULL DEFAULT 'PENDING',
    "secret_hash" VARCHAR NOT NULL,
    "recalled_at" TIMESTAMP(6),
    "opened_at" TIMESTAMP(6),
    "note_id" VARCHAR,

    CONSTRAINT "gift_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."group_payment" (
    "id" SERIAL NOT NULL,
    "created_at" TIMESTAMP(6) NOT NULL,
    "updated_at" TIMESTAMP(6) NOT NULL,
    "owner_address" VARCHAR NOT NULL,
    "amount" VARCHAR NOT NULL,
    "per_member" DOUBLE PRECISION NOT NULL,
    "link_code" VARCHAR NOT NULL,
    "status" "public"."GroupPaymentStatusEnum" NOT NULL DEFAULT 'PENDING',
    "groupId" INTEGER,
    "tokens" JSONB,

    CONSTRAINT "group_payment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."group_payment_group" (
    "id" SERIAL NOT NULL,
    "created_at" TIMESTAMP(6) NOT NULL,
    "updated_at" TIMESTAMP(6) NOT NULL,
    "name" VARCHAR NOT NULL,
    "owner_address" VARCHAR NOT NULL,
    "members" JSONB NOT NULL,

    CONSTRAINT "group_payment_group_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."group_payment_member_status" (
    "id" SERIAL NOT NULL,
    "created_at" TIMESTAMP(6) NOT NULL,
    "updated_at" TIMESTAMP(6) NOT NULL,
    "member_address" VARCHAR NOT NULL,
    "status" "public"."GroupPaymentMemberStatusEnum" NOT NULL DEFAULT 'PENDING',
    "paid_at" TIMESTAMP(6),
    "groupPaymentId" INTEGER,

    CONSTRAINT "group_payment_member_status_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."notifications" (
    "id" SERIAL NOT NULL,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "title" TEXT NOT NULL,
    "message" TEXT,
    "type" "public"."NotificationsTypeEnum" NOT NULL,
    "status" "public"."NotificationsStatusEnum" NOT NULL DEFAULT 'UNREAD',
    "metadata" JSONB,
    "action_url" VARCHAR,
    "wallet_address" VARCHAR NOT NULL,
    "read_at" TIMESTAMP(6),

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."request_payment" (
    "id" SERIAL NOT NULL,
    "created_at" TIMESTAMP(6) NOT NULL,
    "updated_at" TIMESTAMP(6) NOT NULL,
    "amount" VARCHAR NOT NULL,
    "message" VARCHAR NOT NULL,
    "status" "public"."RequestPaymentStatusEnum" NOT NULL DEFAULT 'PENDING',
    "payer" VARCHAR NOT NULL,
    "payee" VARCHAR NOT NULL,
    "is_group_payment" BOOLEAN NOT NULL DEFAULT false,
    "group_payment_id" INTEGER,
    "groupPaymentId" INTEGER,
    "txid" VARCHAR,
    "tokens" JSONB,

    CONSTRAINT "request_payment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."transactions" (
    "id" SERIAL NOT NULL,
    "createdAt" TIMESTAMP(6) NOT NULL,
    "updated_at" TIMESTAMP(6) NOT NULL,
    "sender" VARCHAR NOT NULL,
    "recipient" VARCHAR NOT NULL,
    "assets" JSONB NOT NULL,
    "private" BOOLEAN NOT NULL DEFAULT true,
    "recallable" BOOLEAN NOT NULL DEFAULT true,
    "recallable_time" TIMESTAMP(6),
    "serial_number" JSONB NOT NULL,
    "note_type" "public"."TransactionsNoteTypeEnum",
    "status" "public"."TransactionsStatusEnum" NOT NULL DEFAULT 'PENDING',
    "recallable_height" INTEGER,
    "timelock_height" INTEGER,
    "note_id" VARCHAR,
    "request_payment_id" INTEGER,
    "schedule_payment_id" INTEGER,

    CONSTRAINT "transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."wallet_auth_challenges" (
    "id" SERIAL NOT NULL,
    "created_at" TIMESTAMP(6) NOT NULL,
    "updated_at" TIMESTAMP(6) NOT NULL,
    "wallet_address" VARCHAR NOT NULL,
    "challenge_code" VARCHAR NOT NULL,
    "expected_response" VARCHAR NOT NULL,
    "expires_at" TIMESTAMP(6) NOT NULL,
    "is_used" BOOLEAN NOT NULL DEFAULT false,
    "ip_address" VARCHAR,
    "user_agent" VARCHAR,
    "challenge_data" JSONB,

    CONSTRAINT "wallet_auth_challenges_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."wallet_auth_keys" (
    "id" SERIAL NOT NULL,
    "created_at" TIMESTAMP(6) NOT NULL,
    "updated_at" TIMESTAMP(6) NOT NULL,
    "wallet_address" VARCHAR NOT NULL,
    "public_key" VARCHAR NOT NULL,
    "hashed_secret_key" VARCHAR NOT NULL,
    "key_derivation_salt" VARCHAR,
    "status" "public"."WalletAuthKeysStatusEnum" NOT NULL DEFAULT 'ACTIVE',
    "last_used_at" TIMESTAMP(6),
    "expires_at" TIMESTAMP(6) NOT NULL,
    "device_fingerprint" VARCHAR,
    "device_type" "public"."WalletAuthKeysDeviceTypeEnum" NOT NULL DEFAULT 'UNKNOWN',
    "user_agent" VARCHAR,
    "ip_address" VARCHAR,
    "metadata" JSONB,

    CONSTRAINT "wallet_auth_keys_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."wallet_auth_sessions" (
    "id" SERIAL NOT NULL,
    "created_at" TIMESTAMP(6) NOT NULL,
    "updated_at" TIMESTAMP(6) NOT NULL,
    "session_token" VARCHAR NOT NULL,
    "wallet_address" VARCHAR NOT NULL,
    "auth_key_id" INTEGER NOT NULL,
    "expires_at" TIMESTAMP(6) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "last_activity_at" TIMESTAMP(6),
    "ip_address" VARCHAR,
    "user_agent" VARCHAR,
    "session_data" JSONB,

    CONSTRAINT "wallet_auth_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."SchedulePayment" (
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
    "executionCount" INTEGER NOT NULL DEFAULT 0,
    "maxExecutions" INTEGER,

    CONSTRAINT "SchedulePayment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "categories_name_key" ON "public"."categories"("name");

-- CreateIndex
CREATE UNIQUE INDEX "gift_secret_hash_key" ON "public"."gift"("secret_hash");

-- CreateIndex
CREATE UNIQUE INDEX "group_payment_link_code_key" ON "public"."group_payment"("link_code");

-- CreateIndex
CREATE INDEX "notifications_status_idx" ON "public"."notifications"("status");

-- CreateIndex
CREATE INDEX "notifications_type_idx" ON "public"."notifications"("type");

-- CreateIndex
CREATE INDEX "notifications_wallet_address_idx" ON "public"."notifications"("wallet_address");

-- CreateIndex
CREATE INDEX "notifications_wallet_address_created_at_idx" ON "public"."notifications"("wallet_address", "created_at");

-- CreateIndex
CREATE INDEX "notifications_wallet_address_status_idx" ON "public"."notifications"("wallet_address", "status");

-- CreateIndex
CREATE UNIQUE INDEX "wallet_auth_challenges_challenge_code_key" ON "public"."wallet_auth_challenges"("challenge_code");

-- CreateIndex
CREATE INDEX "wallet_auth_challenges_challenge_code_idx" ON "public"."wallet_auth_challenges"("challenge_code");

-- CreateIndex
CREATE INDEX "wallet_auth_challenges_created_at_idx" ON "public"."wallet_auth_challenges"("created_at");

-- CreateIndex
CREATE INDEX "wallet_auth_challenges_wallet_address_is_used_idx" ON "public"."wallet_auth_challenges"("wallet_address", "is_used");

-- CreateIndex
CREATE UNIQUE INDEX "wallet_auth_keys_wallet_address_key" ON "public"."wallet_auth_keys"("wallet_address");

-- CreateIndex
CREATE UNIQUE INDEX "wallet_auth_keys_public_key_key" ON "public"."wallet_auth_keys"("public_key");

-- CreateIndex
CREATE INDEX "wallet_auth_keys_wallet_address_idx" ON "public"."wallet_auth_keys"("wallet_address");

-- CreateIndex
CREATE INDEX "wallet_auth_keys_wallet_address_status_idx" ON "public"."wallet_auth_keys"("wallet_address", "status");

-- CreateIndex
CREATE INDEX "wallet_auth_keys_public_key_idx" ON "public"."wallet_auth_keys"("public_key");

-- CreateIndex
CREATE INDEX "wallet_auth_keys_created_at_idx" ON "public"."wallet_auth_keys"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX "wallet_auth_sessions_session_token_key" ON "public"."wallet_auth_sessions"("session_token");

-- CreateIndex
CREATE INDEX "wallet_auth_sessions_wallet_address_is_active_idx" ON "public"."wallet_auth_sessions"("wallet_address", "is_active");

-- CreateIndex
CREATE INDEX "wallet_auth_sessions_auth_key_id_idx" ON "public"."wallet_auth_sessions"("auth_key_id");

-- CreateIndex
CREATE INDEX "wallet_auth_sessions_session_token_idx" ON "public"."wallet_auth_sessions"("session_token");

-- CreateIndex
CREATE INDEX "SchedulePayment_status_next_execution_idx" ON "public"."SchedulePayment"("status", "next_execution");

-- CreateIndex
CREATE INDEX "SchedulePayment_payer_idx" ON "public"."SchedulePayment"("payer");

-- CreateIndex
CREATE INDEX "SchedulePayment_payee_idx" ON "public"."SchedulePayment"("payee");

-- CreateIndex
CREATE INDEX "SchedulePayment_status_idx" ON "public"."SchedulePayment"("status");

-- AddForeignKey
ALTER TABLE "public"."address_book" ADD CONSTRAINT "address_book_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "public"."categories"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."group_payment" ADD CONSTRAINT "group_payment_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "public"."group_payment_group"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."group_payment_member_status" ADD CONSTRAINT "group_payment_member_status_groupPaymentId_fkey" FOREIGN KEY ("groupPaymentId") REFERENCES "public"."group_payment"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."notifications" ADD CONSTRAINT "notifications_wallet_address_fkey" FOREIGN KEY ("wallet_address") REFERENCES "public"."wallet_auth_keys"("wallet_address") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."request_payment" ADD CONSTRAINT "request_payment_groupPaymentId_fkey" FOREIGN KEY ("groupPaymentId") REFERENCES "public"."group_payment"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."transactions" ADD CONSTRAINT "transactions_request_payment_id_fkey" FOREIGN KEY ("request_payment_id") REFERENCES "public"."request_payment"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."transactions" ADD CONSTRAINT "transactions_schedule_payment_id_fkey" FOREIGN KEY ("schedule_payment_id") REFERENCES "public"."SchedulePayment"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
