import { NextResponse, type NextRequest } from "next/server";
import { AppointmentStatus } from "@prisma/client";
import { z } from "zod";

import { PrismaAppointmentRepository } from "@/features/appointments/repository/appointment-repository";
import { AppointmentService } from "@/features/appointments/services/appointment-service";
import { jsonError, withProtectedRoute } from "@/server/http";

const service = new AppointmentService(new PrismaAppointmentRepository());

const calendarQuerySchema = z.object({
  view: z.enum(["day", "week", "month"]),
  date: z.iso.datetime(),
  doctorId: z.uuid().optional(),
  patientId: z.uuid().optional(),
  status: z.nativeEnum(AppointmentStatus).optional(),
});

export async function GET(request: NextRequest) {
  return withProtectedRoute(
    request,
    async ({ appUser }) => {
      if (!appUser) {
        return jsonError("Unauthorized.", 401);
      }

      const parsed = calendarQuerySchema.parse({
        view: request.nextUrl.searchParams.get("view") ?? "week",
        date: request.nextUrl.searchParams.get("date") ?? new Date().toISOString(),
        doctorId: request.nextUrl.searchParams.get("doctorId") ?? undefined,
        patientId: request.nextUrl.searchParams.get("patientId") ?? undefined,
        status: request.nextUrl.searchParams.get("status") ?? undefined,
      });

      const data = await service.listByView(parsed.view, new Date(parsed.date), {
        createdByUserId: appUser.id,
        doctorId: parsed.doctorId,
        patientId: parsed.patientId,
        status: parsed.status,
      });

      return NextResponse.json({ data });
    },
    {
      requireAuth: true,
      rateLimitKey: "appointments:calendar",
    },
  );
}
