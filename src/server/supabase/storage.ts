import { env } from "@/lib/env";
import { supabaseAdmin } from "@/server/supabase/admin";

export type SupabaseStorageUploadResult = {
  path: string;
  fullPath: string;
};

export interface MedicalReportsStorageBucket {
  upload(
    path: string,
    fileBody: ArrayBuffer,
    options: {
      contentType: string;
      upsert: boolean;
    },
  ): Promise<{ data: SupabaseStorageUploadResult | null; error: Error | null }>;
  createSignedUrl(
    path: string,
    expiresIn: number,
    options?: {
      download?: string;
    },
  ): Promise<{ data: { signedUrl: string } | null; error: Error | null }>;
}

export function createMedicalReportsStorageBucket(): MedicalReportsStorageBucket {
  return supabaseAdmin.storage.from(env.SUPABASE_STORAGE_BUCKET_MEDICAL_REPORTS);
}
