import { NextResponse, type NextRequest } from "next/server";
import { AppointmentStatus } from "@prisma/client";
import { z } from "zod";

import { PrismaAppointmentRepository } from "@/features/appointments/repository/appointment-repository";
import { AppointmentService } from "@/features/appointments/services/appointment-service";
import { db } from "@/server/db";
import { jsonError, withProtectedRoute } from "@/server/http";

const updateAppointmentSchema = z.object({
  startsAt: z.iso.datetime(),
  endsAt: z.iso.datetime().optional(),
  durationMinutes: z.number().int().positive().optional(),
  notes: z.string().max(2000).nullable().optional(),
  status: z.nativeEnum(AppointmentStatus).optional(),
});

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return withProtectedRoute(
    request,
    async ({ appUser }) => {
      if (!appUser) {
        return jsonError("Unauthorized.", 401);
      }

      const { id } = await params;
      const body = updateAppointmentSchema.parse(await request.json());
      const startsAt = new Date(body.startsAt);
      const durationMinutes = body.durationMinutes ?? 30;
      const endsAt = body.endsAt ? new Date(body.endsAt) : new Date(startsAt.getTime() + durationMinutes * 60_000);

      const appointment = await db.appointment.update({
        where: { id },
        data: {
          startsAt,
          endsAt,
          durationMinutes: Math.round((endsAt.getTime() - startsAt.getTime()) / 60000),
          notes: body.notes,
          status: body.status,
        },
      });

      return NextResponse.json({ data: appointment });
    },
    {
      requireAuth: true,
      csrf: true,
      rateLimitKey: "appointments:update",
    },
  );
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return withProtectedRoute(
    request,
    async ({ appUser }) => {
      if (!appUser) {
        return jsonError("Unauthorized.", 401);
      }

      const { id } = await params;
      const service = new AppointmentService(new PrismaAppointmentRepository());
      const appointment = await service.cancel(id, {
        actorUserId: appUser.id,
        ipAddress: request.headers.get("x-forwarded-for"),
        userAgent: request.headers.get("user-agent"),
      });

      return NextResponse.json({ data: appointment });
    },
    {
      requireAuth: true,
      csrf: true,
      rateLimitKey: "appointments:delete",
    },
  );
}
