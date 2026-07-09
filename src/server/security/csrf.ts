import type { NextRequest } from "next/server";

export const CSRF_COOKIE_NAME = "csrf-token";
export const CSRF_HEADER_NAME = "x-csrf-token";

export function generateCsrfToken() {
  return globalThis.crypto.randomUUID();
}

export function assertValidCsrfToken(request: NextRequest) {
  if (["GET", "HEAD", "OPTIONS"].includes(request.method)) {
    return;
  }

  const csrfCookie = request.cookies.get(CSRF_COOKIE_NAME)?.value;
  const csrfHeader = request.headers.get(CSRF_HEADER_NAME);

  if (!csrfCookie || !csrfHeader || csrfCookie !== csrfHeader) {
    throw new Error("Invalid CSRF token.");
  }
}
