import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

import { applySecurityHeaders, ensureCsrfCookie } from "@/middleware/security";

export async function middleware(request: NextRequest) {
  const response = NextResponse.next();

  applySecurityHeaders(response);
  ensureCsrfCookie(request, response);

  // Initialize language locale cookie if not set
  const localeCookie = request.cookies.get("NEXT_LOCALE")?.value;
  if (!localeCookie) {
    const acceptLang = request.headers.get("accept-language") || "";
    const resolvedLocale = acceptLang.toLowerCase().startsWith("en") ? "en-US" : "pt-BR";
    response.cookies.set("NEXT_LOCALE", resolvedLocale, { path: "/", maxAge: 31536000, sameSite: "lax" });
  }

  if (request.nextUrl.pathname.startsWith("/dashboard")) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      return response;
    }

    const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    });

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      const loginUrl = request.nextUrl.clone();
      loginUrl.pathname = "/login";
      loginUrl.searchParams.set("next", request.nextUrl.pathname);
      const redirectResponse = NextResponse.redirect(loginUrl);

      // Preserve security headers, csrf, and locale cookies on redirect
      applySecurityHeaders(redirectResponse);
      ensureCsrfCookie(request, redirectResponse);
      
      const currentLocale = request.cookies.get("NEXT_LOCALE")?.value;
      if (currentLocale) {
        redirectResponse.cookies.set("NEXT_LOCALE", currentLocale, { path: "/", maxAge: 31536000, sameSite: "lax" });
      } else {
        const acceptLang = request.headers.get("accept-language") || "";
        const resolvedLocale = acceptLang.toLowerCase().startsWith("en") ? "en-US" : "pt-BR";
        redirectResponse.cookies.set("NEXT_LOCALE", resolvedLocale, { path: "/", maxAge: 31536000, sameSite: "lax" });
      }

      return redirectResponse;
    }
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
