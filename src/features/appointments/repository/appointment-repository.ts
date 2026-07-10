import { db } from "@/server/db";
import { APPOINTMENT_STATUS } from "@/lib/constants";

type AppointmentRecord = Awaited<ReturnType<typeof db.appointment.findFirst>>;
type AppointmentEntity = NonNullable<AppointmentRecord>;
type AppointmentStatusValue = (typeof APPOINTMENT_STATUS)[keyof typeof APPOINTMENT_STATUS];

export type AppointmentCreateData = {
  patientId: string;
  doctorId: string;
  createdByUserId: string;
  startsAt: Date;
  endsAt: Date;
  durationMinutes: number;
  notes?: string | null;
  status?: AppointmentStatusValue;
};

export type AppointmentUpdateData = {
  startsAt?: Date;
  endsAt?: Date;
  durationMinutes?: number;
  notes?: string | null;
  status?: AppointmentStatusValue;
  confirmedAt?: Date;
  startedAt?: Date;
  completedAt?: Date;
  cancelledAt?: Date;
};

export type AppointmentListFilters = {
  createdByUserId?: string;
  doctorId?: string;
  patientId?: string;
  status?: AppointmentEntity["status"];
  startsAtGte?: Date;
  startsAtLte?: Date;
};

export interface AppointmentRepository {
  list(filters: AppointmentListFilters): Promise<AppointmentEntity[]>;
  findById(id: string): Promise<AppointmentEntity | null>;
  findConflict(input: { doctorId: string; startsAt: Date; endsAt: Date; excludeId?: string }): Promise<AppointmentEntity | null>;
  create(data: AppointmentCreateData): Promise<AppointmentEntity>;
  update(id: string, data: AppointmentUpdateData): Promise<AppointmentEntity>;
}

export class PrismaAppointmentRepository implements AppointmentRepository {
  async list(filters: AppointmentListFilters) {
    return db.appointment.findMany({
      where: {
        deletedAt: null,
        createdByUserId: filters.createdByUserId,
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

  async create(data: AppointmentCreateData) {
    return db.appointment.create({ data });
  }

  async update(id: string, data: AppointmentUpdateData) {
    return db.appointment.update({
      where: { id },
      data,
    });
  }
}
