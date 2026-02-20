-- AlterTable
ALTER TABLE "Client"
ADD COLUMN "address" TEXT,
ADD COLUMN "clinicalSummary" TEXT,
ADD COLUMN "riskLevel" TEXT,
ADD COLUMN "consentStatus" TEXT,
ADD COLUMN "consentUpdatedAt" TIMESTAMP(3),
ADD COLUMN "contactRelation" TEXT,
ADD COLUMN "contactNote" TEXT;
