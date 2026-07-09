CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "btree_gist";

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'STAFF', 'DOCTOR');

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
    "role" "UserRole" NOT NULL DEFAULT 'STAFF',
    "status" "UserStatus" NOT NULL DEFAULT 'ACTIVE',
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
    "fullName" VARCHAR(150) NOT NULL,
    "cpf" VARCHAR(14) NOT NULL,
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

-- CreateIndex
CREATE UNIQUE INDEX "users_auth_user_id_key" ON "users"("authUserId");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_role_status_idx" ON "users"("role", "status");

-- CreateIndex
CREATE INDEX "users_deleted_at_idx" ON "users"("deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "profiles_user_id_key" ON "profiles"("userId");

-- CreateIndex
CREATE INDEX "profiles_full_name_idx" ON "profiles"("fullName");

-- CreateIndex
CREATE INDEX "profiles_deleted_at_idx" ON "profiles"("deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "patients_cpf_key" ON "patients"("cpf");

-- CreateIndex
CREATE INDEX "patients_full_name_idx" ON "patients"("fullName");

-- CreateIndex
CREATE INDEX "patients_email_idx" ON "patients"("email");

-- CreateIndex
CREATE INDEX "patients_deleted_at_idx" ON "patients"("deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "doctors_user_id_key" ON "doctors"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "doctors_crm_key" ON "doctors"("crm");

-- CreateIndex
CREATE INDEX "doctors_full_name_idx" ON "doctors"("fullName");

-- CreateIndex
CREATE INDEX "doctors_specialty_idx" ON "doctors"("specialty");

-- CreateIndex
CREATE INDEX "doctors_deleted_at_idx" ON "doctors"("deletedAt");

-- CreateIndex
CREATE INDEX "appointments_doctor_starts_at_idx" ON "appointments"("doctorId", "startsAt");

-- CreateIndex
CREATE INDEX "appointments_patient_starts_at_idx" ON "appointments"("patientId", "startsAt");

-- CreateIndex
CREATE INDEX "appointments_status_starts_at_idx" ON "appointments"("status", "startsAt");

-- CreateIndex
CREATE INDEX "appointments_deleted_at_idx" ON "appointments"("deletedAt");

-- CreateIndex
CREATE INDEX "medical_reports_patient_report_date_idx" ON "medical_reports"("patientId", "reportDate");

-- CreateIndex
CREATE INDEX "medical_reports_doctor_report_date_idx" ON "medical_reports"("doctorId", "reportDate");

-- CreateIndex
CREATE INDEX "medical_reports_specialty_idx" ON "medical_reports"("specialty");

-- CreateIndex
CREATE INDEX "medical_reports_deleted_at_idx" ON "medical_reports"("deletedAt");

-- CreateIndex
CREATE INDEX "attachments_medical_report_current_idx" ON "attachments"("medicalReportId", "isCurrent");

-- CreateIndex
CREATE INDEX "attachments_bucket_path_idx" ON "attachments"("bucket", "path");

-- CreateIndex
CREATE INDEX "attachments_hash_idx" ON "attachments"("hash");

-- CreateIndex
CREATE INDEX "attachments_deleted_at_idx" ON "attachments"("deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "attachments_medical_report_id_version_key" ON "attachments"("medicalReportId", "version");

-- CreateIndex
CREATE INDEX "audit_logs_actor_created_at_idx" ON "audit_logs"("actorUserId", "createdAt");

-- CreateIndex
CREATE INDEX "audit_logs_resource_idx" ON "audit_logs"("resourceType", "resourceId");

-- CreateIndex
CREATE INDEX "audit_logs_action_created_at_idx" ON "audit_logs"("action", "createdAt");

-- CreateIndex
CREATE INDEX "audit_logs_deleted_at_idx" ON "audit_logs"("deletedAt");

-- AddForeignKey
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "doctors" ADD CONSTRAINT "doctors_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_doctorId_fkey" FOREIGN KEY ("doctorId") REFERENCES "doctors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "medical_reports" ADD CONSTRAINT "medical_reports_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "appointments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "medical_reports" ADD CONSTRAINT "medical_reports_doctorId_fkey" FOREIGN KEY ("doctorId") REFERENCES "doctors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "medical_reports" ADD CONSTRAINT "medical_reports_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "medical_reports" ADD CONSTRAINT "medical_reports_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attachments" ADD CONSTRAINT "attachments_medicalReportId_fkey" FOREIGN KEY ("medicalReportId") REFERENCES "medical_reports"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attachments" ADD CONSTRAINT "attachments_uploadedByUserId_fkey" FOREIGN KEY ("uploadedByUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "appointments"
        ADD CONSTRAINT "appointments_duration_minutes_check" CHECK ("durationMinutes" > 0 AND "durationMinutes" <= 1440),
        ADD CONSTRAINT "appointments_starts_before_ends_check" CHECK ("startsAt" < "endsAt");

ALTER TABLE "attachments"
        ADD CONSTRAINT "attachments_allowed_mime_type_check" CHECK ("mimeType" IN ('application/pdf', 'text/plain')),
        ADD CONSTRAINT "attachments_allowed_extension_check" CHECK (LOWER("extension") IN ('pdf', 'txt')),
        ADD CONSTRAINT "attachments_size_bytes_check" CHECK ("sizeBytes" > 0 AND "sizeBytes" <= 20971520);

CREATE UNIQUE INDEX "attachments_one_current_per_report_idx"
ON "attachments"("medicalReportId")
WHERE "isCurrent" = true AND "deletedAt" IS NULL;

ALTER TABLE "appointments"
        ADD CONSTRAINT "appointments_doctor_no_overlap_excl"
        EXCLUDE USING gist (
                "doctorId" WITH =,
                tstzrange("startsAt", "endsAt", '[)') WITH &&
        )
        WHERE ("deletedAt" IS NULL AND "status" <> 'CANCELLED');

CREATE OR REPLACE FUNCTION public.current_app_user_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
        SELECT u."id"
        FROM public."users" u
        WHERE u."authUserId" = auth.uid()
            AND u."deletedAt" IS NULL
        LIMIT 1
$$;

CREATE OR REPLACE FUNCTION public.current_app_role()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
        SELECT u."role"::text
        FROM public."users" u
        WHERE u."authUserId" = auth.uid()
            AND u."deletedAt" IS NULL
        LIMIT 1
$$;

CREATE OR REPLACE FUNCTION public.is_admin_or_staff()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
        SELECT COALESCE(public.current_app_role() IN ('ADMIN', 'STAFF'), false)
$$;

CREATE OR REPLACE FUNCTION public.current_doctor_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
        SELECT d."id"
        FROM public."doctors" d
        INNER JOIN public."users" u ON u."id" = d."userId"
        WHERE u."authUserId" = auth.uid()
            AND d."deletedAt" IS NULL
            AND u."deletedAt" IS NULL
        LIMIT 1
$$;

ALTER TABLE public."users" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."profiles" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."patients" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."doctors" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."appointments" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."medical_reports" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."attachments" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."audit_logs" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_select_self_or_staff"
ON public."users"
FOR SELECT
TO authenticated
USING (
    public.is_admin_or_staff()
    OR "authUserId" = auth.uid()
);

CREATE POLICY "users_update_self_or_staff"
ON public."users"
FOR UPDATE
TO authenticated
USING (
    public.is_admin_or_staff()
    OR "authUserId" = auth.uid()
)
WITH CHECK (
    public.is_admin_or_staff()
    OR "authUserId" = auth.uid()
);

CREATE POLICY "profiles_select_self_or_staff"
ON public."profiles"
FOR SELECT
TO authenticated
USING (
    public.is_admin_or_staff()
    OR "userId" = public.current_app_user_id()
);

CREATE POLICY "profiles_manage_self_or_staff"
ON public."profiles"
FOR ALL
TO authenticated
USING (
    public.is_admin_or_staff()
    OR "userId" = public.current_app_user_id()
)
WITH CHECK (
    public.is_admin_or_staff()
    OR "userId" = public.current_app_user_id()
);

CREATE POLICY "patients_select_staff_or_related_doctor"
ON public."patients"
FOR SELECT
TO authenticated
USING (
    public.is_admin_or_staff()
    OR EXISTS (
        SELECT 1
        FROM public."appointments" a
        WHERE a."patientId" = "patients"."id"
            AND a."doctorId" = public.current_doctor_id()
            AND a."deletedAt" IS NULL
    )
    OR EXISTS (
        SELECT 1
        FROM public."medical_reports" mr
        WHERE mr."patientId" = "patients"."id"
            AND mr."doctorId" = public.current_doctor_id()
            AND mr."deletedAt" IS NULL
    )
);

CREATE POLICY "patients_manage_staff"
ON public."patients"
FOR ALL
TO authenticated
USING (public.is_admin_or_staff())
WITH CHECK (public.is_admin_or_staff());

CREATE POLICY "doctors_select_staff_or_self"
ON public."doctors"
FOR SELECT
TO authenticated
USING (
    public.is_admin_or_staff()
    OR "id" = public.current_doctor_id()
);

CREATE POLICY "doctors_manage_staff"
ON public."doctors"
FOR ALL
TO authenticated
USING (public.is_admin_or_staff())
WITH CHECK (public.is_admin_or_staff());

CREATE POLICY "appointments_select_staff_or_own_doctor"
ON public."appointments"
FOR SELECT
TO authenticated
USING (
    public.is_admin_or_staff()
    OR "doctorId" = public.current_doctor_id()
);

CREATE POLICY "appointments_manage_staff_or_own_doctor"
ON public."appointments"
FOR ALL
TO authenticated
USING (
    public.is_admin_or_staff()
    OR "doctorId" = public.current_doctor_id()
)
WITH CHECK (
    public.is_admin_or_staff()
    OR "doctorId" = public.current_doctor_id()
);

CREATE POLICY "medical_reports_select_staff_or_own_doctor"
ON public."medical_reports"
FOR SELECT
TO authenticated
USING (
    public.is_admin_or_staff()
    OR "doctorId" = public.current_doctor_id()
);

CREATE POLICY "medical_reports_manage_staff_or_own_doctor"
ON public."medical_reports"
FOR ALL
TO authenticated
USING (
    public.is_admin_or_staff()
    OR "doctorId" = public.current_doctor_id()
)
WITH CHECK (
    public.is_admin_or_staff()
    OR "doctorId" = public.current_doctor_id()
);

CREATE POLICY "attachments_select_staff_or_report_doctor"
ON public."attachments"
FOR SELECT
TO authenticated
USING (
    public.is_admin_or_staff()
    OR EXISTS (
        SELECT 1
        FROM public."medical_reports" mr
        WHERE mr."id" = "attachments"."medicalReportId"
            AND mr."doctorId" = public.current_doctor_id()
            AND mr."deletedAt" IS NULL
    )
);

CREATE POLICY "attachments_manage_staff_or_report_doctor"
ON public."attachments"
FOR ALL
TO authenticated
USING (
    public.is_admin_or_staff()
    OR EXISTS (
        SELECT 1
        FROM public."medical_reports" mr
        WHERE mr."id" = "attachments"."medicalReportId"
            AND mr."doctorId" = public.current_doctor_id()
            AND mr."deletedAt" IS NULL
    )
)
WITH CHECK (
    public.is_admin_or_staff()
    OR EXISTS (
        SELECT 1
        FROM public."medical_reports" mr
        WHERE mr."id" = "attachments"."medicalReportId"
            AND mr."doctorId" = public.current_doctor_id()
            AND mr."deletedAt" IS NULL
    )
);

CREATE POLICY "audit_logs_select_staff_only"
ON public."audit_logs"
FOR SELECT
TO authenticated
USING (public.is_admin_or_staff());

CREATE POLICY "audit_logs_insert_authenticated"
ON public."audit_logs"
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() IS NOT NULL);

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'medical-reports',
    'medical-reports',
    false,
    20971520,
    ARRAY['application/pdf', 'text/plain']
)
ON CONFLICT (id) DO UPDATE
SET public = EXCLUDED.public,
        file_size_limit = EXCLUDED.file_size_limit,
        allowed_mime_types = EXCLUDED.allowed_mime_types;

