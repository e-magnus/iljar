-- AlterTable
ALTER TABLE "Client"
ADD COLUMN "customClinicalFlags" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

-- AlterTable
ALTER TABLE "Settings"
ADD COLUMN "customClinicalFlags" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
