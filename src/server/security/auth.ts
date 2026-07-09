import { db } from "@/server/db";
import { createSupabaseServerClient } from "@/server/supabase/server";

export async function requireAuthenticatedAppUser() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    throw new Error("Unauthorized.");
  }

  const appUser = await db.user.findFirst({
    where: {
      authUserId: user.id,
      deletedAt: null,
    },
    select: {
      id: true,
      email: true,
      role: true,
      status: true,
    },
  });

  if (!appUser) {
    throw new Error("Authenticated user is not provisioned in the application.");
  }

  return appUser;
}
