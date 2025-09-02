-- AlterTable
ALTER TABLE "public"."transactions" ADD COLUMN     "request_payment_id" INTEGER;

-- AddForeignKey
ALTER TABLE "public"."transactions" ADD CONSTRAINT "FK_request_payment_id" FOREIGN KEY ("request_payment_id") REFERENCES "public"."request_payment"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
