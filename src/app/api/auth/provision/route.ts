import { NextResponse, type NextRequest } from "next/server";

import { db } from "@/server/db";
import { createSupabaseServerClient } from "@/server/supabase/server";

export async function POST(request: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user?.email) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const body = (await request.json().catch(() => ({}))) as { fullName?: string };
  const fullName = body.fullName?.trim() || user.user_metadata.full_name || user.email;

  const appUser = await db.user.upsert({
    where: { authUserId: user.id },
    update: {
      email: user.email,
      lastLoginAt: new Date(),
    },
    create: {
      authUserId: user.id,
      email: user.email,
      role: "PATIENT",
      lastLoginAt: new Date(),
      profile: {
        create: {
          fullName,
        },
      },
      patientRecord: {
        create: {
          fullName,
          email: user.email,
        },
      },
    },
  });

  return NextResponse.json({ data: appUser });
}
