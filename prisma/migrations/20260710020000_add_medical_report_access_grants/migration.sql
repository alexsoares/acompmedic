CREATE TABLE "medical_report_access_grants" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "medical_report_id" UUID NOT NULL,
    "doctor_id" UUID NOT NULL,
    "granted_by_patient_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "medical_report_access_grants_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "medical_report_access_grants_report_doctor_key"
    ON "medical_report_access_grants"("medical_report_id", "doctor_id");

CREATE INDEX "medical_report_access_grants_doctor_deleted_idx"
    ON "medical_report_access_grants"("doctor_id", "deleted_at");

CREATE INDEX "medical_report_access_grants_report_deleted_idx"
    ON "medical_report_access_grants"("medical_report_id", "deleted_at");

CREATE INDEX "medical_report_access_grants_patient_deleted_idx"
    ON "medical_report_access_grants"("granted_by_patient_id", "deleted_at");

ALTER TABLE "medical_report_access_grants"
    ADD CONSTRAINT "medical_report_access_grants_medical_report_id_fkey"
    FOREIGN KEY ("medical_report_id") REFERENCES "medical_reports"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "medical_report_access_grants"
    ADD CONSTRAINT "medical_report_access_grants_doctor_id_fkey"
    FOREIGN KEY ("doctor_id") REFERENCES "doctors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "medical_report_access_grants"
    ADD CONSTRAINT "medical_report_access_grants_granted_by_patient_id_fkey"
    FOREIGN KEY ("granted_by_patient_id") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
