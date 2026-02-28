-- Add clinician profile and billing fields for future invoicing
ALTER TABLE "User"
ADD COLUMN "fullName" TEXT,
ADD COLUMN "phone" TEXT,
ADD COLUMN "kennitala" TEXT,
ADD COLUMN "companyName" TEXT,
ADD COLUMN "streetAddress" TEXT,
ADD COLUMN "addressLine2" TEXT,
ADD COLUMN "postalCode" TEXT,
ADD COLUMN "city" TEXT,
ADD COLUMN "country" TEXT,
ADD COLUMN "invoiceEmail" TEXT,
ADD COLUMN "bankAccount" TEXT,
ADD COLUMN "iban" TEXT,
ADD COLUMN "swiftCode" TEXT,
ADD COLUMN "vatNumber" TEXT,
ADD COLUMN "invoiceNotes" TEXT;

CREATE UNIQUE INDEX "User_kennitala_key" ON "User"("kennitala");
