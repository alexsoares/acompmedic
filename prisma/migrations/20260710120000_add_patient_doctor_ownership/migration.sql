ALTER TABLE "patients" ADD COLUMN "createdByUserId" UUID;
ALTER TABLE "doctors" ADD COLUMN "createdByUserId" UUID;

ALTER TABLE "patients"
  ADD CONSTRAINT "patients_createdByUserId_fkey"
  FOREIGN KEY ("createdByUserId") REFERENCES "users"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "doctors"
  ADD CONSTRAINT "doctors_createdByUserId_fkey"
  FOREIGN KEY ("createdByUserId") REFERENCES "users"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "patients_created_by_user_id_idx" ON "patients"("createdByUserId");
CREATE INDEX "doctors_created_by_user_id_idx" ON "doctors"("createdByUserId");
