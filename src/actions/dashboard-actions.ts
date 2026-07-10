"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { AppointmentStatus, Gender, Prisma } from "@prisma/client";

import { PrismaAppointmentRepository } from "@/features/appointments/repository/appointment-repository";
import { AppointmentService } from "@/features/appointments/services/appointment-service";
import { PrismaMedicalReportRepository } from "@/features/medical-reports/repository/medical-report-repository";
import { MedicalReportStorageService } from "@/features/medical-reports/services/medical-report-storage-service";
import { env } from "@/lib/env";
import { db } from "@/server/db";
import { requireAuthenticatedAppUser } from "@/server/security/auth";
import { resolveLinkedIds, ForbiddenError } from "@/server/security/authorize";
import { createMedicalReportsStorageBucket } from "@/server/supabase/storage";

function value(formData: FormData, key: string) {
  const current = formData.get(key);
  return typeof current === "string" ? current.trim() : "";
}

function nullableValue(formData: FormData, key: string) {
  const current = value(formData, key);
  return current.length > 0 ? current : null;
}

function parseLocalDateTime(input: string) {
  const date = new Date(input);

  if (Number.isNaN(date.getTime())) {
    throw new Error("Data inválida.");
  }

  return date;
}

function resolveSafeDashboardPath(input: string | null, fallback: string) {
  if (!input) return fallback;

  try {
    const parsed = new URL(input, "http://localhost");
    return parsed.pathname.startsWith("/dashboard") ? `${parsed.pathname}${parsed.search}` : fallback;
  } catch {
    return input.startsWith("/dashboard") ? input : fallback;
  }
}

function withUploadFeedback(path: string, status: "success" | "error", message: string) {
  const [pathname, existingQuery] = path.split("?");
  const params = new URLSearchParams(existingQuery ?? "");
  params.set("uploadStatus", status);
  params.set("uploadMessage", message);
  const query = params.toString();
  return query ? `${pathname}?${query}` : pathname;
}

export async function updateUserLocale(locale: string) {
  const appUser = await requireAuthenticatedAppUser();
  await db.user.update({
    where: { id: appUser.id },
    data: { locale },
  });
}

export async function createPatient(formData: FormData) {
  const appUser = await requireAuthenticatedAppUser();

  if (appUser.role === "PATIENT") {
    throw new ForbiddenError("Pacientes não podem criar registros de pacientes.");
  }

  const { doctorId } = await resolveLinkedIds(appUser.id);
  let assignedDoctorId = nullableValue(formData, "assignedDoctorId");

  // Se for médico, sempre auto-atribui o paciente a ele mesmo
  if (appUser.role === "DOCTOR") {
    assignedDoctorId = doctorId;
  }

  await db.patient.create({
    data: {
      createdByUserId: appUser.id,
      assignedDoctorId,
      fullName: value(formData, "fullName"),
      cpf: nullableValue(formData, "cpf"),
      birthDate: value(formData, "birthDate") ? new Date(value(formData, "birthDate")) : null,
      gender: (value(formData, "gender") as Gender) || Gender.UNDISCLOSED,
      phone: nullableValue(formData, "phone"),
      email: nullableValue(formData, "email"),
      address: nullableValue(formData, "address"),
      notes: nullableValue(formData, "notes"),
    },
  });

  revalidatePath("/dashboard/pacientes");
}

export async function updatePatient(formData: FormData) {
  const appUser = await requireAuthenticatedAppUser();
  const id = value(formData, "id");

  await assertOwnedPatient(id, appUser);

  const data: Prisma.PatientUpdateInput = {
    fullName: value(formData, "fullName"),
    cpf: nullableValue(formData, "cpf"),
    birthDate: value(formData, "birthDate") ? new Date(value(formData, "birthDate")) : null,
    gender: (value(formData, "gender") as Gender) || Gender.UNDISCLOSED,
    phone: nullableValue(formData, "phone"),
    email: nullableValue(formData, "email"),
    address: nullableValue(formData, "address"),
  };

  if (appUser.role === "ADMIN") {
    const docId = nullableValue(formData, "assignedDoctorId");
    data.assignedDoctor = docId ? { connect: { id: docId } } : { disconnect: true };
  }

  await db.patient.update({
    where: { id },
    data,
  });

  revalidatePath("/dashboard/pacientes");
  redirect("/dashboard/pacientes");
}

export async function deletePatient(formData: FormData) {
  const appUser = await requireAuthenticatedAppUser();
  const id = value(formData, "id");

  await assertOwnedPatient(id, appUser);

  await db.patient.update({
    where: { id },
    data: { deletedAt: new Date() },
  });

  revalidatePath("/dashboard/pacientes");
}

export async function createDoctor(formData: FormData) {
  const appUser = await requireAuthenticatedAppUser();

  if (appUser.role !== "ADMIN" && appUser.role !== "PATIENT") {
    throw new ForbiddenError("Apenas administradores e pacientes podem gerenciar/criar médicos.");
  }

  const associatedUserId = nullableValue(formData, "associatedUserId");

  await db.doctor.create({
    data: {
      createdByUserId: appUser.id,
      userId: associatedUserId || null,
      fullName: value(formData, "fullName"),
      crm: value(formData, "crm"),
      specialty: value(formData, "specialty"),
      phone: nullableValue(formData, "phone"),
      email: nullableValue(formData, "email"),
    },
  });

  revalidatePath("/dashboard/medicos");
}

export async function updateDoctor(formData: FormData) {
  const appUser = await requireAuthenticatedAppUser();
  const doctorId = value(formData, "id");

  if (appUser.role !== "ADMIN") {
    if (appUser.role !== "PATIENT") {
      throw new ForbiddenError("Apenas administradores e pacientes podem gerenciar médicos.");
    }
    const doctor = await db.doctor.findFirst({
      where: { id: doctorId, createdByUserId: appUser.id, deletedAt: null },
    });
    if (!doctor) {
      throw new ForbiddenError("Você não tem permissão para editar este médico.");
    }
  }

  const associatedUserId = nullableValue(formData, "associatedUserId");

  await db.doctor.update({
    where: { id: doctorId },
    data: {
      userId: associatedUserId || null,
      fullName: value(formData, "fullName"),
      crm: value(formData, "crm"),
      specialty: value(formData, "specialty"),
      phone: nullableValue(formData, "phone"),
      email: nullableValue(formData, "email"),
    },
  });

  revalidatePath("/dashboard/medicos");
  redirect("/dashboard/medicos");
}

export async function deleteDoctor(formData: FormData) {
  const appUser = await requireAuthenticatedAppUser();
  const doctorId = value(formData, "id");

  if (appUser.role !== "ADMIN") {
    if (appUser.role !== "PATIENT") {
      throw new ForbiddenError("Apenas administradores e pacientes podem gerenciar médicos.");
    }
    const doctor = await db.doctor.findFirst({
      where: { id: doctorId, createdByUserId: appUser.id, deletedAt: null },
    });
    if (!doctor) {
      throw new ForbiddenError("Você não tem permissão para remover este médico.");
    }
  }

  await db.doctor.update({
    where: { id: doctorId },
    data: { deletedAt: new Date() },
  });

  revalidatePath("/dashboard/medicos");
}

export async function searchDoctorUsers(name: string) {
  const appUser = await requireAuthenticatedAppUser();

  if (!name || name.trim().length < 2) {
    return [];
  }

  const users = await db.user.findMany({
    where: {
      role: "DOCTOR",
      deletedAt: null,
      profile: {
        fullName: {
          contains: name.trim(),
          mode: "insensitive",
        },
      },
    },
    select: {
      id: true,
      email: true,
      profile: {
        select: {
          fullName: true,
        },
      },
      doctorRecords: {
        where: { deletedAt: null },
        select: {
          crm: true,
          specialty: true,
        },
      },
    },
    take: 10,
  });

  return users.map((u) => ({
    id: u.id,
    email: u.email,
    fullName: u.profile?.fullName || u.email,
    crm: u.doctorRecords?.[0]?.crm || "",
    specialty: u.doctorRecords?.[0]?.specialty || "",
  }));
}

export async function createAppointment(formData: FormData) {
  const appUser = await requireAuthenticatedAppUser();

  if (appUser.role === "PATIENT") {
    throw new ForbiddenError("Pacientes não podem criar consultas.");
  }

  const startsAt = parseLocalDateTime(value(formData, "startsAt"));
  const durationMinutes = Number(value(formData, "durationMinutes") || "30");
  const endsAt = new Date(startsAt.getTime() + durationMinutes * 60_000);
  const service = new AppointmentService(new PrismaAppointmentRepository());
  const patientId = value(formData, "patientId");
  const doctorId = value(formData, "doctorId");

  await assertOwnedPatient(patientId, appUser);
  await assertOwnedDoctor(doctorId, appUser);

  await service.create(
    {
      patientId,
      doctorId,
      startsAt,
      endsAt,
      notes: nullableValue(formData, "notes"),
      status: (value(formData, "status") as AppointmentStatus) || AppointmentStatus.SCHEDULED,
    },
    { actorUserId: appUser.id },
  );

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/agenda");
}

export async function updateAppointment(formData: FormData) {
  const appUser = await requireAuthenticatedAppUser();
  const id = value(formData, "id");

  if (appUser.role === "PATIENT") {
    throw new ForbiddenError("Pacientes não podem modificar consultas.");
  }

  await assertOwnedAppointment(id, appUser);

  const startsAt = parseLocalDateTime(value(formData, "startsAt"));
  const durationMinutes = Number(value(formData, "durationMinutes") || "30");

  await db.appointment.update({
    where: { id },
    data: {
      startsAt,
      endsAt: new Date(startsAt.getTime() + durationMinutes * 60_000),
      durationMinutes,
      status: (value(formData, "status") as AppointmentStatus) || AppointmentStatus.SCHEDULED,
      notes: nullableValue(formData, "notes"),
    },
  });

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/agenda");
}

export async function cancelAppointment(formData: FormData) {
  const appUser = await requireAuthenticatedAppUser();
  const id = value(formData, "id");

  if (appUser.role === "PATIENT") {
    throw new ForbiddenError("Pacientes não podem cancelar consultas.");
  }

  await assertOwnedAppointment(id, appUser);

  const service = new AppointmentService(new PrismaAppointmentRepository());
  await service.cancel(id, { actorUserId: appUser.id });

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/agenda");
}

export async function createMedicalReport(formData: FormData) {
  const appUser = await requireAuthenticatedAppUser();

  if (appUser.role === "PATIENT") {
    throw new ForbiddenError("Pacientes não podem criar laudos.");
  }

  const file = formData.get("file");

  if (!(file instanceof File) || file.size === 0) {
    throw new Error("Arquivo obrigatório.");
  }

  const patientId = value(formData, "patientId");
  const doctorId = value(formData, "doctorId");
  const appointmentId = nullableValue(formData, "appointmentId");

  await assertOwnedPatient(patientId, appUser);
  await assertOwnedDoctor(doctorId, appUser);

  if (appointmentId) {
    await assertOwnedAppointment(appointmentId, appUser);
  }

  const report = await db.medicalReport.create({
    data: {
      title: value(formData, "title"),
      patientId,
      doctorId,
      appointmentId,
      createdByUserId: appUser.id,
      reportDate: value(formData, "reportDate") ? new Date(value(formData, "reportDate")) : new Date(),
      observations: nullableValue(formData, "observations"),
      specialty: value(formData, "specialty"),
    },
  });

  const storage = new MedicalReportStorageService(
    new PrismaMedicalReportRepository(),
    createMedicalReportsStorageBucket(),
    {
      bucketName: env.SUPABASE_STORAGE_BUCKET_MEDICAL_REPORTS,
      maxUploadSizeBytes: env.MAX_UPLOAD_SIZE_BYTES,
      storageBaseUrl: env.NEXT_PUBLIC_SUPABASE_URL,
    },
  );

  await storage.uploadNewFile({
    medicalReportId: report.id,
    uploadedByUserId: appUser.id,
    file,
  });

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/laudos");
}

export async function createPatientMedicalReport(formData: FormData) {
  const returnPath = resolveSafeDashboardPath(nullableValue(formData, "returnPath"), "/dashboard/laudos");
  let destination = withUploadFeedback(returnPath, "error", "Nao foi possivel enviar o laudo/exame.");

  try {
    const appUser = await requireAuthenticatedAppUser();

    if (appUser.role !== "PATIENT") {
      throw new ForbiddenError("Apenas pacientes podem usar este envio.");
    }

    const { patientId } = await resolveLinkedIds(appUser.id);

    if (!patientId) {
      throw new ForbiddenError("Registro de paciente não vinculado.");
    }

    const requestedPatientId = nullableValue(formData, "patientId");
    if (requestedPatientId && requestedPatientId !== patientId) {
      throw new ForbiddenError("Paciente inválido para este envio.");
    }

    const file = formData.get("file");

    if (!(file instanceof File) || file.size === 0) {
      throw new Error("Selecione um arquivo para enviar.");
    }

    const doctorId = value(formData, "doctorId");

    const linkedDoctor = await db.doctor.findFirst({
      where: {
        id: doctorId,
        deletedAt: null,
        OR: [
          {
            assignedPatients: {
              some: {
                id: patientId,
                deletedAt: null,
              },
            },
          },
          {
            appointments: {
              some: {
                patientId,
                deletedAt: null,
              },
            },
          },
        ],
      },
      select: { id: true },
    });

    if (!linkedDoctor) {
      throw new ForbiddenError("Médico não vinculado ao paciente.");
    }

    const report = await db.medicalReport.create({
      data: {
        title: value(formData, "title"),
        patientId,
        doctorId,
        createdByUserId: appUser.id,
        reportDate: value(formData, "reportDate") ? new Date(value(formData, "reportDate")) : new Date(),
        observations: nullableValue(formData, "observations"),
        specialty: value(formData, "specialty"),
      },
    });

    const storage = new MedicalReportStorageService(
      new PrismaMedicalReportRepository(),
      createMedicalReportsStorageBucket(),
      {
        bucketName: env.SUPABASE_STORAGE_BUCKET_MEDICAL_REPORTS,
        maxUploadSizeBytes: env.MAX_UPLOAD_SIZE_BYTES,
        storageBaseUrl: env.NEXT_PUBLIC_SUPABASE_URL,
      },
    );

    await storage.uploadNewFile({
      medicalReportId: report.id,
      uploadedByUserId: appUser.id,
      file,
    });

    revalidatePath("/dashboard/laudos");
    revalidatePath(`/dashboard/pacientes/${patientId}`);
    destination = withUploadFeedback(returnPath, "success", "Laudo/exame enviado com sucesso.");
  } catch (error) {
    const message = error instanceof Error ? error.message : "Nao foi possivel enviar o laudo/exame.";
    destination = withUploadFeedback(returnPath, "error", message);
  }

  redirect(destination);
}

export async function authorizeMedicalReportViewer(formData: FormData) {
  const returnPath = resolveSafeDashboardPath(nullableValue(formData, "returnPath"), "/dashboard/laudos");
  let destination = withUploadFeedback(returnPath, "error", "Nao foi possivel conceder autorizacao.");

  try {
    const appUser = await requireAuthenticatedAppUser();

    if (appUser.role !== "PATIENT") {
      throw new ForbiddenError("Somente pacientes podem conceder essa autorizacao.");
    }

    const { patientId } = await resolveLinkedIds(appUser.id);

    if (!patientId) {
      throw new ForbiddenError("Registro de paciente nao vinculado.");
    }

    const reportId = value(formData, "reportId");
    const doctorId = value(formData, "doctorId");

    const report = await db.medicalReport.findFirst({
      where: {
        id: reportId,
        patientId,
        deletedAt: null,
      },
      select: {
        id: true,
        doctorId: true,
      },
    });

    if (!report) {
      throw new ForbiddenError("Laudo nao encontrado para este paciente.");
    }

    if (report.doctorId === doctorId) {
      throw new Error("Este medico ja possui acesso principal ao laudo.");
    }

    const doctor = await db.doctor.findFirst({
      where: {
        id: doctorId,
        deletedAt: null,
      },
      select: { id: true },
    });

    if (!doctor) {
      throw new Error("Medico nao encontrado.");
    }

    await db.medicalReportAccessGrant.upsert({
      where: {
        medicalReportId_doctorId: {
          medicalReportId: report.id,
          doctorId,
        },
      },
      update: {
        deletedAt: null,
        grantedByPatientId: patientId,
      },
      create: {
        medicalReportId: report.id,
        doctorId,
        grantedByPatientId: patientId,
      },
    });

    revalidatePath("/dashboard/laudos");
    revalidatePath(`/dashboard/pacientes/${patientId}`);
    destination = withUploadFeedback(returnPath, "success", "Autorizacao concedida ao medico selecionado.");
  } catch (error) {
    const message = error instanceof Error ? error.message : "Nao foi possivel conceder autorizacao.";
    destination = withUploadFeedback(returnPath, "error", message);
  }

  redirect(destination);
}

export async function revokeMedicalReportViewer(formData: FormData) {
  const returnPath = resolveSafeDashboardPath(nullableValue(formData, "returnPath"), "/dashboard/laudos");
  let destination = withUploadFeedback(returnPath, "error", "Nao foi possivel revogar autorizacao.");

  try {
    const appUser = await requireAuthenticatedAppUser();

    if (appUser.role !== "PATIENT") {
      throw new ForbiddenError("Somente pacientes podem revogar essa autorizacao.");
    }

    const { patientId } = await resolveLinkedIds(appUser.id);

    if (!patientId) {
      throw new ForbiddenError("Registro de paciente nao vinculado.");
    }

    const reportId = value(formData, "reportId");
    const doctorId = value(formData, "doctorId");

    await db.medicalReportAccessGrant.updateMany({
      where: {
        medicalReportId: reportId,
        doctorId,
        grantedByPatientId: patientId,
        deletedAt: null,
      },
      data: {
        deletedAt: new Date(),
      },
    });

    revalidatePath("/dashboard/laudos");
    revalidatePath(`/dashboard/pacientes/${patientId}`);
    destination = withUploadFeedback(returnPath, "success", "Autorizacao revogada com sucesso.");
  } catch (error) {
    const message = error instanceof Error ? error.message : "Nao foi possivel revogar autorizacao.";
    destination = withUploadFeedback(returnPath, "error", message);
  }

  redirect(destination);
}

export async function deleteMedicalReport(formData: FormData) {
  const appUser = await requireAuthenticatedAppUser();
  const id = value(formData, "id");

  if (appUser.role === "PATIENT") {
    throw new ForbiddenError("Pacientes não podem excluir laudos.");
  }

  // Verificar se o usuário tem acesso ao laudo para poder deletar
  await assertOwnedMedicalReport(id, appUser);

  await db.medicalReport.update({
    where: { id },
    data: { deletedAt: new Date() },
  });

  revalidatePath("/dashboard/laudos");
}

export async function searchRedirect(formData: FormData) {
  const path = value(formData, "path");
  const q = value(formData, "q");
  redirect(q ? `${path}?q=${encodeURIComponent(q)}` : path);
}

async function assertOwnedPatient(patientId: string, appUser: { id: string; role: string }) {
  const { doctorId } = await resolveLinkedIds(appUser.id);
  const patient = await db.patient.findFirst({
    where: {
      id: patientId,
      deletedAt: null,
      ...(appUser.role === "ADMIN"
        ? {}
        : appUser.role === "DOCTOR"
        ? { assignedDoctorId: doctorId }
        : { userId: appUser.id }),
    },
    select: { id: true },
  });

  if (!patient) {
    throw new ForbiddenError("Paciente não encontrado ou sem permissão de acesso.");
  }
}

async function assertOwnedDoctor(doctorId: string, appUser: { id: string; role: string }) {
  const docRecord = await db.doctor.findFirst({
    where: {
      id: doctorId,
      deletedAt: null,
      ...(appUser.role === "ADMIN" ? {} : { userId: appUser.id }),
    },
    select: { id: true },
  });

  if (!docRecord) {
    throw new ForbiddenError("Médico não encontrado ou sem permissão de acesso.");
  }
}

async function assertOwnedAppointment(appointmentId: string, appUser: { id: string; role: string }) {
  const { doctorId, patientId } = await resolveLinkedIds(appUser.id);
  const appointment = await db.appointment.findFirst({
    where: {
      id: appointmentId,
      deletedAt: null,
      ...(appUser.role === "ADMIN"
        ? {}
        : appUser.role === "DOCTOR"
        ? { doctorId: doctorId ?? "00000000-0000-0000-0000-000000000000" }
        : { patientId: patientId ?? "00000000-0000-0000-0000-000000000000" }),
    },
    select: { id: true },
  });

  if (!appointment) {
    throw new ForbiddenError("Consulta não encontrada ou sem permissão de acesso.");
  }
}

async function assertOwnedMedicalReport(reportId: string, appUser: { id: string; role: string }) {
  const { doctorId, patientId } = await resolveLinkedIds(appUser.id);
  const report = await db.medicalReport.findFirst({
    where: {
      id: reportId,
      deletedAt: null,
      ...(appUser.role === "ADMIN"
        ? {}
        : appUser.role === "DOCTOR"
        ? { doctorId: doctorId ?? "00000000-0000-0000-0000-000000000000" }
        : { patientId: patientId ?? "00000000-0000-0000-0000-000000000000" }),
    },
    select: { id: true },
  });

  if (!report) {
    throw new ForbiddenError("Laudo não encontrado ou sem permissão de acesso.");
  }
}
