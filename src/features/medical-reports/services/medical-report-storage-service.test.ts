import { beforeEach, describe, expect, it, vi } from "vitest";

import type {
  AttachmentCreateData,
  MedicalReportRepository,
} from "@/features/medical-reports/repository/medical-report-repository";
import { MedicalReportStorageService } from "@/features/medical-reports/services/medical-report-storage-service";
import type { MedicalReportsStorageBucket } from "@/server/supabase/storage";

function createFile(name: string, type: string, size = 128) {
  const content = new Uint8Array(size).fill(1);
  return new File([content], name, { type });
}

describe("MedicalReportStorageService", () => {
  const repository: MedicalReportRepository = {
    getMedicalReportContext: vi.fn(),
    getCurrentAttachment: vi.fn(),
    findAttachmentById: vi.fn(),
    createAttachment: vi.fn(),
    replaceCurrentAttachment: vi.fn(),
  };

  const storageBucket: MedicalReportsStorageBucket = {
    upload: vi.fn(),
    createSignedUrl: vi.fn(),
  };

  const service = new MedicalReportStorageService(repository, storageBucket, {
    bucketName: "medical-reports",
    maxUploadSizeBytes: 20 * 1024 * 1024,
    storageBaseUrl: "https://example.supabase.co",
  });

  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(repository.getMedicalReportContext).mockResolvedValue({
      id: "report-1",
      patientId: "patient-1",
    });
    vi.mocked(repository.getCurrentAttachment).mockResolvedValue(null);
    vi.mocked(storageBucket.upload).mockResolvedValue({
      data: {
        path: "reports/patient-patient-1/report-report-1/v1.pdf",
        fullPath: "medical-reports/reports/patient-patient-1/report-report-1/v1.pdf",
      },
      error: null,
    });
    vi.mocked(repository.createAttachment).mockImplementation(async (data: AttachmentCreateData) => ({
      id: "attachment-1",
      medicalReportId: data.medicalReportId,
      uploadedByUserId: data.uploadedByUserId,
      originalName: data.originalName,
      internalName: data.internalName,
      mimeType: data.mimeType,
      extension: data.extension,
      sizeBytes: data.sizeBytes,
      url: data.url,
      bucket: data.bucket,
      path: data.path,
      hash: data.hash,
      version: data.version,
      isCurrent: data.isCurrent,
      uploadedAt: data.uploadedAt,
      replacedAt: data.replacedAt ?? null,
      deletedAt: null,
    }));
    vi.mocked(repository.replaceCurrentAttachment).mockImplementation(async (_reportId, data: AttachmentCreateData) => ({
      id: "attachment-2",
      medicalReportId: data.medicalReportId,
      uploadedByUserId: data.uploadedByUserId,
      originalName: data.originalName,
      internalName: data.internalName,
      mimeType: data.mimeType,
      extension: data.extension,
      sizeBytes: data.sizeBytes,
      url: data.url,
      bucket: data.bucket,
      path: data.path,
      hash: data.hash,
      version: data.version,
      isCurrent: data.isCurrent,
      uploadedAt: data.uploadedAt,
      replacedAt: data.replacedAt ?? null,
      deletedAt: null,
    }));
  });

  it("uploads a supported pdf file with version 1 metadata", async () => {
    const attachment = await service.uploadNewFile({
      medicalReportId: "report-1",
      uploadedByUserId: "user-1",
      file: createFile("Laudo Final.pdf", "application/pdf"),
    });

    expect(storageBucket.upload).toHaveBeenCalledOnce();
    expect(attachment.originalName).toBe("laudo-final.pdf");
    expect(attachment.version).toBe(1);
    expect(attachment.path).toContain("report-report-1/v1.pdf");
  });

  it("rejects unsupported mime type", async () => {
    await expect(
      service.uploadNewFile({
        medicalReportId: "report-1",
        uploadedByUserId: "user-1",
        file: createFile("imagem.png", "image/png"),
      }),
    ).rejects.toThrow("Unsupported MIME type.");
  });

  it("increments version and preserves replacement flow", async () => {
    vi.mocked(repository.getCurrentAttachment).mockResolvedValue({
      id: "attachment-1",
      medicalReportId: "report-1",
      uploadedByUserId: "user-1",
      originalName: "laudo-v1.pdf",
      internalName: "report-1-v1.pdf",
      mimeType: "application/pdf",
      extension: "pdf",
      sizeBytes: 100,
      url: "https://example.supabase.co/storage/v1/object/medical-reports/path",
      bucket: "medical-reports",
      path: "reports/patient-patient-1/report-report-1/v1.pdf",
      hash: "sha256:abc",
      version: 1,
      isCurrent: true,
      uploadedAt: new Date(),
      replacedAt: null,
      deletedAt: null,
    });

    const attachment = await service.replaceCurrentFile({
      medicalReportId: "report-1",
      uploadedByUserId: "user-1",
      file: createFile("Laudo v2.txt", "text/plain"),
    });

    expect(repository.replaceCurrentAttachment).toHaveBeenCalledOnce();
    expect(attachment.version).toBe(2);
    expect(attachment.extension).toBe("txt");
  });
});