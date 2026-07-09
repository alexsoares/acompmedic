import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { applySecurityHeaders, ensureCsrfCookie } from "@/middleware/security";

export function middleware(request: NextRequest) {
  const response = NextResponse.next();

  applySecurityHeaders(response);
  ensureCsrfCookie(request, response);

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
