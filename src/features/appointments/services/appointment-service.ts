import { addDays, addMonths, addWeeks, startOfDay, startOfMonth, startOfWeek } from "date-fns";
import { AppointmentStatus, AuditAction, type Prisma } from "@prisma/client";

import type {
  AppointmentListFilters,
  AppointmentRepository,
} from "@/features/appointments/repository/appointment-repository";
import { writeAuditLog } from "@/server/audit";

type AppointmentRecord = Awaited<ReturnType<AppointmentRepository["findById"]>>;
type AppointmentEntity = NonNullable<AppointmentRecord>;

type AuditContext = {
  actorUserId?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
};

type AuditWriter = typeof writeAuditLog;

type CreateAppointmentInput = {
  patientId: string;
  doctorId: string;
  startsAt: string | Date;
  endsAt: string | Date;
  notes?: string | null;
  status?: AppointmentStatus;
};

type RescheduleAppointmentInput = {
  startsAt: string | Date;
  endsAt: string | Date;
  notes?: string | null;
};

type CalendarView = "day" | "week" | "month";

export class AppointmentService {
  constructor(
    private readonly repository: AppointmentRepository,
    private readonly auditWriter: AuditWriter = writeAuditLog,
  ) {}

  async create(input: CreateAppointmentInput, context: AuditContext) {
    const startsAt = this.parseDate(input.startsAt);
    const endsAt = this.parseDate(input.endsAt);
    const durationMinutes = this.calculateDurationMinutes(startsAt, endsAt);

    await this.assertDoctorAvailable({
      doctorId: input.doctorId,
      startsAt,
      endsAt,
    });

    const appointment = await this.repository.create({
      patientId: input.patientId,
      doctorId: input.doctorId,
      createdByUserId: this.requireActor(context),
      startsAt,
      endsAt,
      durationMinutes,
      notes: this.normalizeNotes(input.notes),
      status: input.status ?? AppointmentStatus.SCHEDULED,
    });

    await this.writeAudit(context, AuditAction.CREATE, appointment.id, {
      status: appointment.status,
      startsAt: appointment.startsAt.toISOString(),
      endsAt: appointment.endsAt.toISOString(),
    });

    return appointment;
  }

  async listByView(view: CalendarView, date: Date, filters: Omit<AppointmentListFilters, "startsAtGte" | "startsAtLte">) {
    const { startsAtGte, startsAtLte } = this.getViewRange(view, date);

    return this.repository.list({
      ...filters,
      startsAtGte,
      startsAtLte,
    });
  }

  async reschedule(id: string, input: RescheduleAppointmentInput, context: AuditContext) {
    const appointment = await this.requireAppointment(id);
    this.assertCanMutateSchedule(appointment);

    const startsAt = this.parseDate(input.startsAt);
    const endsAt = this.parseDate(input.endsAt);
    const durationMinutes = this.calculateDurationMinutes(startsAt, endsAt);

    await this.assertDoctorAvailable({
      doctorId: appointment.doctorId,
      startsAt,
      endsAt,
      excludeId: appointment.id,
    });

    const updated = await this.repository.update(id, {
      startsAt,
      endsAt,
      durationMinutes,
      notes: input.notes === undefined ? appointment.notes : this.normalizeNotes(input.notes),
      status: AppointmentStatus.SCHEDULED,
      confirmedAt: undefined,
      startedAt: undefined,
      completedAt: undefined,
      cancelledAt: undefined,
    });

    await this.writeAudit(context, AuditAction.UPDATE, id, {
      status: updated.status,
      startsAt: updated.startsAt.toISOString(),
      endsAt: updated.endsAt.toISOString(),
    });

    return updated;
  }

  async confirm(id: string, context: AuditContext) {
    const appointment = await this.requireAppointment(id);
    this.assertStatus(appointment, [AppointmentStatus.SCHEDULED], "Only scheduled appointments can be confirmed.");

    return this.transition(id, context, {
      status: AppointmentStatus.CONFIRMED,
      confirmedAt: new Date(),
    });
  }

  async start(id: string, context: AuditContext) {
    const appointment = await this.requireAppointment(id);
    this.assertStatus(
      appointment,
      [AppointmentStatus.SCHEDULED, AppointmentStatus.CONFIRMED],
      "Only scheduled or confirmed appointments can be started.",
    );

    return this.transition(id, context, {
      status: AppointmentStatus.IN_PROGRESS,
      startedAt: new Date(),
    });
  }

  async complete(id: string, context: AuditContext) {
    const appointment = await this.requireAppointment(id);
    this.assertStatus(appointment, [AppointmentStatus.IN_PROGRESS], "Only in-progress appointments can be completed.");

    return this.transition(id, context, {
      status: AppointmentStatus.COMPLETED,
      completedAt: new Date(),
    });
  }

  async cancel(id: string, context: AuditContext) {
    const appointment = await this.requireAppointment(id);
    this.assertStatus(
      appointment,
      [AppointmentStatus.SCHEDULED, AppointmentStatus.CONFIRMED, AppointmentStatus.IN_PROGRESS],
      "Only active appointments can be cancelled.",
    );

    return this.transition(id, context, {
      status: AppointmentStatus.CANCELLED,
      cancelledAt: new Date(),
    });
  }

  private async transition(id: string, context: AuditContext, data: { status: AppointmentStatus } & Record<string, Date | AppointmentStatus>) {
    const updated = await this.repository.update(id, data);

    await this.writeAudit(context, AuditAction.UPDATE, id, {
      status: updated.status,
    });

    return updated;
  }

  private async requireAppointment(id: string) {
    const appointment = await this.repository.findById(id);

    if (!appointment) {
      throw new Error("Appointment not found.");
    }

    return appointment;
  }

  private async assertDoctorAvailable(input: { doctorId: string; startsAt: Date; endsAt: Date; excludeId?: string }) {
    const conflict = await this.repository.findConflict(input);

    if (conflict) {
      throw new Error("Doctor is not available for the requested time range.");
    }
  }

  private assertCanMutateSchedule(appointment: AppointmentEntity) {
    this.assertStatus(
      appointment,
      [AppointmentStatus.SCHEDULED, AppointmentStatus.CONFIRMED],
      "Only scheduled or confirmed appointments can be rescheduled.",
    );
  }

  private assertStatus(appointment: AppointmentEntity, allowed: AppointmentStatus[], message: string) {
    if (!allowed.includes(appointment.status)) {
      throw new Error(message);
    }
  }

  private parseDate(value: string | Date) {
    const date = value instanceof Date ? value : new Date(value);

    if (Number.isNaN(date.getTime())) {
      throw new Error("Invalid appointment date.");
    }

    return date;
  }

  private calculateDurationMinutes(startsAt: Date, endsAt: Date) {
    const durationMinutes = Math.round((endsAt.getTime() - startsAt.getTime()) / 60000);

    if (durationMinutes <= 0) {
      throw new Error("Appointment end date must be after the start date.");
    }

    return durationMinutes;
  }

  private normalizeNotes(notes: string | null | undefined) {
    if (notes == null) {
      return null;
    }

    const trimmed = notes.trim();
    return trimmed.length > 0 ? trimmed : null;
  }

  private getViewRange(view: CalendarView, date: Date) {
    if (view === "day") {
      const startsAtGte = startOfDay(date);
      return { startsAtGte, startsAtLte: addDays(startsAtGte, 1) };
    }

    if (view === "month") {
      const startsAtGte = startOfMonth(date);
      return { startsAtGte, startsAtLte: addMonths(startsAtGte, 1) };
    }

    const startsAtGte = startOfWeek(date, { weekStartsOn: 1 });
    return { startsAtGte, startsAtLte: addWeeks(startsAtGte, 1) };
  }

  private requireActor(context: AuditContext) {
    if (!context.actorUserId) {
      throw new Error("Unauthorized.");
    }

    return context.actorUserId;
  }

  private async writeAudit(
    context: AuditContext,
    action: AuditAction,
    resourceId: string,
    metadata: Prisma.InputJsonValue,
  ) {
    await this.auditWriter({
      actorUserId: context.actorUserId ?? null,
      action,
      resourceType: "Appointment",
      resourceId,
      metadata,
      ipAddress: context.ipAddress ?? null,
      userAgent: context.userAgent ?? null,
    });
  }
}
