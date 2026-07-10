import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Activity, CalendarDays, FileText, Home, LogOut, Stethoscope, Users } from "lucide-react";

import { signOut } from "@/actions/auth-actions";
import { LocaleSwitcher } from "@/components/dashboard/locale-switcher";

type DashboardShellProps = {
  children: React.ReactNode;
  user: {
    email: string;
    role: string;
    locale: string;
    profile?: {
      fullName: string;
    } | null;
  };
};

export async function DashboardShell({ children, user }: DashboardShellProps) {
  const displayName = user.profile?.fullName ?? user.email;
  const t = await getTranslations("common");

  const navigation = [
    { href: "/dashboard", label: t("nav.overview"), icon: Home },
    { href: "/dashboard/agenda", label: t("nav.agenda"), icon: CalendarDays },
    { href: "/dashboard/pacientes", label: t("nav.patients"), icon: Users },
    ...(user.role !== "PATIENT"
      ? [{ href: "/dashboard/medicos", label: t("nav.doctors"), icon: Stethoscope }]
      : []),
    { href: "/dashboard/laudos", label: t("nav.reports"), icon: FileText },
  ];

  return (
    <div className="min-h-screen bg-slate-100 text-slate-950">
      <aside className="fixed inset-y-0 left-0 hidden w-64 border-r border-slate-200 bg-white lg:flex lg:flex-col">
        <div className="flex h-16 items-center gap-3 border-b border-slate-200 px-5">
          <div className="flex h-9 w-9 items-center justify-center rounded-md bg-teal-700 text-white">
            <Activity className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-semibold">{t("dashboard.appName") ? "AcompMedic" : "AcompMedic"}</p>
            <p className="text-xs text-slate-500">{t("dashboard.appSubtitle") ? "Dashboard Médico" : "Dashboard"}</p>
          </div>
        </div>
        <nav className="flex-1 space-y-1 px-3 py-4">
          {navigation.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex h-10 items-center gap-3 rounded-md px-3 text-sm font-medium text-slate-700 transition hover:bg-slate-100 hover:text-slate-950"
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="p-3 border-t border-slate-200 flex flex-col gap-2">
          <LocaleSwitcher currentLocale={user.locale} isLoggedIn={true} />
          <form action={signOut}>
            <button className="flex h-10 w-full items-center gap-3 rounded-md px-3 text-sm font-medium text-slate-700 transition hover:bg-rose-50 hover:text-rose-700">
              <LogOut className="h-4 w-4" />
              {t("nav.signOut")}
            </button>
          </form>
        </div>
      </aside>

      <div className="lg:pl-64">
        <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/95 backdrop-blur">
          <div className="flex min-h-16 flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between lg:px-8">
            <nav className="flex gap-2 overflow-x-auto lg:hidden">
              {navigation.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="inline-flex h-10 min-w-10 items-center justify-center rounded-md border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700"
                    aria-label={item.label}
                  >
                    <Icon className="h-4 w-4" />
                  </Link>
                );
              })}
            </nav>
            <div className="flex items-center gap-4">
              <div className="lg:hidden">
                <LocaleSwitcher currentLocale={user.locale} isLoggedIn={true} />
              </div>
              <div>
                <p className="text-sm font-semibold">{displayName}</p>
                <p className="text-xs uppercase tracking-wide text-slate-500">{t(`roles.${user.role}`)}</p>
              </div>
            </div>
            <form action={signOut} className="hidden sm:block">
              <button className="inline-flex h-10 items-center gap-2 rounded-md border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">
                <LogOut className="h-4 w-4" />
                {t("nav.signOut")}
              </button>
            </form>
          </div>
        </header>
        <main className="px-4 py-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}
