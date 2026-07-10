import { NextResponse, type NextRequest } from "next/server";

import { PrismaMedicalReportRepository } from "@/features/medical-reports/repository/medical-report-repository";
import { MedicalReportStorageService } from "@/features/medical-reports/services/medical-report-storage-service";
import { env } from "@/lib/env";
import { db } from "@/server/db";
import { jsonError, withProtectedRoute } from "@/server/http";
import { resolveLinkedIds } from "@/server/security/authorize";
import { createMedicalReportsStorageBucket } from "@/server/supabase/storage";

const storageService = new MedicalReportStorageService(
  new PrismaMedicalReportRepository(),
  createMedicalReportsStorageBucket(),
  {
    bucketName: env.SUPABASE_STORAGE_BUCKET_MEDICAL_REPORTS,
    maxUploadSizeBytes: env.MAX_UPLOAD_SIZE_BYTES,
    storageBaseUrl: env.NEXT_PUBLIC_SUPABASE_URL,
  },
);

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  return withProtectedRoute(
    request,
    async ({ appUser }) => {
      if (!appUser) {
        return jsonError("Unauthorized.", 401);
      }

      const formData = await request.formData();
      const file = formData.get("file");

      if (!(file instanceof File)) {
        return jsonError("File is required.", 422);
      }

      const { id } = await params;
      const { doctorId } = await resolveLinkedIds(appUser.id);

      if (appUser.role === "PATIENT") {
        return jsonError("Patients cannot replace report files.", 403);
      }

      const report = await db.medicalReport.findFirst({
        where: {
          id,
          deletedAt: null,
          ...(appUser.role === "ADMIN" ? {} : { doctorId: doctorId ?? "00000000-0000-0000-0000-000000000000" }),
        },
        select: { id: true },
      });

      if (!report) {
        return jsonError("Report not found for this user.", 404);
      }

      const attachment = await storageService.replaceCurrentFile({
        medicalReportId: id,
        uploadedByUserId: appUser.id,
        file,
      });

      return NextResponse.json({ data: attachment });
    },
    {
      requireAuth: true,
      csrf: true,
      rateLimitKey: "reports:replace-file",
    },
  );
}
