import { z } from "zod";

import { MEDICAL_REPORT_ALLOWED_EXTENSIONS, MEDICAL_REPORT_ALLOWED_MIME_TYPES } from "@/lib/constants";

export const medicalReportSchema = z.object({
  title: z.string().trim().min(3).max(150),
  patientId: z.uuid(),
  doctorId: z.uuid(),
  reportDate: z.coerce.date(),
  observations: z.string().trim().max(4000).nullable().optional(),
  specialty: z.string().trim().min(2).max(100),
});

export const uploadMetadataSchema = z.object({
  originalName: z.string().trim().min(1),
  mimeType: z.enum(MEDICAL_REPORT_ALLOWED_MIME_TYPES),
  extension: z.enum(MEDICAL_REPORT_ALLOWED_EXTENSIONS),
  size: z.number().int().positive().max(20 * 1024 * 1024),
  hash: z.string().trim().min(1),
});
