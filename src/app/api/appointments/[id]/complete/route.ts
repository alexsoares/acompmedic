import { NextResponse, type NextRequest } from "next/server";

import { PrismaAppointmentRepository } from "@/features/appointments/repository/appointment-repository";
import { AppointmentService } from "@/features/appointments/services/appointment-service";
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
      const appointment = await service.complete(id, {
        actorUserId: appUser.id,
        ipAddress: request.headers.get("x-forwarded-for"),
        userAgent: request.headers.get("user-agent"),
      });

      return NextResponse.json({ data: appointment });
    },
    {
      requireAuth: true,
      csrf: true,
      rateLimitKey: "appointments:complete",
    },
  );
}
