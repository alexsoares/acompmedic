/*
  Warnings:

  - You are about to drop the column `created_at` on the `medical_report_access_grants` table. All the data in the column will be lost.
  - You are about to drop the column `deleted_at` on the `medical_report_access_grants` table. All the data in the column will be lost.
  - You are about to drop the column `updated_at` on the `medical_report_access_grants` table. All the data in the column will be lost.
  - Added the required column `updatedAt` to the `medical_report_access_grants` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "medical_report_access_grants_doctor_deleted_idx";

-- DropIndex
DROP INDEX "medical_report_access_grants_patient_deleted_idx";

-- DropIndex
DROP INDEX "medical_report_access_grants_report_deleted_idx";

-- AlterTable
ALTER TABLE "medical_report_access_grants" DROP COLUMN "created_at",
DROP COLUMN "deleted_at",
DROP COLUMN "updated_at",
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "deletedAt" TIMESTAMP(3),
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- CreateIndex
CREATE INDEX "medical_report_access_grants_doctor_deleted_idx" ON "medical_report_access_grants"("doctor_id", "deletedAt");

-- CreateIndex
CREATE INDEX "medical_report_access_grants_report_deleted_idx" ON "medical_report_access_grants"("medical_report_id", "deletedAt");

-- CreateIndex
CREATE INDEX "medical_report_access_grants_patient_deleted_idx" ON "medical_report_access_grants"("granted_by_patient_id", "deletedAt");
