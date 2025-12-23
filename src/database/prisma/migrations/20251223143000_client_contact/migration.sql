-- CreateTable
CREATE TABLE "clients" (
    "id" SERIAL NOT NULL,
    "uuid" TEXT NOT NULL,
    "created_at" TIMESTAMP(6) NOT NULL,
    "updated_at" TIMESTAMP(6) NOT NULL,
    "company_id" INTEGER NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "company_name" VARCHAR(255) NOT NULL,
    "company_type" VARCHAR(100),
    "country" VARCHAR(100),
    "state" VARCHAR(100),
    "city" VARCHAR(100),
    "address_1" VARCHAR(255),
    "address_2" VARCHAR(255),
    "tax_id" VARCHAR(100),
    "postal_code" VARCHAR(20),
    "registration_number" VARCHAR(100),

    CONSTRAINT "clients_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "clients_company_id_email_key" ON "clients"("company_id", "email");

-- CreateIndex
CREATE INDEX "clients_company_id_idx" ON "clients"("company_id");

-- CreateIndex
CREATE INDEX "clients_email_idx" ON "clients"("email");

-- AddForeignKey
ALTER TABLE "clients" ADD CONSTRAINT "clients_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

