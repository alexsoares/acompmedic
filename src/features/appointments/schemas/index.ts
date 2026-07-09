import { z } from "zod";

import { APPOINTMENT_STATUS } from "@/lib/constants";

export const appointmentSchema = z.object({
  patientId: z.uuid(),
  doctorId: z.uuid(),
  startsAt: z.iso.datetime(),
  endsAt: z.iso.datetime(),
  notes: z.string().trim().max(2000).nullable().optional(),
  status: z.enum([
    APPOINTMENT_STATUS.SCHEDULED,
    APPOINTMENT_STATUS.CONFIRMED,
    APPOINTMENT_STATUS.IN_PROGRESS,
    APPOINTMENT_STATUS.COMPLETED,
    APPOINTMENT_STATUS.CANCELLED,
  ]),
});

export const appointmentFiltersSchema = z.object({
  doctorId: z.uuid().optional(),
  patientId: z.uuid().optional(),
  periodStart: z.iso.datetime().optional(),
  periodEnd: z.iso.datetime().optional(),
  status: z
    .enum([
      APPOINTMENT_STATUS.SCHEDULED,
      APPOINTMENT_STATUS.CONFIRMED,
      APPOINTMENT_STATUS.IN_PROGRESS,
      APPOINTMENT_STATUS.COMPLETED,
      APPOINTMENT_STATUS.CANCELLED,
    ])
    .optional(),
});
