import { NextResponse, type NextRequest } from "next/server";
import { AppointmentStatus } from "@prisma/client";
import { z } from "zod";

import { PrismaAppointmentRepository } from "@/features/appointments/repository/appointment-repository";
import { AppointmentService } from "@/features/appointments/services/appointment-service";
import { jsonError, withProtectedRoute } from "@/server/http";

const service = new AppointmentService(new PrismaAppointmentRepository());

const listQuerySchema = z.object({
  doctorId: z.uuid().optional(),
  patientId: z.uuid().optional(),
  status: z.nativeEnum(AppointmentStatus).optional(),
  periodStart: z.iso.datetime().optional(),
  periodEnd: z.iso.datetime().optional(),
});

const createAppointmentSchema = z.object({
  patientId: z.uuid(),
  doctorId: z.uuid(),
  startsAt: z.iso.datetime(),
  endsAt: z.iso.datetime(),
  notes: z.string().max(2000).nullable().optional(),
  status: z.nativeEnum(AppointmentStatus).default(AppointmentStatus.SCHEDULED),
});

export async function GET(request: NextRequest) {
  return withProtectedRoute(
    request,
    async () => {
      const parsed = listQuerySchema.parse({
        doctorId: request.nextUrl.searchParams.get("doctorId") ?? undefined,
        patientId: request.nextUrl.searchParams.get("patientId") ?? undefined,
        status: request.nextUrl.searchParams.get("status") ?? undefined,
        periodStart: request.nextUrl.searchParams.get("periodStart") ?? undefined,
        periodEnd: request.nextUrl.searchParams.get("periodEnd") ?? undefined,
      });

      const appointments = await new PrismaAppointmentRepository().list({
        doctorId: parsed.doctorId,
        patientId: parsed.patientId,
        status: parsed.status,
        startsAtGte: parsed.periodStart ? new Date(parsed.periodStart) : undefined,
        startsAtLte: parsed.periodEnd ? new Date(parsed.periodEnd) : undefined,
      });

      return NextResponse.json({ data: appointments });
    },
    {
      requireAuth: true,
      rateLimitKey: "appointments:list",
    },
  );
}

export async function POST(request: NextRequest) {
  return withProtectedRoute(
    request,
    async ({ appUser }) => {
      if (!appUser) {
        return jsonError("Unauthorized.", 401);
      }

      const body = createAppointmentSchema.parse(await request.json());
      const appointment = await service.create(body, {
        actorUserId: appUser.id,
        ipAddress: request.headers.get("x-forwarded-for"),
        userAgent: request.headers.get("user-agent"),
      });

      return NextResponse.json({ data: appointment }, { status: 201 });
    },
    {
      requireAuth: true,
      csrf: true,
      rateLimitKey: "appointments:create",
    },
  );
}
