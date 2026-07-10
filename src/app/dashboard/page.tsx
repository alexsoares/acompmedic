import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { CalendarDays, FileText, Stethoscope, Users } from "lucide-react";

import { Panel, PageHeader } from "@/components/dashboard/ui";
import { db } from "@/server/db";
import { requireAuthenticatedAppUserOrRedirect } from "@/server/security/auth";
import {
  buildPatientWhereClause,
  buildDoctorWhereClause,
  buildAppointmentWhereClause,
  buildMedicalReportWhereClause,
  resolveLinkedIds,
} from "@/server/security/authorize";

function formatTime(date: Date, locale: string) {
  return new Intl.DateTimeFormat(locale, {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export default async function DashboardPage() {
  const appUser = await requireAuthenticatedAppUserOrRedirect();
  const { doctorId, patientId } = await resolveLinkedIds(appUser.id);
  const userContext = { id: appUser.id, role: appUser.role, email: appUser.email, doctorId, patientId };

  const locale = appUser.locale || "pt-BR";
  const t = await getTranslations("dashboard");
  const tCommon = await getTranslations("common");

  const [patients, doctors, appointments, reports, nextAppointments] = await Promise.all([
    db.patient.count({
      where: {
        deletedAt: null,
        ...buildPatientWhereClause(userContext),
      },
    }),
    appUser.role === "PATIENT"
      ? 0
      : db.doctor.count({
          where: {
            deletedAt: null,
            ...buildDoctorWhereClause(userContext),
          },
        }),
    db.appointment.count({
      where: {
        deletedAt: null,
        ...buildAppointmentWhereClause(userContext),
      },
    }),
    db.medicalReport.count({
      where: {
        deletedAt: null,
        ...buildMedicalReportWhereClause(userContext),
      },
    }),
    db.appointment.findMany({
      where: {
        deletedAt: null,
        ...buildAppointmentWhereClause(userContext),
        startsAt: { gte: new Date() },
      },
      include: {
        patient: true,
        doctor: true,
      },
      orderBy: { startsAt: "asc" },
      take: 6,
    }),
  ]);

  const cards = [
    { label: t("overview.cards.patients"), value: patients, href: "/dashboard/pacientes", icon: Users },
    ...(appUser.role !== "PATIENT"
      ? [{ label: t("overview.cards.doctors"), value: doctors, href: "/dashboard/medicos", icon: Stethoscope }]
      : []),
    { label: t("overview.cards.appointments"), value: appointments, href: "/dashboard/agenda", icon: CalendarDays },
    { label: t("overview.cards.reports"), value: reports, href: "/dashboard/laudos", icon: FileText },
  ];

  return (
    <>
      <PageHeader
        title={t("overview.title")}
        description={t("overview.description")}
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <Link key={card.href} href={card.href}>
              <Panel className="transition hover:border-teal-700">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-500">{card.label}</p>
                    <p className="mt-2 text-3xl font-semibold text-slate-950">{card.value}</p>
                  </div>
                  <div className="flex h-11 w-11 items-center justify-center rounded-md bg-teal-50 text-teal-800">
                    <Icon className="h-5 w-5" />
                  </div>
                </div>
              </Panel>
            </Link>
          );
        })}
      </div>

      <Panel className="mt-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-semibold">{t("overview.nextAppointments.title")}</h2>
          <Link href="/dashboard/agenda" className="text-sm font-semibold text-teal-800 hover:text-teal-950">
            {t("overview.nextAppointments.openAgenda")}
          </Link>
        </div>
        <div className="divide-y divide-slate-100">
          {nextAppointments.map((appointment) => (
            <div key={appointment.id} className="grid gap-2 py-3 sm:grid-cols-[160px_1fr_180px] sm:items-center">
              <p className="text-sm font-semibold text-slate-950">{formatTime(appointment.startsAt, locale)}</p>
              <div>
                <p className="text-sm font-medium">{appointment.patient.fullName}</p>
                <p className="text-xs text-slate-500">{appointment.doctor.fullName}</p>
              </div>
              <span className="w-fit rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
                {tCommon(`appointmentStatus.${appointment.status}`)}
              </span>
            </div>
          ))}
          {nextAppointments.length === 0 ? <p className="py-6 text-sm text-slate-500">{t("overview.nextAppointments.empty")}</p> : null}
        </div>
      </Panel>
    </>
  );
}
