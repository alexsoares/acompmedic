import { redirect } from "next/navigation";

import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { db } from "@/server/db";
import { requireAuthenticatedAppUserOrRedirect } from "@/server/security/auth";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const appUser = await requireAuthenticatedAppUserOrRedirect();

  const user = await db.user.findFirst({
    where: { id: appUser.id },
    select: {
      email: true,
      role: true,
      locale: true,
      profile: {
        select: {
          fullName: true,
        },
      },
    },
  });

  if (!user) {
    redirect("/login");
  }

  return <DashboardShell user={user}>{children}</DashboardShell>;
}
