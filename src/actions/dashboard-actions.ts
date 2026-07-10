"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { AppointmentStatus, Gender } from "@prisma/client";

import { PrismaAppointmentRepository } from "@/features/appointments/repository/appointment-repository";
import { AppointmentService } from "@/features/appointments/services/appointment-service";
import { PrismaMedicalReportRepository } from "@/features/medical-reports/repository/medical-report-repository";
import { MedicalReportStorageService } from "@/features/medical-reports/services/medical-report-storage-service";
import { env } from "@/lib/env";
import { db } from "@/server/db";
import { requireAuthenticatedAppUser } from "@/server/security/auth";
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

export async function createPatient(formData: FormData) {
  const appUser = await requireAuthenticatedAppUser();

  await db.patient.create({
    data: {
      createdByUserId: appUser.id,
      fullName: value(formData, "fullName"),
      cpf: value(formData, "cpf"),
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

  await db.patient.updateMany({
    where: { id: value(formData, "id"), createdByUserId: appUser.id, deletedAt: null },
    data: {
      fullName: value(formData, "fullName"),
      cpf: value(formData, "cpf"),
      birthDate: value(formData, "birthDate") ? new Date(value(formData, "birthDate")) : null,
      gender: (value(formData, "gender") as Gender) || Gender.UNDISCLOSED,
      phone: nullableValue(formData, "phone"),
      email: nullableValue(formData, "email"),
      address: nullableValue(formData, "address"),
    },
  });

  revalidatePath("/dashboard/pacientes");
}

export async function deletePatient(formData: FormData) {
  const appUser = await requireAuthenticatedAppUser();

  await db.patient.updateMany({
    where: { id: value(formData, "id"), createdByUserId: appUser.id, deletedAt: null },
    data: { deletedAt: new Date() },
  });

  revalidatePath("/dashboard/pacientes");
}

export async function createDoctor(formData: FormData) {
  const appUser = await requireAuthenticatedAppUser();

  await db.doctor.create({
    data: {
      createdByUserId: appUser.id,
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

  await db.doctor.updateMany({
    where: { id: value(formData, "id"), createdByUserId: appUser.id, deletedAt: null },
    data: {
      fullName: value(formData, "fullName"),
      crm: value(formData, "crm"),
      specialty: value(formData, "specialty"),
      phone: nullableValue(formData, "phone"),
      email: nullableValue(formData, "email"),
    },
  });

  revalidatePath("/dashboard/medicos");
}

export async function deleteDoctor(formData: FormData) {
  const appUser = await requireAuthenticatedAppUser();

  await db.doctor.updateMany({
    where: { id: value(formData, "id"), createdByUserId: appUser.id, deletedAt: null },
    data: { deletedAt: new Date() },
  });

  revalidatePath("/dashboard/medicos");
}

export async function createAppointment(formData: FormData) {
  const appUser = await requireAuthenticatedAppUser();
  const startsAt = parseLocalDateTime(value(formData, "startsAt"));
  const durationMinutes = Number(value(formData, "durationMinutes") || "30");
  const endsAt = new Date(startsAt.getTime() + durationMinutes * 60_000);
  const service = new AppointmentService(new PrismaAppointmentRepository());
  const patientId = value(formData, "patientId");
  const doctorId = value(formData, "doctorId");

  await assertOwnedPatient(patientId, appUser.id);
  await assertOwnedDoctor(doctorId, appUser.id);

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
  const startsAt = parseLocalDateTime(value(formData, "startsAt"));
  const durationMinutes = Number(value(formData, "durationMinutes") || "30");

  await db.appointment.updateMany({
    where: { id: value(formData, "id"), createdByUserId: appUser.id, deletedAt: null },
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
  const service = new AppointmentService(new PrismaAppointmentRepository());
  await assertOwnedAppointment(value(formData, "id"), appUser.id);

  await service.cancel(value(formData, "id"), { actorUserId: appUser.id });

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/agenda");
}

export async function createMedicalReport(formData: FormData) {
  const appUser = await requireAuthenticatedAppUser();
  const file = formData.get("file");

  if (!(file instanceof File) || file.size === 0) {
    throw new Error("Arquivo obrigatório.");
  }

  const patientId = value(formData, "patientId");
  const doctorId = value(formData, "doctorId");
  const appointmentId = nullableValue(formData, "appointmentId");

  await assertOwnedPatient(patientId, appUser.id);
  await assertOwnedDoctor(doctorId, appUser.id);

  if (appointmentId) {
    await assertOwnedAppointment(appointmentId, appUser.id);
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

export async function deleteMedicalReport(formData: FormData) {
  const appUser = await requireAuthenticatedAppUser();

  await db.medicalReport.updateMany({
    where: { id: value(formData, "id"), createdByUserId: appUser.id, deletedAt: null },
    data: { deletedAt: new Date() },
  });

  revalidatePath("/dashboard/laudos");
}

export async function searchRedirect(formData: FormData) {
  const path = value(formData, "path");
  const q = value(formData, "q");
  redirect(q ? `${path}?q=${encodeURIComponent(q)}` : path);
}

async function assertOwnedPatient(patientId: string, userId: string) {
  const patient = await db.patient.findFirst({
    where: { id: patientId, createdByUserId: userId, deletedAt: null },
    select: { id: true },
  });

  if (!patient) {
    throw new Error("Paciente não encontrado para este usuário.");
  }
}

async function assertOwnedDoctor(doctorId: string, userId: string) {
  const doctor = await db.doctor.findFirst({
    where: { id: doctorId, createdByUserId: userId, deletedAt: null },
    select: { id: true },
  });

  if (!doctor) {
    throw new Error("Médico não encontrado para este usuário.");
  }
}

async function assertOwnedAppointment(appointmentId: string, userId: string) {
  const appointment = await db.appointment.findFirst({
    where: { id: appointmentId, createdByUserId: userId, deletedAt: null },
    select: { id: true },
  });

  if (!appointment) {
    throw new Error("Consulta não encontrada para este usuário.");
  }
}
