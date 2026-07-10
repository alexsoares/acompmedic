import Link from "next/link";
import { Activity, CalendarDays, FileText, Home, LogOut, Stethoscope, Users } from "lucide-react";

import { signOut } from "@/actions/auth-actions";

type DashboardShellProps = {
  children: React.ReactNode;
  user: {
    email: string;
    role: string;
    profile?: {
      fullName: string;
    } | null;
  };
};

const navigation = [
  { href: "/dashboard", label: "Visão geral", icon: Home },
  { href: "/dashboard/agenda", label: "Agenda", icon: CalendarDays },
  { href: "/dashboard/pacientes", label: "Pacientes", icon: Users },
  { href: "/dashboard/medicos", label: "Médicos", icon: Stethoscope },
  { href: "/dashboard/laudos", label: "Laudos", icon: FileText },
];

export function DashboardShell({ children, user }: DashboardShellProps) {
  const displayName = user.profile?.fullName ?? user.email;

  return (
    <div className="min-h-screen bg-slate-100 text-slate-950">
      <aside className="fixed inset-y-0 left-0 hidden w-64 border-r border-slate-200 bg-white lg:flex lg:flex-col">
        <div className="flex h-16 items-center gap-3 border-b border-slate-200 px-5">
          <div className="flex h-9 w-9 items-center justify-center rounded-md bg-teal-700 text-white">
            <Activity className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-semibold">AcompMedic</p>
            <p className="text-xs text-slate-500">Dashboard Médico</p>
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
        <form action={signOut} className="border-t border-slate-200 p-3">
          <button className="flex h-10 w-full items-center gap-3 rounded-md px-3 text-sm font-medium text-slate-700 transition hover:bg-rose-50 hover:text-rose-700">
            <LogOut className="h-4 w-4" />
            Sair
          </button>
        </form>
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
            <div>
              <p className="text-sm font-semibold">{displayName}</p>
              <p className="text-xs uppercase tracking-wide text-slate-500">{user.role}</p>
            </div>
            <form action={signOut}>
              <button className="inline-flex h-10 items-center gap-2 rounded-md border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">
                <LogOut className="h-4 w-4" />
                Sair
              </button>
            </form>
          </div>
        </header>
        <main className="px-4 py-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}
