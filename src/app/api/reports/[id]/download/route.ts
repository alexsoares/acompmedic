import { NextResponse, type NextRequest } from "next/server";

import { PrismaMedicalReportRepository } from "@/features/medical-reports/repository/medical-report-repository";
import { MedicalReportStorageService } from "@/features/medical-reports/services/medical-report-storage-service";
import { env } from "@/lib/env";
import { jsonError, withProtectedRoute } from "@/server/http";
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
    async () => {
      const { id } = await params;
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
