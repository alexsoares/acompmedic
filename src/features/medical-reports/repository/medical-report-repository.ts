import type { Attachment } from "@prisma/client";

import { db } from "@/server/db";

export type MedicalReportContext = {
  id: string;
  patientId: string;
};

export type AttachmentCreateData = {
  medicalReportId: string;
  uploadedByUserId: string;
  originalName: string;
  internalName: string;
  mimeType: string;
  extension: string;
  sizeBytes: number;
  url: string;
  bucket: string;
  path: string;
  hash: string;
  version: number;
  isCurrent: boolean;
  uploadedAt: Date;
  replacedAt?: Date;
};

export interface MedicalReportRepository {
  getMedicalReportContext(reportId: string): Promise<MedicalReportContext | null>;
  getCurrentAttachment(reportId: string): Promise<Attachment | null>;
  findAttachmentById(attachmentId: string): Promise<Attachment | null>;
  createAttachment(data: AttachmentCreateData): Promise<Attachment>;
  replaceCurrentAttachment(reportId: string, data: AttachmentCreateData): Promise<Attachment>;
}

export class PrismaMedicalReportRepository implements MedicalReportRepository {
  async getMedicalReportContext(reportId: string) {
    return db.medicalReport.findFirst({
      where: {
        id: reportId,
        deletedAt: null,
      },
      select: {
        id: true,
        patientId: true,
      },
    });
  }

  async getCurrentAttachment(reportId: string) {
    return db.attachment.findFirst({
      where: {
        medicalReportId: reportId,
        isCurrent: true,
        deletedAt: null,
      },
      orderBy: {
        version: "desc",
      },
    });
  }

  async findAttachmentById(attachmentId: string) {
    return db.attachment.findFirst({
      where: {
        id: attachmentId,
        deletedAt: null,
      },
    });
  }

  async createAttachment(data: AttachmentCreateData) {
    return db.attachment.create({
      data,
    });
  }

  async replaceCurrentAttachment(reportId: string, data: AttachmentCreateData) {
    return db.$transaction(async (transaction) => {
      await transaction.attachment.updateMany({
        where: {
          medicalReportId: reportId,
          isCurrent: true,
          deletedAt: null,
        },
        data: {
          isCurrent: false,
          replacedAt: data.uploadedAt,
        },
      });

      return transaction.attachment.create({
        data,
      });
    });
  }
}
