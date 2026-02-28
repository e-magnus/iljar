/*
  Warnings:

  - You are about to drop the column `bookedByName` on the `Appointment` table. All the data in the column will be lost.
  - You are about to drop the column `bookedByPhone` on the `Appointment` table. All the data in the column will be lost.
  - You are about to drop the column `address` on the `Client` table. All the data in the column will be lost.
  - You are about to drop the column `clinicalSummary` on the `Client` table. All the data in the column will be lost.
  - You are about to drop the column `consentStatus` on the `Client` table. All the data in the column will be lost.
  - You are about to drop the column `consentUpdatedAt` on the `Client` table. All the data in the column will be lost.
  - You are about to drop the column `contactName` on the `Client` table. All the data in the column will be lost.
  - You are about to drop the column `contactPhone` on the `Client` table. All the data in the column will be lost.
  - You are about to drop the column `contactRelation` on the `Client` table. All the data in the column will be lost.
  - You are about to drop the column `email` on the `Client` table. All the data in the column will be lost.
  - You are about to drop the column `riskLevel` on the `Client` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Appointment" DROP COLUMN "bookedByName",
DROP COLUMN "bookedByPhone";

-- AlterTable
ALTER TABLE "Client" DROP COLUMN "address",
DROP COLUMN "clinicalSummary",
DROP COLUMN "consentStatus",
DROP COLUMN "consentUpdatedAt",
DROP COLUMN "contactName",
DROP COLUMN "contactPhone",
DROP COLUMN "contactRelation",
DROP COLUMN "email",
DROP COLUMN "riskLevel";
