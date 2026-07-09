import {
  AppointmentStatus,
  AuditAction,
  Gender,
  PrismaClient,
  UserRole,
  UserStatus,
} from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const adminUserId = "5d0ba1d6-7af6-4585-9e27-e61f0a4d56d3";
  const doctorUserId = "ca2dfd34-603a-40f4-b367-14d696f91998";
  const patientId = "e15b8cab-c78a-4cc0-b4d9-74dfef052ccc";
  const doctorId = "6bb88934-a9cb-4f24-8a0a-25d8ca74ee4b";
  const appointmentId = "ca8e33cf-2a6e-4af6-a31a-9bb60ddf6f3d";
  const medicalReportId = "7fd7f253-fd2a-4313-b6b1-3091f8eacabc";
  const attachmentId = "ed32d8b3-5376-4896-8bcc-07e7b81eae6f";

  const adminUser = await prisma.user.upsert({
    where: { email: "admin@acompmedic.local" },
    update: {
      role: UserRole.ADMIN,
      status: UserStatus.ACTIVE,
    },
    create: {
      id: adminUserId,
      authUserId: adminUserId,
      email: "admin@acompmedic.local",
      role: UserRole.ADMIN,
      status: UserStatus.ACTIVE,
      profile: {
        create: {
          fullName: "Administrador do Sistema",
          phone: "+55 11 99999-0001",
        },
      },
    },
  });

  await prisma.user.upsert({
    where: { email: "medico@acompmedic.local" },
    update: {
      role: UserRole.DOCTOR,
      status: UserStatus.ACTIVE,
    },
    create: {
      id: doctorUserId,
      authUserId: doctorUserId,
      email: "medico@acompmedic.local",
      role: UserRole.DOCTOR,
      status: UserStatus.ACTIVE,
      profile: {
        create: {
          fullName: "Dra. Marina Couto",
          phone: "+55 11 99999-0002",
        },
      },
    },
  });

  await prisma.patient.upsert({
    where: { cpf: "12345678901" },
    update: {},
    create: {
      id: patientId,
      fullName: "Carlos Henrique Nunes",
      cpf: "12345678901",
      birthDate: new Date("1989-04-23T00:00:00.000Z"),
      gender: Gender.MALE,
      email: "carlos.nunes@example.com",
      phone: "+55 11 98888-7777",
      address: "Rua das Acacias, 120 - Sao Paulo/SP",
      notes: "Paciente com historico de acompanhamento cardiologico.",
    },
  });

  await prisma.doctor.upsert({
    where: { crm: "CRM-SP-123456" },
    update: {},
    create: {
      id: doctorId,
      userId: doctorUserId,
      fullName: "Dra. Marina Couto",
      crm: "CRM-SP-123456",
      specialty: "Cardiologia",
      email: "medico@acompmedic.local",
      phone: "+55 11 97777-6666",
    },
  });

  await prisma.appointment.upsert({
    where: { id: appointmentId },
    update: {},
    create: {
      id: appointmentId,
      patientId,
      doctorId,
      createdByUserId: adminUser.id,
      startsAt: new Date("2026-07-10T13:00:00.000Z"),
      endsAt: new Date("2026-07-10T13:30:00.000Z"),
      durationMinutes: 30,
      notes: "Consulta de acompanhamento trimestral.",
      status: AppointmentStatus.CONFIRMED,
      confirmedAt: new Date("2026-07-09T10:00:00.000Z"),
    },
  });

  await prisma.medicalReport.upsert({
    where: { id: medicalReportId },
    update: {},
    create: {
      id: medicalReportId,
      title: "Laudo cardiologico de acompanhamento",
      patientId,
      doctorId,
      appointmentId,
      createdByUserId: adminUser.id,
      reportDate: new Date("2026-07-10T14:00:00.000Z"),
      observations: "Paciente apresentou melhora clinica, sem novas queixas.",
      specialty: "Cardiologia",
      attachments: {
        create: {
          id: attachmentId,
          uploadedByUserId: adminUser.id,
          originalName: "laudo-cardiologico.pdf",
          internalName: "7fd7f253-fd2a-4313-b6b1-3091f8eacabc-v1.pdf",
          mimeType: "application/pdf",
          extension: "pdf",
          sizeBytes: 180245,
          url: "https://example.supabase.co/storage/v1/object/sign/medical-reports/reports/patient-e15b8cab/report-7fd7f253/v1.pdf",
          bucket: "medical-reports",
          path: "reports/patient-e15b8cab/report-7fd7f253/v1.pdf",
          hash: "sha256:1d1f2614fb1bb7fb86ecdbff5d9cc1a79b951b2598c55d4b14c0f8d8c31891ef",
          version: 1,
          isCurrent: true,
        },
      },
    },
  });

  await prisma.auditLog.create({
    data: {
      actorUserId: adminUser.id,
      action: AuditAction.CREATE,
      resourceType: "medical_report",
      resourceId: medicalReportId,
      metadata: {
        source: "seed",
        title: "Laudo cardiologico de acompanhamento",
      },
      ipAddress: "127.0.0.1",
      userAgent: "seed-script",
    },
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });