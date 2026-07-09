import { AppointmentStatus } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { AppointmentRepository } from "@/features/appointments/repository/appointment-repository";
import { AppointmentService } from "@/features/appointments/services/appointment-service";

describe("AppointmentService", () => {
  const auditWriter = vi.fn().mockResolvedValue(undefined);

  const repository: AppointmentRepository = {
    list: vi.fn(),
    findById: vi.fn(),
    findConflict: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  };

  const service = new AppointmentService(repository, auditWriter);

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(repository.findConflict).mockResolvedValue(null);
    vi.mocked(repository.create).mockImplementation(async (data) => ({
      id: "appointment-1",
      patientId: String(data.patientId),
      doctorId: String(data.doctorId),
      createdByUserId: String(data.createdByUserId),
      startsAt: data.startsAt as Date,
      endsAt: data.endsAt as Date,
      durationMinutes: Number(data.durationMinutes),
      notes: (data.notes as string | null) ?? null,
      status: data.status as AppointmentStatus,
      confirmedAt: null,
      startedAt: null,
      completedAt: null,
      cancelledAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null,
    }));
    vi.mocked(repository.findById).mockResolvedValue({
      id: "appointment-1",
      patientId: "patient-1",
      doctorId: "doctor-1",
      createdByUserId: "user-1",
      startsAt: new Date("2026-07-10T10:00:00.000Z"),
      endsAt: new Date("2026-07-10T10:30:00.000Z"),
      durationMinutes: 30,
      notes: null,
      status: AppointmentStatus.SCHEDULED,
      confirmedAt: null,
      startedAt: null,
      completedAt: null,
      cancelledAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null,
    });
    vi.mocked(repository.update).mockImplementation(async (_id, data) => ({
      id: "appointment-1",
      patientId: "patient-1",
      doctorId: "doctor-1",
      createdByUserId: "user-1",
      startsAt: (data.startsAt as Date) ?? new Date("2026-07-10T10:00:00.000Z"),
      endsAt: (data.endsAt as Date) ?? new Date("2026-07-10T10:30:00.000Z"),
      durationMinutes: Number(data.durationMinutes ?? 30),
      notes: (data.notes as string | null) ?? null,
      status: (data.status as AppointmentStatus) ?? AppointmentStatus.SCHEDULED,
      confirmedAt: (data.confirmedAt as Date | null) ?? null,
      startedAt: (data.startedAt as Date | null) ?? null,
      completedAt: (data.completedAt as Date | null) ?? null,
      cancelledAt: (data.cancelledAt as Date | null) ?? null,
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null,
    }));
  });

  it("creates an appointment when the doctor is available", async () => {
    const appointment = await service.create(
      {
        patientId: "550e8400-e29b-41d4-a716-446655440000",
        doctorId: "550e8400-e29b-41d4-a716-446655440001",
        startsAt: "2026-07-10T10:00:00.000Z",
        endsAt: "2026-07-10T10:30:00.000Z",
        notes: "  retorno  ",
        status: "SCHEDULED",
      },
      { actorUserId: "user-1" },
    );

    expect(repository.create).toHaveBeenCalledOnce();
    expect(appointment.durationMinutes).toBe(30);
    expect(appointment.notes).toBe("retorno");
  });

  it("rejects conflicting time ranges", async () => {
    vi.mocked(repository.findConflict).mockResolvedValue({
      id: "appointment-conflict",
      patientId: "patient-2",
      doctorId: "doctor-1",
      createdByUserId: "user-1",
      startsAt: new Date("2026-07-10T10:00:00.000Z"),
      endsAt: new Date("2026-07-10T10:30:00.000Z"),
      durationMinutes: 30,
      notes: null,
      status: AppointmentStatus.CONFIRMED,
      confirmedAt: null,
      startedAt: null,
      completedAt: null,
      cancelledAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null,
    });

    await expect(
      service.create(
        {
          patientId: "550e8400-e29b-41d4-a716-446655440000",
          doctorId: "550e8400-e29b-41d4-a716-446655440001",
          startsAt: "2026-07-10T10:10:00.000Z",
          endsAt: "2026-07-10T10:40:00.000Z",
          notes: null,
          status: "SCHEDULED",
        },
        { actorUserId: "user-1" },
      ),
    ).rejects.toThrow("Doctor is not available for the requested time range.");
  });

  it("lists appointments for a weekly view", async () => {
    vi.mocked(repository.list).mockResolvedValue([]);

    await service.listByView("week", new Date("2026-07-10T00:00:00.000Z"), {});

    expect(repository.list).toHaveBeenCalledOnce();
  });
});
