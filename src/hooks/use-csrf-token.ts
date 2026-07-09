"use client";

import { useMemo } from "react";

import { CSRF_COOKIE_NAME, CSRF_HEADER_NAME } from "@/server/security/csrf";

function readCookie(cookieName: string) {
  return document.cookie
    .split("; ")
    .find((entry) => entry.startsWith(`${cookieName}=`))
    ?.split("=")[1] ?? null;
}

export function useCsrfToken() {
  const csrfToken = useMemo(() => readCookie(CSRF_COOKIE_NAME), []);

  return {
    csrfToken,
    headerName: CSRF_HEADER_NAME,
  };
}
