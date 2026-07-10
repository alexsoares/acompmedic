-- Enable RLS on core tables
ALTER TABLE "patients" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "doctors" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "appointments" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "medical_reports" ENABLE ROW LEVEL SECURITY;

-- Helper function to fetch logge-in user role and references in security context
CREATE OR REPLACE FUNCTION get_current_user_data()
RETURNS TABLE (
  user_id UUID,
  user_role "UserRole",
  doctor_id UUID,
  patient_id UUID
) SECURITY DEFINER AS $$
BEGIN
  RETURN QUERY
  SELECT 
    u.id AS user_id,
    u.role AS user_role,
    d.id AS doctor_id,
    p.id AS patient_id
  FROM "users" u
  LEFT JOIN "doctors" d ON d."userId" = u.id
  LEFT JOIN "patients" p ON p."userId" = u.id
  WHERE u."authUserId" = auth.uid();
END;
$$ LANGUAGE plpgsql;

-- RLS Policies for 'patients'
CREATE POLICY "patients_policy" ON "patients"
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM get_current_user_data() u
      WHERE u.user_role = 'ADMIN'
         OR (u.user_role = 'DOCTOR' AND "patients"."assignedDoctorId" = u.doctor_id)
         OR (u.user_role = 'PATIENT' AND "patients"."userId" = u.user_id)
    )
  );

-- RLS Policies for 'doctors'
CREATE POLICY "doctors_policy" ON "doctors"
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM get_current_user_data() u
      WHERE u.user_role = 'ADMIN'
         OR (u.user_role = 'DOCTOR' AND "doctors"."id" = u.doctor_id)
    )
  );

-- RLS Policies for 'appointments'
CREATE POLICY "appointments_policy" ON "appointments"
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM get_current_user_data() u
      WHERE u.user_role = 'ADMIN'
         OR (u.user_role = 'DOCTOR' AND "appointments"."doctorId" = u.doctor_id)
         OR (u.user_role = 'PATIENT' AND "appointments"."patientId" = u.patient_id)
    )
  );

-- RLS Policies for 'medical_reports'
CREATE POLICY "medical_reports_policy" ON "medical_reports"
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM get_current_user_data() u
      WHERE u.user_role = 'ADMIN'
         OR (u.user_role = 'DOCTOR' AND "medical_reports"."doctorId" = u.doctor_id)
         OR (u.user_role = 'PATIENT' AND "medical_reports"."patientId" = u.patient_id)
    )
  );
