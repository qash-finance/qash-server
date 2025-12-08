-- CreateEnum
CREATE TYPE "OtpTypeEnum" AS ENUM ('LOGIN', 'EMAIL_VERIFICATION');

-- CreateEnum
CREATE TYPE "CategoryShapeEnum" AS ENUM ('CIRCLE', 'DIAMOND', 'SQUARE', 'TRIANGLE');

-- CreateEnum
CREATE TYPE "NotificationsStatusEnum" AS ENUM ('UNREAD', 'READ');

-- CreateEnum
CREATE TYPE "NotificationsTypeEnum" AS ENUM ('NOP');

-- CreateEnum
CREATE TYPE "PaymentLinkStatusEnum" AS ENUM ('ACTIVE', 'DEACTIVATED');

-- CreateEnum
CREATE TYPE "CompanyTypeEnum" AS ENUM ('SOLE_PROPRIETORSHIP', 'PARTNERSHIP', 'LLP', 'LLC', 'PRIVATE_LIMITED_COMPANY', 'CORPORATION', 'PUBLIC_LIMITED_COMPANY', 'NON_PROFIT', 'OTHER');

-- CreateEnum
CREATE TYPE "CompanyVerificationStatusEnum" AS ENUM ('PENDING', 'UNDER_REVIEW', 'VERIFIED', 'REJECTED', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "TeamMemberRoleEnum" AS ENUM ('OWNER', 'ADMIN', 'VIEWER');

-- CreateEnum
CREATE TYPE "UserRoleEnum" AS ENUM ('USER', 'ADMIN');

-- CreateTable
CREATE TABLE "otp_codes" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "code" VARCHAR(6) NOT NULL,
    "type" "OtpTypeEnum" NOT NULL DEFAULT 'LOGIN',
    "expires_at" TIMESTAMP(6) NOT NULL,
    "is_used" BOOLEAN NOT NULL DEFAULT false,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "otp_codes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_sessions" (
    "id" TEXT NOT NULL,
    "user_id" INTEGER NOT NULL,
    "refresh_token" VARCHAR(500) NOT NULL,
    "user_agent" TEXT,
    "ip_address" VARCHAR(45),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "expires_at" TIMESTAMP(6) NOT NULL,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL,

    CONSTRAINT "user_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" SERIAL NOT NULL,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "role" "UserRoleEnum" NOT NULL DEFAULT 'USER',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "last_login" TIMESTAMP(6),

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "team_members" (
    "id" SERIAL NOT NULL,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL,
    "first_name" VARCHAR(100) NOT NULL,
    "last_name" VARCHAR(100) NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "position" VARCHAR(100),
    "profile_picture" TEXT,
    "role" "TeamMemberRoleEnum" NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "company_id" INTEGER NOT NULL,
    "user_id" INTEGER NOT NULL,
    "invited_by" INTEGER,
    "invited_at" TIMESTAMP(6),
    "joined_at" TIMESTAMP(6),
    "metadata" JSON,

    CONSTRAINT "team_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "companies" (
    "id" SERIAL NOT NULL,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL,
    "company_name" VARCHAR(255) NOT NULL,
    "registration_number" VARCHAR(100) NOT NULL,
    "company_type" "CompanyTypeEnum" NOT NULL,
    "country" VARCHAR(100) NOT NULL,
    "address_1" VARCHAR(255) NOT NULL,
    "address_2" VARCHAR(255),
    "city" VARCHAR(100) NOT NULL,
    "postal_code" VARCHAR(20) NOT NULL,
    "verification_status" "CompanyVerificationStatusEnum" NOT NULL DEFAULT 'PENDING',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "metadata" JSON,

    CONSTRAINT "companies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "company_contacts" (
    "id" SERIAL NOT NULL,
    "created_at" TIMESTAMP(6) NOT NULL,
    "updated_at" TIMESTAMP(6) NOT NULL,
    "company_id" INTEGER NOT NULL,
    "name" VARCHAR NOT NULL,
    "walletAddress" VARCHAR NOT NULL,
    "email" VARCHAR NOT NULL,
    "token" JSON NOT NULL,
    "network" JSON NOT NULL,
    "order" SERIAL NOT NULL,
    "groupId" INTEGER NOT NULL,

    CONSTRAINT "company_contacts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "company_groups" (
    "id" SERIAL NOT NULL,
    "created_at" TIMESTAMP(6) NOT NULL,
    "updated_at" TIMESTAMP(6) NOT NULL,
    "name" VARCHAR NOT NULL,
    "shape" "CategoryShapeEnum" NOT NULL DEFAULT 'CIRCLE',
    "color" VARCHAR NOT NULL,
    "order" SERIAL NOT NULL,
    "company_id" INTEGER NOT NULL,

    CONSTRAINT "company_groups_pkey" PRIMARY KEY ("id")
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
CREATE INDEX "otp_codes_user_id_idx" ON "otp_codes"("user_id");

-- CreateIndex
CREATE INDEX "otp_codes_code_idx" ON "otp_codes"("code");

-- CreateIndex
CREATE INDEX "otp_codes_expires_at_idx" ON "otp_codes"("expires_at");

-- CreateIndex
CREATE UNIQUE INDEX "user_sessions_refresh_token_key" ON "user_sessions"("refresh_token");

-- CreateIndex
CREATE INDEX "user_sessions_user_id_idx" ON "user_sessions"("user_id");

-- CreateIndex
CREATE INDEX "user_sessions_refresh_token_idx" ON "user_sessions"("refresh_token");

-- CreateIndex
CREATE INDEX "user_sessions_expires_at_idx" ON "user_sessions"("expires_at");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_email_idx" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_role_idx" ON "users"("role");

-- CreateIndex
CREATE UNIQUE INDEX "team_members_email_key" ON "team_members"("email");

-- CreateIndex
CREATE UNIQUE INDEX "team_members_user_id_key" ON "team_members"("user_id");

-- CreateIndex
CREATE INDEX "team_members_company_id_idx" ON "team_members"("company_id");

-- CreateIndex
CREATE INDEX "team_members_email_idx" ON "team_members"("email");

-- CreateIndex
CREATE INDEX "team_members_role_idx" ON "team_members"("role");

-- CreateIndex
CREATE INDEX "team_members_user_id_idx" ON "team_members"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "team_members_company_id_email_key" ON "team_members"("company_id", "email");

-- CreateIndex
CREATE UNIQUE INDEX "companies_registration_number_key" ON "companies"("registration_number");

-- CreateIndex
CREATE INDEX "companies_registration_number_idx" ON "companies"("registration_number");

-- CreateIndex
CREATE INDEX "companies_company_name_idx" ON "companies"("company_name");

-- CreateIndex
CREATE INDEX "companies_verification_status_idx" ON "companies"("verification_status");

-- CreateIndex
CREATE INDEX "company_contacts_company_id_idx" ON "company_contacts"("company_id");

-- CreateIndex
CREATE INDEX "company_contacts_groupId_idx" ON "company_contacts"("groupId");

-- CreateIndex
CREATE INDEX "company_groups_company_id_idx" ON "company_groups"("company_id");

-- CreateIndex
CREATE INDEX "company_groups_order_idx" ON "company_groups"("order");

-- CreateIndex
CREATE UNIQUE INDEX "company_groups_company_id_name_key" ON "company_groups"("company_id", "name");

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
ALTER TABLE "otp_codes" ADD CONSTRAINT "otp_codes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_sessions" ADD CONSTRAINT "user_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "team_members" ADD CONSTRAINT "team_members_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "team_members" ADD CONSTRAINT "team_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "team_members" ADD CONSTRAINT "team_members_invited_by_fkey" FOREIGN KEY ("invited_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "company_contacts" ADD CONSTRAINT "company_contacts_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "company_contacts" ADD CONSTRAINT "company_contacts_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "company_groups"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "company_groups" ADD CONSTRAINT "company_groups_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_link_record" ADD CONSTRAINT "payment_link_record_payment_link_id_fkey" FOREIGN KEY ("payment_link_id") REFERENCES "payment_link"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
