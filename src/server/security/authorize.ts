/**
 * Módulo central de autorização RBAC.
 *
 * Toda verificação de acesso baseada em role deve passar por aqui.
 * Nunca duplique esta lógica em rotas individuais.
 *
 * Regras de visibilidade:
 * - ADMIN  → vê e edita tudo
 * - DOCTOR → vê apenas pacientes onde assignedDoctorId = seu Doctor.id
 *            vê apenas seus próprios appointments (doctorId = seu Doctor.id)
 *            vê apenas laudos dos seus pacientes
 *            vê apenas o próprio registro de Doctor
 * - PATIENT → vê apenas o próprio registro de Patient (userId = seu User.id)
 *             vê apenas seus próprios appointments (patientId = seu Patient.id)
 *             vê apenas os próprios laudos
 *             não acessa listagem de médicos
 */

import { UserRole } from "@prisma/client";

import { db } from "@/server/db";

export type AuthorizedUser = {
  id: string;
  role: UserRole;
  email: string;
};

const EMPTY_UUID = "00000000-0000-0000-0000-000000000000";

/** Cláusula WHERE para listagem de pacientes, por role. */
export function buildPatientWhereClause(user: AuthorizedUser & { doctorId?: string | null }) {
  if (user.role === UserRole.ADMIN) {
    return {};
  }

  if (user.role === UserRole.DOCTOR) {
    if (!user.doctorId) return { id: EMPTY_UUID }; // segurança: médico sem registro não vê nada
    return { assignedDoctorId: user.doctorId };
  }

  if (user.role === UserRole.PATIENT) {
    return { userId: user.id };
  }

  throw new Error("Role inválida.");
}

/** Cláusula WHERE para listagem de médicos, por role. */
export function buildDoctorWhereClause(user: AuthorizedUser & { doctorId?: string | null }) {
  if (user.role === UserRole.ADMIN) {
    return {};
  }

  if (user.role === UserRole.DOCTOR) {
    if (!user.doctorId) return { id: EMPTY_UUID };
    return { id: user.doctorId };
  }

  if (user.role === UserRole.PATIENT) {
    return { createdByUserId: user.id };
  }

  throw new Error("Role inválida.");
}

/** Cláusula WHERE para listagem de appointments, por role. */
export function buildAppointmentWhereClause(
  user: AuthorizedUser & { doctorId?: string | null; patientId?: string | null },
) {
  if (user.role === UserRole.ADMIN) {
    return {};
  }

  if (user.role === UserRole.DOCTOR) {
    return { doctorId: user.doctorId ?? EMPTY_UUID };
  }

  if (user.role === UserRole.PATIENT) {
    return { patientId: user.patientId ?? EMPTY_UUID };
  }

  throw new Error("Role inválida.");
}

/** Cláusula WHERE para listagem de laudos, por role. */
export function buildMedicalReportWhereClause(
  user: AuthorizedUser & { doctorId?: string | null; patientId?: string | null },
) {
  if (user.role === UserRole.ADMIN) {
    return {};
  }

  if (user.role === UserRole.DOCTOR) {
    const currentDoctorId = user.doctorId ?? EMPTY_UUID;
    return {
      OR: [
        { doctorId: currentDoctorId },
        {
          accessGrants: {
            some: {
              doctorId: currentDoctorId,
              deletedAt: null,
            },
          },
        },
      ],
    };
  }

  if (user.role === UserRole.PATIENT) {
    return { patientId: user.patientId ?? EMPTY_UUID };
  }

  throw new Error("Role inválida.");
}

/**
 * Verifica se o usuário tem permissão de escrita sobre um paciente específico.
 * Lança ForbiddenError se não tiver.
 * - ADMIN: pode editar qualquer paciente
 * - DOCTOR: pode editar apenas seus pacientes atribuídos
 * - PATIENT: não pode editar registros de paciente (nem o próprio — via sistema)
 */
export async function assertCanWritePatient(user: AuthorizedUser & { doctorId?: string | null }, patientId: string) {
  if (user.role === UserRole.ADMIN) return;

  if (user.role === UserRole.DOCTOR) {
    const patient = await db.patient.findFirst({
      where: { id: patientId, assignedDoctorId: user.doctorId ?? EMPTY_UUID, deletedAt: null },
      select: { id: true },
    });
    if (!patient) throw new ForbiddenError("Médico não tem permissão sobre este paciente.");
    return;
  }

  throw new ForbiddenError("Sem permissão para editar registros de pacientes.");
}

/**
 * Verifica se o usuário pode criar/editar appointments.
 * - ADMIN: pode tudo
 * - DOCTOR: pode criar/editar appointments onde é o doctorId
 * - PATIENT: apenas visualiza — não pode criar/editar
 */
export async function assertCanWriteAppointment(
  user: AuthorizedUser,
  appointmentId: string | null = null,
) {
  if (user.role === UserRole.ADMIN) return;

  if (user.role === UserRole.DOCTOR) {
    if (!appointmentId) return; // criação: será validado depois com doctorId no payload
    const appointment = await db.appointment.findFirst({
      where: { id: appointmentId, deletedAt: null },
      select: { doctorId: true },
    });
    const doctorRecord = await db.doctor.findFirst({
      where: { userId: user.id, deletedAt: null },
      select: { id: true },
    });
    if (!appointment || !doctorRecord || appointment.doctorId !== doctorRecord.id) {
      throw new ForbiddenError("Médico não tem permissão sobre esta consulta.");
    }
    return;
  }

  // PATIENT não pode criar/editar consultas
  throw new ForbiddenError("Pacientes não podem criar ou editar consultas.");
}

/**
 * Verifica se o usuário pode fazer upload/edição de laudo.
 * - ADMIN e DOCTOR: podem
 * - PATIENT: não pode
 */
export function assertCanWriteMedicalReport(user: AuthorizedUser) {
  if (user.role === UserRole.PATIENT) {
    throw new ForbiddenError("Pacientes não podem criar ou editar laudos médicos.");
  }
}

/**
 * Busca os IDs de Doctor e Patient vinculados ao usuário logado.
 * Retorna null para os que não existem (ex: ADMIN não tem doctorId).
 */
export async function resolveLinkedIds(userId: string) {
  const [doctorRecord, patientRecord] = await Promise.all([
    db.doctor.findFirst({ where: { userId, deletedAt: null }, select: { id: true } }),
    db.patient.findFirst({ where: { userId, deletedAt: null }, select: { id: true } }),
  ]);

  return {
    doctorId: doctorRecord?.id ?? null,
    patientId: patientRecord?.id ?? null,
  };
}

/** Erro semântico de autorização — resulta em HTTP 403. */
export class ForbiddenError extends Error {
  readonly statusCode = 403;

  constructor(message = "Acesso negado.") {
    super(message);
    this.name = "ForbiddenError";
  }
}
