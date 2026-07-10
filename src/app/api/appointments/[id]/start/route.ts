import { NextResponse, type NextRequest } from "next/server";

import { PrismaAppointmentRepository } from "@/features/appointments/repository/appointment-repository";
import { AppointmentService } from "@/features/appointments/services/appointment-service";
import { db } from "@/server/db";
import { jsonError, withProtectedRoute } from "@/server/http";

const service = new AppointmentService(new PrismaAppointmentRepository());

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

      const { id } = await params;
      const owned = await db.appointment.findFirst({
        where: { id, createdByUserId: appUser.id, deletedAt: null },
        select: { id: true },
      });

      if (!owned) {
        return jsonError("Appointment not found for this user.", 404);
      }

      const appointment = await service.start(id, {
        actorUserId: appUser.id,
        ipAddress: request.headers.get("x-forwarded-for"),
        userAgent: request.headers.get("user-agent"),
      });

      return NextResponse.json({ data: appointment });
    },
    {
      requireAuth: true,
      csrf: true,
      rateLimitKey: "appointments:start",
    },
  );
}
