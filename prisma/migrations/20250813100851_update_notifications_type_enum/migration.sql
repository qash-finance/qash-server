-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "public"."notifications_type_enum" ADD VALUE 'REQUEST_PAYMENT';
ALTER TYPE "public"."notifications_type_enum" ADD VALUE 'RECEIVED_PAYMENT';
ALTER TYPE "public"."notifications_type_enum" ADD VALUE 'ADD_TO_BATCH';
ALTER TYPE "public"."notifications_type_enum" ADD VALUE 'GIFT_SEND';
ALTER TYPE "public"."notifications_type_enum" ADD VALUE 'GIFT_OPEN';
ALTER TYPE "public"."notifications_type_enum" ADD VALUE 'GIFT_CLAIM';
