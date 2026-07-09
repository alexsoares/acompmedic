import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import type { z } from "zod";

import { env } from "@/lib/env";
import { logger } from "@/server/logger";
import { requireAuthenticatedAppUser } from "@/server/security/auth";
import { assertValidCsrfToken } from "@/server/security/csrf";
import { enforceRateLimit } from "@/server/security/rate-limit";

type ProtectedRouteOptions = {
  requireAuth?: boolean;
  csrf?: boolean;
  rateLimitKey?: string;
};

type ProtectedRouteContext = {
  request: NextRequest;
  appUser: Awaited<ReturnType<typeof requireAuthenticatedAppUser>> | null;
};

export function getRequestIp(request: NextRequest) {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
}

export function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export async function parseJsonBody<TSchema extends z.ZodTypeAny>(request: NextRequest, schema: TSchema) {
  const body = await request.json();
  return schema.parse(body);
}

export async function withProtectedRoute(
  request: NextRequest,
  handler: (context: ProtectedRouteContext) => Promise<NextResponse>,
  options: ProtectedRouteOptions = {},
) {
  try {
    const ip = getRequestIp(request);
    const rateLimit = enforceRateLimit(
      `${options.rateLimitKey ?? request.nextUrl.pathname}:${ip}`,
      {
        windowMs: env.RATE_LIMIT_WINDOW_MS,
        maxRequests: env.RATE_LIMIT_MAX_REQUESTS,
      },
    );

    if (!rateLimit.allowed) {
      return jsonError("Too many requests.", 429);
    }

    if (options.csrf) {
      assertValidCsrfToken(request);
    }

    const appUser = options.requireAuth ? await requireAuthenticatedAppUser() : null;

    return await handler({ request, appUser });
  } catch (error) {
    logger.error("Protected route failed", {
      path: request.nextUrl.pathname,
      error: error instanceof Error ? error.message : "Unknown error",
    });

    if (error instanceof Error && error.message === "Unauthorized.") {
      return jsonError(error.message, 401);
    }

    if (error instanceof Error && error.message === "Invalid CSRF token.") {
      return jsonError(error.message, 403);
    }

    if (error instanceof Error && error.message.includes("provisioned")) {
      return jsonError(error.message, 403);
    }

    if (error instanceof Error && error.name === "ZodError") {
      return jsonError(error.message, 422);
    }

    return jsonError(error instanceof Error ? error.message : "Unexpected error.", 400);
  }
}
