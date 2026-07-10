-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'DOCTOR', 'PATIENT');

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "Gender" AS ENUM ('FEMALE', 'MALE', 'OTHER', 'UNDISCLOSED');

-- CreateEnum
CREATE TYPE "AppointmentStatus" AS ENUM ('SCHEDULED', 'CONFIRMED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "AuditAction" AS ENUM ('CREATE', 'UPDATE', 'DELETE', 'SOFT_DELETE', 'LOGIN', 'LOGOUT', 'PASSWORD_RESET', 'VIEW', 'DOWNLOAD', 'UPLOAD', 'REPLACE_FILE');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "authUserId" UUID NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'PATIENT',
    "status" "UserStatus" NOT NULL DEFAULT 'ACTIVE',
    "locale" VARCHAR(10) NOT NULL DEFAULT 'pt-BR',
    "lastLoginAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "profiles" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "userId" UUID NOT NULL,
    "fullName" VARCHAR(150) NOT NULL,
    "phone" VARCHAR(20),
    "avatarUrl" VARCHAR(2048),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "patients" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "createdByUserId" UUID,
    "userId" UUID,
    "assignedDoctorId" UUID,
    "fullName" VARCHAR(150) NOT NULL,
    "cpf" VARCHAR(14),
    "birthDate" TIMESTAMP(3),
    "gender" "Gender" NOT NULL DEFAULT 'UNDISCLOSED',
    "phone" VARCHAR(20),
    "email" VARCHAR(255),
    "address" VARCHAR(500),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "patients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "doctors" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "userId" UUID,
    "createdByUserId" UUID,
    "fullName" VARCHAR(150) NOT NULL,
    "crm" VARCHAR(30) NOT NULL,
    "specialty" VARCHAR(100) NOT NULL,
    "phone" VARCHAR(20),
    "email" VARCHAR(255),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "doctors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "appointments" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "patientId" UUID NOT NULL,
    "doctorId" UUID NOT NULL,
    "createdByUserId" UUID NOT NULL,
    "startsAt" TIMESTAMPTZ(6) NOT NULL,
    "endsAt" TIMESTAMPTZ(6) NOT NULL,
    "durationMinutes" INTEGER NOT NULL,
    "notes" TEXT,
    "status" "AppointmentStatus" NOT NULL DEFAULT 'SCHEDULED',
    "confirmedAt" TIMESTAMPTZ(6),
    "startedAt" TIMESTAMPTZ(6),
    "completedAt" TIMESTAMPTZ(6),
    "cancelledAt" TIMESTAMPTZ(6),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "appointments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "medical_reports" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "title" VARCHAR(150) NOT NULL,
    "patientId" UUID NOT NULL,
    "doctorId" UUID NOT NULL,
    "appointmentId" UUID,
    "createdByUserId" UUID NOT NULL,
    "reportDate" TIMESTAMP(3) NOT NULL,
    "observations" TEXT,
    "specialty" VARCHAR(100) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "medical_reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "attachments" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "medicalReportId" UUID NOT NULL,
    "uploadedByUserId" UUID NOT NULL,
    "originalName" VARCHAR(255) NOT NULL,
    "internalName" VARCHAR(255) NOT NULL,
    "mimeType" VARCHAR(100) NOT NULL,
    "extension" VARCHAR(10) NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "url" VARCHAR(2048) NOT NULL,
    "bucket" VARCHAR(100) NOT NULL,
    "path" VARCHAR(2048) NOT NULL,
    "hash" VARCHAR(128) NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "isCurrent" BOOLEAN NOT NULL DEFAULT true,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "replacedAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "attachments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "actorUserId" UUID,
    "action" "AuditAction" NOT NULL,
    "resourceType" VARCHAR(100) NOT NULL,
    "resourceId" UUID,
    "metadata" JSONB,
    "ipAddress" VARCHAR(45),
    "userAgent" VARCHAR(500),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateUniqueIndex
CREATE UNIQUE INDEX "users_auth_user_id_key" ON "users"("authUserId");
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");
CREATE UNIQUE INDEX "profiles_user_id_key" ON "profiles"("userId");
CREATE UNIQUE INDEX "patients_cpf_key" ON "patients"("cpf");
CREATE UNIQUE INDEX "patients_user_id_key" ON "patients"("userId");
CREATE UNIQUE INDEX "doctors_crm_key" ON "doctors"("crm");
CREATE UNIQUE INDEX "doctors_user_id_key" ON "doctors"("userId");
CREATE UNIQUE INDEX "attachments_medical_report_id_version_key" ON "attachments"("medicalReportId", "version");

-- CreateIndex
CREATE INDEX "users_role_status_idx" ON "users"("role", "status");
CREATE INDEX "users_deleted_at_idx" ON "users"("deletedAt");
CREATE INDEX "profiles_full_name_idx" ON "profiles"("fullName");
CREATE INDEX "profiles_deleted_at_idx" ON "profiles"("deletedAt");
CREATE INDEX "patients_created_by_user_id_idx" ON "patients"("createdByUserId");
CREATE INDEX "patients_assigned_doctor_id_idx" ON "patients"("assignedDoctorId");
CREATE INDEX "patients_user_id_idx" ON "patients"("userId");
CREATE INDEX "patients_full_name_idx" ON "patients"("fullName");
CREATE INDEX "patients_email_idx" ON "patients"("email");
CREATE INDEX "patients_deleted_at_idx" ON "patients"("deletedAt");
CREATE INDEX "doctors_created_by_user_id_idx" ON "doctors"("createdByUserId");
CREATE INDEX "doctors_full_name_idx" ON "doctors"("fullName");
CREATE INDEX "doctors_specialty_idx" ON "doctors"("specialty");
CREATE INDEX "doctors_deleted_at_idx" ON "doctors"("deletedAt");
CREATE INDEX "appointments_doctor_starts_at_idx" ON "appointments"("doctorId", "startsAt");
CREATE INDEX "appointments_patient_starts_at_idx" ON "appointments"("patientId", "startsAt");
CREATE INDEX "appointments_status_starts_at_idx" ON "appointments"("status", "startsAt");
CREATE INDEX "appointments_deleted_at_idx" ON "appointments"("deletedAt");
CREATE INDEX "medical_reports_patient_report_date_idx" ON "medical_reports"("patientId", "reportDate");
CREATE INDEX "medical_reports_doctor_report_date_idx" ON "medical_reports"("doctorId", "reportDate");
CREATE INDEX "medical_reports_specialty_idx" ON "medical_reports"("specialty");
CREATE INDEX "medical_reports_deleted_at_idx" ON "medical_reports"("deletedAt");
CREATE INDEX "attachments_medical_report_current_idx" ON "attachments"("medicalReportId", "isCurrent");
CREATE INDEX "attachments_bucket_path_idx" ON "attachments"("bucket", "path");
CREATE INDEX "attachments_hash_idx" ON "attachments"("hash");
CREATE INDEX "attachments_deleted_at_idx" ON "attachments"("deletedAt");
CREATE INDEX "audit_logs_actor_created_at_idx" ON "audit_logs"("actorUserId", "createdAt");
CREATE INDEX "audit_logs_resource_idx" ON "audit_logs"("resourceType", "resourceId");
CREATE INDEX "audit_logs_action_created_at_idx" ON "audit_logs"("action", "createdAt");
CREATE INDEX "audit_logs_deleted_at_idx" ON "audit_logs"("deletedAt");

-- AddForeignKey
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "patients" ADD CONSTRAINT "patients_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "patients" ADD CONSTRAINT "patients_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "patients" ADD CONSTRAINT "patients_assignedDoctorId_fkey" FOREIGN KEY ("assignedDoctorId") REFERENCES "doctors"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "doctors" ADD CONSTRAINT "doctors_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "doctors" ADD CONSTRAINT "doctors_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_doctorId_fkey" FOREIGN KEY ("doctorId") REFERENCES "doctors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "medical_reports" ADD CONSTRAINT "medical_reports_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "appointments"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "medical_reports" ADD CONSTRAINT "medical_reports_doctorId_fkey" FOREIGN KEY ("doctorId") REFERENCES "doctors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "medical_reports" ADD CONSTRAINT "medical_reports_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "medical_reports" ADD CONSTRAINT "medical_reports_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "attachments" ADD CONSTRAINT "attachments_medicalReportId_fkey" FOREIGN KEY ("medicalReportId") REFERENCES "medical_reports"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "attachments" ADD CONSTRAINT "attachments_uploadedByUserId_fkey" FOREIGN KEY ("uploadedByUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
