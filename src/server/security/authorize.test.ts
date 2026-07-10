import { UserRole } from "@prisma/client";
import { describe, expect, it } from "vitest";

import { buildMedicalReportWhereClause } from "@/server/security/authorize";

describe("buildMedicalReportWhereClause", () => {
  it("returns unrestricted where for admin", () => {
    const where = buildMedicalReportWhereClause({
      id: "user-admin",
      role: UserRole.ADMIN,
      email: "admin@test.local",
      doctorId: null,
      patientId: null,
    });

    expect(where).toEqual({});
  });

  it("includes direct doctor ownership and patient grant for doctor role", () => {
    const where = buildMedicalReportWhereClause({
      id: "user-doctor",
      role: UserRole.DOCTOR,
      email: "doctor@test.local",
      doctorId: "doctor-1",
      patientId: null,
    });

    expect(where).toEqual({
      OR: [
        { doctorId: "doctor-1" },
        {
          accessGrants: {
            some: {
              doctorId: "doctor-1",
              deletedAt: null,
            },
          },
        },
      ],
    });
  });

  it("keeps patient visibility restricted to own records", () => {
    const where = buildMedicalReportWhereClause({
      id: "user-patient",
      role: UserRole.PATIENT,
      email: "patient@test.local",
      doctorId: null,
      patientId: "patient-1",
    });

    expect(where).toEqual({ patientId: "patient-1" });
  });
});