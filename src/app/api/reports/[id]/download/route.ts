import { NextResponse, type NextRequest } from "next/server";

import { PrismaMedicalReportRepository } from "@/features/medical-reports/repository/medical-report-repository";
import { MedicalReportStorageService } from "@/features/medical-reports/services/medical-report-storage-service";
import { env } from "@/lib/env";
import { db } from "@/server/db";
import { jsonError, withProtectedRoute } from "@/server/http";
import { buildMedicalReportWhereClause, resolveLinkedIds } from "@/server/security/authorize";
import { createMedicalReportsStorageBucket } from "@/server/supabase/storage";

const repository = new PrismaMedicalReportRepository();
const storageService = new MedicalReportStorageService(
  repository,
  createMedicalReportsStorageBucket(),
  {
    bucketName: env.SUPABASE_STORAGE_BUCKET_MEDICAL_REPORTS,
    maxUploadSizeBytes: env.MAX_UPLOAD_SIZE_BYTES,
    storageBaseUrl: env.NEXT_PUBLIC_SUPABASE_URL,
  },
);

export async function GET(
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
      const { doctorId, patientId } = await resolveLinkedIds(appUser.id);
      const userContext = { id: appUser.id, role: appUser.role, email: appUser.email, doctorId, patientId };
      const report = await db.medicalReport.findFirst({
        where: {
          id,
          deletedAt: null,
          ...buildMedicalReportWhereClause(userContext),
        },
        select: { id: true },
      });

      if (!report) {
        return jsonError("Report not found for this user.", 404);
      }

      const attachment = await repository.getCurrentAttachment(id);

      if (!attachment) {
        return jsonError("Attachment not found.", 404);
      }

      const signedUrl = await storageService.createDownloadUrl(attachment.id);
      return NextResponse.json({ data: { signedUrl } });
    },
    {
      requireAuth: true,
      rateLimitKey: "reports:download",
    },
  );
}
