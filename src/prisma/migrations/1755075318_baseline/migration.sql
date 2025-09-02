-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- CreateEnum
CREATE TYPE "public"."analytics_events_event_type_enum" AS ENUM ('page_view', 'endpoint_call', 'user_session', 'transaction', 'gift', 'group_payment', 'request_payment');

-- CreateEnum
CREATE TYPE "public"."gift_note_type_enum" AS ENUM ('p2id', 'p2idr', 'gift');

-- CreateEnum
CREATE TYPE "public"."gift_status_enum" AS ENUM ('pending', 'recalled', 'consumed');

-- CreateEnum
CREATE TYPE "public"."group_payment_member_status_status_enum" AS ENUM ('pending', 'paid');

-- CreateEnum
CREATE TYPE "public"."group_payment_status_enum" AS ENUM ('pending', 'completed', 'expired');

-- CreateEnum
CREATE TYPE "public"."notifications_status_enum" AS ENUM ('UNREAD', 'READ');

-- CreateEnum
CREATE TYPE "public"."notifications_type_enum" AS ENUM ('SEND', 'CLAIM', 'REFUND', 'BATCH_SEND', 'WALLET_CREATE');

-- CreateEnum
CREATE TYPE "public"."request_payment_status_enum" AS ENUM ('pending', 'accepted', 'denied');

-- CreateEnum
CREATE TYPE "public"."tokens_token_type_enum" AS ENUM ('EMAIL', 'PASSWORD');

-- CreateEnum
CREATE TYPE "public"."transactions_note_type_enum" AS ENUM ('p2id', 'p2idr', 'gift');

-- CreateEnum
CREATE TYPE "public"."transactions_status_enum" AS ENUM ('pending', 'recalled', 'consumed');

-- CreateEnum
CREATE TYPE "public"."users_role_enum" AS ENUM ('admin', 'admin-only-view', 'user');

-- CreateEnum
CREATE TYPE "public"."users_status_enum" AS ENUM ('ACTIVE', 'INACTIVE', 'PENDING');

-- CreateEnum
CREATE TYPE "public"."wallet_auth_keys_device_type_enum" AS ENUM ('desktop', 'mobile', 'tablet', 'unknown');

-- CreateEnum
CREATE TYPE "public"."wallet_auth_keys_status_enum" AS ENUM ('active', 'revoked', 'expired');

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

    CONSTRAINT "PK_188a02dee277dd0f9e488fdf06f" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."analytics_endpoint_stats" (
    "id" SERIAL NOT NULL,
    "created_at" TIMESTAMP(6) NOT NULL,
    "updated_at" TIMESTAMP(6) NOT NULL,
    "endpoint" VARCHAR NOT NULL,
    "method" VARCHAR NOT NULL,
    "response_time" INTEGER NOT NULL,
    "status_code" INTEGER NOT NULL,
    "user_address" VARCHAR,
    "session_id" VARCHAR,
    "ip_address" VARCHAR,
    "error_details" JSONB,

    CONSTRAINT "PK_ba98749eddce2fdd5f3441cb1c8" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."analytics_events" (
    "id" SERIAL NOT NULL,
    "created_at" TIMESTAMP(6) NOT NULL,
    "updated_at" TIMESTAMP(6) NOT NULL,
    "event_type" "public"."analytics_events_event_type_enum" NOT NULL,
    "user_address" VARCHAR,
    "session_id" VARCHAR,
    "metadata" JSONB,
    "ip_address" VARCHAR,
    "user_agent" VARCHAR,
    "referer" VARCHAR,

    CONSTRAINT "PK_5d643d67a09b55653e98616f421" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."analytics_transaction_stats" (
    "id" SERIAL NOT NULL,
    "created_at" TIMESTAMP(6) NOT NULL,
    "updated_at" TIMESTAMP(6) NOT NULL,
    "transaction_type" VARCHAR NOT NULL,
    "token" VARCHAR NOT NULL,
    "amount" DECIMAL(20,6) NOT NULL,
    "sender_address" VARCHAR NOT NULL,
    "receiver_address" VARCHAR,
    "status" VARCHAR,
    "entity_id" INTEGER,
    "additional_data" JSONB,

    CONSTRAINT "PK_b578a1a8c8cbebbe2f34b837cbe" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."analytics_user_sessions" (
    "id" SERIAL NOT NULL,
    "created_at" TIMESTAMP(6) NOT NULL,
    "updated_at" TIMESTAMP(6) NOT NULL,
    "session_id" VARCHAR NOT NULL,
    "user_address" VARCHAR,
    "start_time" TIMESTAMP(6) NOT NULL,
    "end_time" TIMESTAMP(6),
    "duration" INTEGER NOT NULL DEFAULT 0,
    "page_views" INTEGER NOT NULL DEFAULT 0,
    "api_calls" INTEGER NOT NULL DEFAULT 0,
    "ip_address" VARCHAR,
    "user_agent" VARCHAR,
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "PK_afca360a12c2e39873b6a373450" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."auths" (
    "id" SERIAL NOT NULL,
    "created_at" TIMESTAMP(6) NOT NULL,
    "updated_at" TIMESTAMP(6) NOT NULL,
    "access_token" VARCHAR NOT NULL,
    "refresh_token" VARCHAR NOT NULL,
    "user_id" INTEGER NOT NULL,

    CONSTRAINT "PK_22fc0631a651972ddc9c5a31090" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."categories" (
    "id" SERIAL NOT NULL,
    "created_at" TIMESTAMP(6) NOT NULL,
    "updated_at" TIMESTAMP(6) NOT NULL,
    "name" VARCHAR NOT NULL,

    CONSTRAINT "PK_categories" PRIMARY KEY ("id")
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
    "note_type" "public"."gift_note_type_enum" NOT NULL DEFAULT 'gift',
    "status" "public"."gift_status_enum" NOT NULL DEFAULT 'pending',
    "secret_hash" VARCHAR NOT NULL,
    "recalled_at" TIMESTAMP(6),
    "opened_at" TIMESTAMP(6),

    CONSTRAINT "PK_f91217caddc01a085837ebe0606" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."group_payment" (
    "id" SERIAL NOT NULL,
    "created_at" TIMESTAMP(6) NOT NULL,
    "updated_at" TIMESTAMP(6) NOT NULL,
    "owner_address" VARCHAR NOT NULL,
    "token" VARCHAR NOT NULL,
    "amount" VARCHAR NOT NULL,
    "per_member" DOUBLE PRECISION NOT NULL,
    "link_code" VARCHAR NOT NULL,
    "status" "public"."group_payment_status_enum" NOT NULL DEFAULT 'pending',
    "groupId" INTEGER,

    CONSTRAINT "PK_ea09ef9c3c7a5942a32052f5530" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."group_payment_group" (
    "id" SERIAL NOT NULL,
    "created_at" TIMESTAMP(6) NOT NULL,
    "updated_at" TIMESTAMP(6) NOT NULL,
    "name" VARCHAR NOT NULL,
    "owner_address" VARCHAR NOT NULL,
    "members" JSONB NOT NULL,

    CONSTRAINT "PK_a3156767eace573c78d91539d17" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."group_payment_member_status" (
    "id" SERIAL NOT NULL,
    "created_at" TIMESTAMP(6) NOT NULL,
    "updated_at" TIMESTAMP(6) NOT NULL,
    "member_address" VARCHAR NOT NULL,
    "status" "public"."group_payment_member_status_status_enum" NOT NULL DEFAULT 'pending',
    "paid_at" TIMESTAMP(6),
    "groupPaymentId" INTEGER,

    CONSTRAINT "PK_ab9afa0912b24e8c7fd448ad49a" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."migrations_typeorm" (
    "id" SERIAL NOT NULL,
    "timestamp" BIGINT NOT NULL,
    "name" VARCHAR NOT NULL,

    CONSTRAINT "PK_48f349806db3f6cc916da893c67" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."notifications" (
    "id" SERIAL NOT NULL,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "title" TEXT NOT NULL,
    "message" TEXT,
    "type" "public"."notifications_type_enum" NOT NULL,
    "status" "public"."notifications_status_enum" NOT NULL DEFAULT 'UNREAD',
    "metadata" JSONB,
    "action_url" VARCHAR,
    "wallet_address" VARCHAR NOT NULL,
    "read_at" TIMESTAMP(6),

    CONSTRAINT "PK_notifications_id" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."referral_codes" (
    "id" SERIAL NOT NULL,
    "created_at" TIMESTAMP(6) NOT NULL,
    "updated_at" TIMESTAMP(6) NOT NULL,
    "code" VARCHAR(8) NOT NULL,
    "times_used" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "PK_99f08e2ed9d39d8ce902f5f1f41" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."request_payment" (
    "id" SERIAL NOT NULL,
    "created_at" TIMESTAMP(6) NOT NULL,
    "updated_at" TIMESTAMP(6) NOT NULL,
    "amount" VARCHAR NOT NULL,
    "token" VARCHAR,
    "message" VARCHAR NOT NULL,
    "status" "public"."request_payment_status_enum" NOT NULL DEFAULT 'pending',
    "payer" VARCHAR NOT NULL,
    "payee" VARCHAR NOT NULL,
    "is_group_payment" BOOLEAN NOT NULL DEFAULT false,
    "group_payment_id" INTEGER,
    "groupPaymentId" INTEGER,

    CONSTRAINT "PK_9cdfb2a54226ab609bb3770d9c7" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."tokens" (
    "id" SERIAL NOT NULL,
    "created_at" TIMESTAMP(6) NOT NULL,
    "updated_at" TIMESTAMP(6) NOT NULL,
    "uuid" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "token_type" "public"."tokens_token_type_enum" NOT NULL,
    "user_id" INTEGER NOT NULL,

    CONSTRAINT "PK_3001e89ada36263dabf1fb6210a" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."transactions" (
    "id" SERIAL NOT NULL,
    "created_at" TIMESTAMP(6) NOT NULL,
    "updated_at" TIMESTAMP(6) NOT NULL,
    "sender" VARCHAR NOT NULL,
    "recipient" VARCHAR NOT NULL,
    "assets" JSONB NOT NULL,
    "private" BOOLEAN NOT NULL DEFAULT true,
    "recallable" BOOLEAN NOT NULL DEFAULT true,
    "recallable_time" TIMESTAMP(6),
    "serial_number" JSONB NOT NULL,
    "note_type" "public"."transactions_note_type_enum",
    "status" "public"."transactions_status_enum" NOT NULL DEFAULT 'pending',
    "recallable_height" INTEGER,
    "note_id" VARCHAR,

    CONSTRAINT "PK_a219afd8dd77ed80f5a862f1db9" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."users" (
    "id" SERIAL NOT NULL,
    "created_at" TIMESTAMP(6) NOT NULL,
    "updated_at" TIMESTAMP(6) NOT NULL,
    "password" VARCHAR NOT NULL,
    "name" VARCHAR NOT NULL,
    "email" VARCHAR NOT NULL,
    "two_factor_auth_secret" VARCHAR,
    "is_two_factor_auth_enabled" BOOLEAN NOT NULL DEFAULT false,
    "role" "public"."users_role_enum",
    "status" "public"."users_status_enum" NOT NULL,
    "referral_code_id" INTEGER,
    "referred_by_id" INTEGER,

    CONSTRAINT "PK_a3ffb1c0c8416b9fc6f907b7433" PRIMARY KEY ("id")
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

    CONSTRAINT "PK_3926d74440fa62e0cc79b74fe01" PRIMARY KEY ("id")
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
    "status" "public"."wallet_auth_keys_status_enum" NOT NULL DEFAULT 'active',
    "last_used_at" TIMESTAMP(6),
    "expires_at" TIMESTAMP(6) NOT NULL,
    "device_fingerprint" VARCHAR,
    "device_type" "public"."wallet_auth_keys_device_type_enum" NOT NULL DEFAULT 'unknown',
    "user_agent" VARCHAR,
    "ip_address" VARCHAR,
    "metadata" JSONB,

    CONSTRAINT "PK_862e76e3b48730df6cf750b0dfb" PRIMARY KEY ("id")
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

    CONSTRAINT "PK_619bd16f69a9477f9c236e95fda" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "IDX_74ddc7ba61c26e64094e43aa58" ON "public"."analytics_endpoint_stats"("method", "created_at");

-- CreateIndex
CREATE INDEX "IDX_9bbd10a409da8b095a7b58b899" ON "public"."analytics_endpoint_stats"("endpoint", "created_at");

-- CreateIndex
CREATE INDEX "IDX_06a6a7ed42c37bd636c8b80524" ON "public"."analytics_events"("user_address");

-- CreateIndex
CREATE INDEX "IDX_595cb60b85eacaa61f4c84b00d" ON "public"."analytics_events"("created_at");

-- CreateIndex
CREATE INDEX "IDX_b3218ffc81c99b2e6fa3e9616e" ON "public"."analytics_events"("user_address", "created_at");

-- CreateIndex
CREATE INDEX "IDX_ca5cf2fce11e3f43c09b2d0077" ON "public"."analytics_events"("event_type", "created_at");

-- CreateIndex
CREATE INDEX "IDX_3e18284d03cf60c26c3119de07" ON "public"."analytics_transaction_stats"("transaction_type", "created_at");

-- CreateIndex
CREATE INDEX "IDX_bed9bb07ee0ec81ab17ae9a9eb" ON "public"."analytics_transaction_stats"("token", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "UQ_bb90cdc04107d1c92d93fffe502" ON "public"."analytics_user_sessions"("session_id");

-- CreateIndex
CREATE INDEX "IDX_322256cfa53887a1facafb787f" ON "public"."analytics_user_sessions"("user_address", "created_at");

-- CreateIndex
CREATE INDEX "IDX_bb90cdc04107d1c92d93fffe50" ON "public"."analytics_user_sessions"("session_id");

-- CreateIndex
CREATE UNIQUE INDEX "REL_593ea7ee438b323776029d3185" ON "public"."auths"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "UQ_categories_name" ON "public"."categories"("name");

-- CreateIndex
CREATE UNIQUE INDEX "UQ_86900efd866b220cc5768ad7a97" ON "public"."gift"("secret_hash");

-- CreateIndex
CREATE UNIQUE INDEX "UQ_752feb6e3dfa73076192e02fdd1" ON "public"."group_payment"("link_code");

-- CreateIndex
CREATE INDEX "IDX_notifications_status" ON "public"."notifications"("status");

-- CreateIndex
CREATE INDEX "IDX_notifications_type" ON "public"."notifications"("type");

-- CreateIndex
CREATE INDEX "IDX_notifications_wallet_address" ON "public"."notifications"("wallet_address");

-- CreateIndex
CREATE INDEX "IDX_notifications_wallet_address_created_at" ON "public"."notifications"("wallet_address", "created_at");

-- CreateIndex
CREATE INDEX "IDX_notifications_wallet_address_status" ON "public"."notifications"("wallet_address", "status");

-- CreateIndex
CREATE UNIQUE INDEX "UQ_adda7b9deda346ff710695f4968" ON "public"."referral_codes"("code");

-- CreateIndex
CREATE UNIQUE INDEX "UQ_57b0dd7af7c6a0b7d4c3fd5c464" ON "public"."tokens"("uuid");

-- CreateIndex
CREATE UNIQUE INDEX "REL_8769073e38c365f315426554ca" ON "public"."tokens"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "UQ_97672ac88f789774dd47f7c8be3" ON "public"."users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "REL_e29dedd79dea4c8cd1ab502107" ON "public"."users"("referral_code_id");

-- CreateIndex
CREATE UNIQUE INDEX "UQ_a78a00605c95ca6737389f6360b" ON "public"."users"("referred_by_id");

-- CreateIndex
CREATE UNIQUE INDEX "UQ_25c1f7c632c9ca51cfed1a7ce14" ON "public"."wallet_auth_challenges"("challenge_code");

-- CreateIndex
CREATE INDEX "IDX_25c1f7c632c9ca51cfed1a7ce1" ON "public"."wallet_auth_challenges"("challenge_code");

-- CreateIndex
CREATE INDEX "IDX_aa929b5be00a79298d8fa71820" ON "public"."wallet_auth_challenges"("created_at");

-- CreateIndex
CREATE INDEX "IDX_b9c58636b9387e2f3d41a950d3" ON "public"."wallet_auth_challenges"("wallet_address", "is_used");

-- CreateIndex
CREATE UNIQUE INDEX "UQ_wallet_auth_keys_wallet_address" ON "public"."wallet_auth_keys"("wallet_address");

-- CreateIndex
CREATE UNIQUE INDEX "UQ_bef196ffd7feeb31b48ffe644f0" ON "public"."wallet_auth_keys"("public_key");

-- CreateIndex
CREATE INDEX "IDX_64f608d78b3d85a67287f77298" ON "public"."wallet_auth_keys"("wallet_address");

-- CreateIndex
CREATE INDEX "IDX_82f27d8cc4c2b2d2c7f1c977fa" ON "public"."wallet_auth_keys"("wallet_address", "status");

-- CreateIndex
CREATE INDEX "IDX_bef196ffd7feeb31b48ffe644f" ON "public"."wallet_auth_keys"("public_key");

-- CreateIndex
CREATE INDEX "IDX_dd314e6fba34f5ffa1f2ff9f92" ON "public"."wallet_auth_keys"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX "UQ_d4fc33e5a4ff0f44b46745d6044" ON "public"."wallet_auth_sessions"("session_token");

-- CreateIndex
CREATE INDEX "IDX_718711db1f248f3dcfe7062255" ON "public"."wallet_auth_sessions"("wallet_address", "is_active");

-- CreateIndex
CREATE INDEX "IDX_90d2b00146d157c4b8a9f8a038" ON "public"."wallet_auth_sessions"("auth_key_id");

-- CreateIndex
CREATE INDEX "IDX_d4fc33e5a4ff0f44b46745d604" ON "public"."wallet_auth_sessions"("session_token");

-- AddForeignKey
ALTER TABLE "public"."address_book" ADD CONSTRAINT "FK_address_book_category" FOREIGN KEY ("categoryId") REFERENCES "public"."categories"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."auths" ADD CONSTRAINT "FK_593ea7ee438b323776029d3185f" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."group_payment" ADD CONSTRAINT "FK_2043920d55348e76ec85cc7a697" FOREIGN KEY ("groupId") REFERENCES "public"."group_payment_group"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."group_payment_member_status" ADD CONSTRAINT "FK_2b5e0e8e862cc615b7784956138" FOREIGN KEY ("groupPaymentId") REFERENCES "public"."group_payment"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."notifications" ADD CONSTRAINT "FK_notifications_wallet_address" FOREIGN KEY ("wallet_address") REFERENCES "public"."wallet_auth_keys"("wallet_address") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."request_payment" ADD CONSTRAINT "FK_e1233322d02cfe645f877ee0042" FOREIGN KEY ("groupPaymentId") REFERENCES "public"."group_payment"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."tokens" ADD CONSTRAINT "FK_8769073e38c365f315426554ca5" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."users" ADD CONSTRAINT "FK_a78a00605c95ca6737389f6360b" FOREIGN KEY ("referred_by_id") REFERENCES "public"."users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."users" ADD CONSTRAINT "FK_e29dedd79dea4c8cd1ab5021079" FOREIGN KEY ("referral_code_id") REFERENCES "public"."referral_codes"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

