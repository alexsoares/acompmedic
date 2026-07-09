import type { Appointment, Prisma } from "@prisma/client";

import { db } from "@/server/db";

export type AppointmentListFilters = {
  doctorId?: string;
  patientId?: string;
  status?: Appointment["status"];
  startsAtGte?: Date;
  startsAtLte?: Date;
};

export interface AppointmentRepository {
  list(filters: AppointmentListFilters): Promise<Appointment[]>;
  findById(id: string): Promise<Appointment | null>;
  findConflict(input: { doctorId: string; startsAt: Date; endsAt: Date; excludeId?: string }): Promise<Appointment | null>;
  create(data: Prisma.AppointmentUncheckedCreateInput): Promise<Appointment>;
  update(id: string, data: Prisma.AppointmentUncheckedUpdateInput): Promise<Appointment>;
}

export class PrismaAppointmentRepository implements AppointmentRepository {
  async list(filters: AppointmentListFilters) {
    return db.appointment.findMany({
      where: {
        deletedAt: null,
        doctorId: filters.doctorId,
        patientId: filters.patientId,
        status: filters.status,
        startsAt: {
          gte: filters.startsAtGte,
          lte: filters.startsAtLte,
        },
      },
      orderBy: {
        startsAt: "asc",
      },
    });
  }

  async findById(id: string) {
    return db.appointment.findFirst({
      where: {
        id,
        deletedAt: null,
      },
    });
  }

  async findConflict(input: { doctorId: string; startsAt: Date; endsAt: Date; excludeId?: string }) {
    return db.appointment.findFirst({
      where: {
        doctorId: input.doctorId,
        deletedAt: null,
        status: {
          not: "CANCELLED",
        },
        id: input.excludeId
          ? {
              not: input.excludeId,
            }
          : undefined,
        startsAt: {
          lt: input.endsAt,
        },
        endsAt: {
          gt: input.startsAt,
        },
      },
    });
  }

  async create(data: Prisma.AppointmentUncheckedCreateInput) {
    return db.appointment.create({ data });
  }

  async update(id: string, data: Prisma.AppointmentUncheckedUpdateInput) {
    return db.appointment.update({
      where: { id },
      data,
    });
  }
}
