export const APP_NAME = "Gerenciador de Laudos Medicos";

export const MEDICAL_REPORT_ALLOWED_MIME_TYPES = [
  "application/pdf",
  "text/plain",
] as const;

export const MEDICAL_REPORT_ALLOWED_EXTENSIONS = ["pdf", "txt"] as const;

export const APPOINTMENT_STATUS = {
  SCHEDULED: "SCHEDULED",
  CONFIRMED: "CONFIRMED",
  IN_PROGRESS: "IN_PROGRESS",
  COMPLETED: "COMPLETED",
  CANCELLED: "CANCELLED",
} as const;

export const APPOINTMENT_STATUS_COLORS = {
  SCHEDULED: "bg-sky-100 text-sky-800 border-sky-200",
  CONFIRMED: "bg-emerald-100 text-emerald-800 border-emerald-200",
  IN_PROGRESS: "bg-amber-100 text-amber-800 border-amber-200",
  COMPLETED: "bg-zinc-200 text-zinc-800 border-zinc-300",
  CANCELLED: "bg-rose-100 text-rose-800 border-rose-200",
} as const;
