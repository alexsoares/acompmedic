export function extractExtension(fileName: string) {
  const normalized = fileName.trim().toLowerCase();
  const parts = normalized.split(".");

  if (parts.length < 2) {
    return "";
  }

  return parts.at(-1) ?? "";
}

export function sanitizeFileName(fileName: string) {
  return fileName
    .normalize("NFKD")
    .replace(/[^a-zA-Z0-9._-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();
}
