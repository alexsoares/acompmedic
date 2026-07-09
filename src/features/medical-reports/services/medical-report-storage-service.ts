import { createHash } from "node:crypto";

import { MEDICAL_REPORT_ALLOWED_EXTENSIONS, MEDICAL_REPORT_ALLOWED_MIME_TYPES } from "@/lib/constants";
import type {
  MedicalReportRepository,
  AttachmentCreateData,
} from "@/features/medical-reports/repository/medical-report-repository";
import type { MedicalReportsStorageBucket } from "@/server/supabase/storage";
import { extractExtension, sanitizeFileName } from "@/utils/file";

type UploadMedicalReportFileInput = {
  medicalReportId: string;
  uploadedByUserId: string;
  file: File;
};

type ReplaceMedicalReportFileInput = UploadMedicalReportFileInput;

type SignedUrlOptions = {
  expiresInSeconds?: number;
};

export type MedicalReportStorageConfig = {
  bucketName: string;
  maxUploadSizeBytes: number;
  storageBaseUrl: string;
};

export class MedicalReportStorageService {
  constructor(
    private readonly repository: MedicalReportRepository,
    private readonly storageBucket: MedicalReportsStorageBucket,
    private readonly config: MedicalReportStorageConfig,
  ) {}

  async uploadNewFile(input: UploadMedicalReportFileInput) {
    return this.persistAttachment({
      ...input,
      mode: "create",
    });
  }

  async replaceCurrentFile(input: ReplaceMedicalReportFileInput) {
    return this.persistAttachment({
      ...input,
      mode: "replace",
    });
  }

  async createDownloadUrl(attachmentId: string, options?: SignedUrlOptions) {
    const attachment = await this.repository.findAttachmentById(attachmentId);

    if (!attachment) {
      throw new Error("Attachment not found.");
    }

    const { data, error } = await this.storageBucket.createSignedUrl(
      attachment.path,
      options?.expiresInSeconds ?? 60,
      {
        download: attachment.originalName,
      },
    );

    if (error || !data) {
      throw new Error(error?.message ?? "Failed to create download URL.");
    }

    return data.signedUrl;
  }

  async createViewUrl(attachmentId: string, options?: SignedUrlOptions) {
    const attachment = await this.repository.findAttachmentById(attachmentId);

    if (!attachment) {
      throw new Error("Attachment not found.");
    }

    const { data, error } = await this.storageBucket.createSignedUrl(
      attachment.path,
      options?.expiresInSeconds ?? 60,
    );

    if (error || !data) {
      throw new Error(error?.message ?? "Failed to create view URL.");
    }

    return data.signedUrl;
  }

  private async persistAttachment(
    input: UploadMedicalReportFileInput & {
      mode: "create" | "replace";
    },
  ) {
    const report = await this.repository.getMedicalReportContext(input.medicalReportId);

    if (!report) {
      throw new Error("Medical report not found.");
    }

    const validation = this.validateFile(input.file);
    const currentAttachment = await this.repository.getCurrentAttachment(input.medicalReportId);
    const nextVersion = currentAttachment ? currentAttachment.version + 1 : 1;
    const uploadedAt = new Date();
    const internalName = `${input.medicalReportId}-v${nextVersion}.${validation.extension}`;
    const path = this.buildStoragePath(report.patientId, input.medicalReportId, nextVersion, validation.extension);
    const fileBuffer = await input.file.arrayBuffer();
    const fileHash = this.createHash(fileBuffer);

    const { error } = await this.storageBucket.upload(path, fileBuffer, {
      contentType: validation.mimeType,
      upsert: false,
    });

    if (error) {
      throw new Error(error.message);
    }

    const attachmentData: AttachmentCreateData = {
      medicalReportId: input.medicalReportId,
      uploadedByUserId: input.uploadedByUserId,
      originalName: sanitizeFileName(input.file.name),
      internalName,
      mimeType: validation.mimeType,
      extension: validation.extension,
      sizeBytes: input.file.size,
      url: this.buildStorageObjectUrl(path),
      bucket: this.config.bucketName,
      path,
      hash: `sha256:${fileHash}`,
      version: nextVersion,
      isCurrent: true,
      uploadedAt,
    };

    if (input.mode === "replace") {
      return this.repository.replaceCurrentAttachment(input.medicalReportId, attachmentData);
    }

    return this.repository.createAttachment(attachmentData);
  }

  private validateFile(file: File) {
    const extension = extractExtension(file.name);

    if (!MEDICAL_REPORT_ALLOWED_MIME_TYPES.includes(file.type as (typeof MEDICAL_REPORT_ALLOWED_MIME_TYPES)[number])) {
      throw new Error("Unsupported MIME type.");
    }

    if (!MEDICAL_REPORT_ALLOWED_EXTENSIONS.includes(extension as (typeof MEDICAL_REPORT_ALLOWED_EXTENSIONS)[number])) {
      throw new Error("Unsupported file extension.");
    }

    if (file.size > this.config.maxUploadSizeBytes) {
      throw new Error("File exceeds maximum allowed size.");
    }

    return {
      mimeType: file.type,
      extension,
    };
  }

  private buildStoragePath(patientId: string, medicalReportId: string, version: number, extension: string) {
    return `reports/patient-${patientId}/report-${medicalReportId}/v${version}.${extension}`;
  }

  private buildStorageObjectUrl(path: string) {
    return `${this.config.storageBaseUrl}/storage/v1/object/${this.config.bucketName}/${path}`;
  }

  private createHash(fileBuffer: ArrayBuffer) {
    return createHash("sha256").update(Buffer.from(fileBuffer)).digest("hex");
  }
}
