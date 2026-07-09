import { NextResponse, type NextRequest } from "next/server";

import { PrismaMedicalReportRepository } from "@/features/medical-reports/repository/medical-report-repository";
import { MedicalReportStorageService } from "@/features/medical-reports/services/medical-report-storage-service";
import { env } from "@/lib/env";
import { jsonError, withProtectedRoute } from "@/server/http";
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
      const attachment = await storageService.uploadNewFile({
        medicalReportId: id,
        uploadedByUserId: appUser.id,
        file,
      });

      return NextResponse.json({ data: attachment }, { status: 201 });
    },
    {
      requireAuth: true,
      csrf: true,
      rateLimitKey: "reports:upload",
    },
  );
}
