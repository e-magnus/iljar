-- CreateEnum
CREATE TYPE "ClinicalFlag" AS ENUM ('ANTICOAGULANT', 'DIABETES', 'ALLERGY', 'NEUROPATHY', 'PACEMAKER', 'OTHER');

-- AlterTable
ALTER TABLE "Client"
ADD COLUMN "clinicalFlags" "ClinicalFlag"[] NOT NULL DEFAULT ARRAY[]::"ClinicalFlag"[];
