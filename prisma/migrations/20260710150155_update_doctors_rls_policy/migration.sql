-- Drop existing policy
DROP POLICY IF EXISTS "doctors_policy" ON "doctors";

-- Recreate policy with Patient support
CREATE POLICY "doctors_policy" ON "doctors"
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM get_current_user_data() u
      WHERE u.user_role = 'ADMIN'
         OR (u.user_role = 'DOCTOR' AND "doctors"."id" = u.doctor_id)
         OR (u.user_role = 'PATIENT' AND "doctors"."createdByUserId" = u.user_id)
    )
  );