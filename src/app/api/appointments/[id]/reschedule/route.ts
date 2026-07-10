import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { PrismaAppointmentRepository } from "@/features/appointments/repository/appointment-repository";
import { AppointmentService } from "@/features/appointments/services/appointment-service";
import { db } from "@/server/db";
import { jsonError, withProtectedRoute } from "@/server/http";

const service = new AppointmentService(new PrismaAppointmentRepository());

const rescheduleSchema = z.object({
  startsAt: z.iso.datetime(),
  endsAt: z.iso.datetime(),
  notes: z.string().max(2000).nullable().optional(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  return withProtectedRoute(
    request,
    async ({ appUser }) => {
      if (!appUser) {
        return jsonError("Unauthorized.", 401);
      }

      const body = rescheduleSchema.parse(await request.json());
      const { id } = await params;
      const owned = await db.appointment.findFirst({
        where: { id, createdByUserId: appUser.id, deletedAt: null },
        select: { id: true },
      });

      if (!owned) {
        return jsonError("Appointment not found for this user.", 404);
      }

      const appointment = await service.reschedule(id, body, {
        actorUserId: appUser.id,
        ipAddress: request.headers.get("x-forwarded-for"),
        userAgent: request.headers.get("user-agent"),
      });

      return NextResponse.json({ data: appointment });
    },
    {
      requireAuth: true,
      csrf: true,
      rateLimitKey: "appointments:reschedule",
    },
  );
}
