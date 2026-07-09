import { addMinutes, endOfDay, endOfMonth, endOfWeek, startOfDay, startOfMonth, startOfWeek } from "date-fns";
import { AppointmentStatus, AuditAction } from "@prisma/client";

import type { AppointmentRepository, AppointmentListFilters } from "@/features/appointments/repository/appointment-repository";
import { appointmentFiltersSchema, appointmentSchema } from "@/features/appointments/schemas";
import { writeAuditLog } from "@/server/audit";
import { sanitizeNullableText } from "@/server/security/sanitize";

type AppointmentMutationContext = {
  actorUserId: string;
  ipAddress?: string | null;
  userAgent?: string | null;
};

type CalendarView = "day" | "week" | "month";

type AuditWriter = typeof writeAuditLog;

export class AppointmentService {
  constructor(
    private readonly repository: AppointmentRepository,
    private readonly auditWriter: AuditWriter = writeAuditLog,
  ) {}

  async create(
    input: {
      patientId: string;
      doctorId: string;
      startsAt: string;
      endsAt: string;
      notes?: string | null;
      status: keyof typeof AppointmentStatus;
    },
    context: AppointmentMutationContext,
  ) {
    const parsed = appointmentSchema.parse(input);
    const startsAt = new Date(parsed.startsAt);
    const endsAt = new Date(parsed.endsAt);

    await this.assertAvailability(parsed.doctorId, startsAt, endsAt);

    const appointment = await this.repository.create({
      patientId: parsed.patientId,
      doctorId: parsed.doctorId,
      createdByUserId: context.actorUserId,
      startsAt,
      endsAt,
      durationMinutes: this.getDurationMinutes(startsAt, endsAt),
      notes: sanitizeNullableText(parsed.notes),
      status: parsed.status,
    });

    await this.auditWriter({
      actorUserId: context.actorUserId,
      action: AuditAction.CREATE,
      resourceType: "appointment",
      resourceId: appointment.id,
      metadata: {
        status: appointment.status,
      },
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
    });

    return appointment;
  }

  async reschedule(
    appointmentId: string,
    input: {
      startsAt: string;
      endsAt: string;
      notes?: string | null;
    },
    context: AppointmentMutationContext,
  ) {
    const startsAt = new Date(input.startsAt);
    const endsAt = new Date(input.endsAt);
    const appointment = await this.requireAppointment(appointmentId);

    await this.assertAvailability(appointment.doctorId, startsAt, endsAt, appointmentId);

    const updated = await this.repository.update(appointmentId, {
      startsAt,
      endsAt,
      durationMinutes: this.getDurationMinutes(startsAt, endsAt),
      notes: sanitizeNullableText(input.notes),
      status: AppointmentStatus.SCHEDULED,
    });

    await this.auditWriter({
      actorUserId: context.actorUserId,
      action: AuditAction.UPDATE,
      resourceType: "appointment",
      resourceId: updated.id,
      metadata: {
        operation: "reschedule",
      },
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
    });

    return updated;
  }

  async confirm(appointmentId: string, context: AppointmentMutationContext) {
    return this.transitionStatus(appointmentId, AppointmentStatus.CONFIRMED, context, {
      confirmedAt: new Date(),
    });
  }

  async start(appointmentId: string, context: AppointmentMutationContext) {
    return this.transitionStatus(appointmentId, AppointmentStatus.IN_PROGRESS, context, {
      startedAt: new Date(),
    });
  }

  async complete(appointmentId: string, context: AppointmentMutationContext) {
    return this.transitionStatus(appointmentId, AppointmentStatus.COMPLETED, context, {
      completedAt: new Date(),
    });
  }

  async cancel(appointmentId: string, context: AppointmentMutationContext) {
    return this.transitionStatus(appointmentId, AppointmentStatus.CANCELLED, context, {
      cancelledAt: new Date(),
    });
  }

  async listByView(
    view: CalendarView,
    referenceDate: Date,
    filters: {
      doctorId?: string;
      patientId?: string;
      status?: keyof typeof AppointmentStatus;
    },
  ) {
    const parsedFilters = appointmentFiltersSchema.parse({
      doctorId: filters.doctorId,
      patientId: filters.patientId,
      status: filters.status,
      periodStart: referenceDate.toISOString(),
      periodEnd: referenceDate.toISOString(),
    });

    const range = this.resolveCalendarRange(view, referenceDate);
    const listFilters: AppointmentListFilters = {
      doctorId: parsedFilters.doctorId,
      patientId: parsedFilters.patientId,
      status: parsedFilters.status,
      startsAtGte: range.start,
      startsAtLte: range.end,
    };

    return this.repository.list(listFilters);
  }

  private async transitionStatus(
    appointmentId: string,
    status: AppointmentStatus,
    context: AppointmentMutationContext,
    extraData: Record<string, Date>,
  ) {
    await this.requireAppointment(appointmentId);

    const updated = await this.repository.update(appointmentId, {
      status,
      ...extraData,
    });

    await this.auditWriter({
      actorUserId: context.actorUserId,
      action: AuditAction.UPDATE,
      resourceType: "appointment",
      resourceId: updated.id,
      metadata: {
        status,
      },
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
    });

    return updated;
  }

  private async requireAppointment(appointmentId: string) {
    const appointment = await this.repository.findById(appointmentId);

    if (!appointment) {
      throw new Error("Appointment not found.");
    }

    return appointment;
  }

  private async assertAvailability(
    doctorId: string,
    startsAt: Date,
    endsAt: Date,
    excludeId?: string,
  ) {
    if (startsAt >= endsAt) {
      throw new Error("Appointment time range is invalid.");
    }

    const conflict = await this.repository.findConflict({
      doctorId,
      startsAt,
      endsAt,
      excludeId,
    });

    if (conflict) {
      throw new Error("Doctor is not available for the requested time range.");
    }
  }

  private resolveCalendarRange(view: CalendarView, referenceDate: Date) {
    if (view === "day") {
      return {
        start: startOfDay(referenceDate),
        end: endOfDay(referenceDate),
      };
    }

    if (view === "week") {
      return {
        start: startOfWeek(referenceDate, { weekStartsOn: 1 }),
        end: endOfWeek(referenceDate, { weekStartsOn: 1 }),
      };
    }

    return {
      start: startOfMonth(referenceDate),
      end: endOfMonth(referenceDate),
    };
  }

  private getDurationMinutes(startsAt: Date, endsAt: Date) {
    const duration = Math.round((endsAt.getTime() - startsAt.getTime()) / 60000);

    if (duration <= 0) {
      throw new Error("Appointment duration must be greater than zero.");
    }

    return addMinutes(startsAt, duration).getTime() === endsAt.getTime() ? duration : duration;
  }
}
