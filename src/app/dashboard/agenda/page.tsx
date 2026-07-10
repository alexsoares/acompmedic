import { getTranslations } from "next-intl/server";
import { AppointmentStatus } from "@prisma/client";

import {
  cancelAppointment,
  createAppointment,
  searchRedirect,
  updateAppointment,
} from "@/actions/dashboard-actions";
import { buttonClass, Field, inputClass, PageHeader, Panel, secondaryButtonClass, textareaClass } from "@/components/dashboard/ui";
import { DoctorSelectField } from "@/components/dashboard/doctor-select-field";
import { db } from "@/server/db";
import { requireAuthenticatedAppUserOrRedirect } from "@/server/security/auth";
import {
  buildAppointmentWhereClause,
  buildDoctorWhereClause,
  buildPatientWhereClause,
  resolveLinkedIds,
} from "@/server/security/authorize";

function dateTimeLocal(date: Date) {
  return date.toISOString().slice(0, 16);
}

export default async function AgendaPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; doctorId?: string }>;
}) {
  const params = await searchParams;
  const q = params.q?.trim();
  const appUser = await requireAuthenticatedAppUserOrRedirect();
  const { doctorId, patientId } = await resolveLinkedIds(appUser.id);
  const userContext = { id: appUser.id, role: appUser.role, email: appUser.email, doctorId, patientId };

  const t = await getTranslations("appointments");
  const tCommon = await getTranslations("common");

  const [appointments, patients, doctors] = await Promise.all([
    db.appointment.findMany({
      where: {
        deletedAt: null,
        ...buildAppointmentWhereClause(userContext),
        doctorId: params.doctorId || undefined,
        OR: q
          ? [
              { patient: { fullName: { contains: q, mode: "insensitive" } } },
              { doctor: { fullName: { contains: q, mode: "insensitive" } } },
            ]
          : undefined,
      },
      include: { patient: true, doctor: true },
      orderBy: { startsAt: "asc" },
      take: 80,
    }),
    db.patient.findMany({
      where: {
        deletedAt: null,
        ...buildPatientWhereClause(userContext),
      },
      orderBy: { fullName: "asc" },
    }),
    db.doctor.findMany({
      where: {
        deletedAt: null,
        ...buildDoctorWhereClause(userContext),
      },
      orderBy: { fullName: "asc" },
    }),
  ]);

  const isReadOnly = false;

  return (
    <>
      <PageHeader title={t("title")} description={t("description")} />

      <div className={`grid gap-6 ${isReadOnly ? "grid-cols-1" : "xl:grid-cols-[380px_1fr]"}`}>
        {!isReadOnly && (
          <Panel>
            <h2 className="mb-4 text-base font-semibold">{t("form.newAppointment")}</h2>
            <form action={createAppointment} className="grid gap-3">
              <Field label={t("form.patient")}>
                <select name="patientId" required className={inputClass}>
                  <option value="">{tCommon("actions.loading")}</option>
                  {patients.map((patient) => (
                    <option key={patient.id} value={patient.id}>
                      {patient.fullName}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label={t("form.doctor")}>
                <DoctorSelectField
                  initialDoctors={doctors.map((d) => ({
                    id: d.id,
                    fullName: d.fullName,
                    specialty: d.specialty,
                  }))}
                  loadingLabel={tCommon("actions.loading")}
                />
              </Field>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label={t("form.startsAt")}>
                  <input name="startsAt" type="datetime-local" required className={inputClass} />
                </Field>
                <Field label={t("form.duration")}>
                  <input name="durationMinutes" type="number" min="10" step="5" defaultValue="30" className={inputClass} />
                </Field>
              </div>
              <Field label={t("form.status")}>
                <select name="status" defaultValue={AppointmentStatus.SCHEDULED} className={inputClass}>
                  {Object.values(AppointmentStatus).map((status) => (
                    <option key={status} value={status}>
                      {tCommon(`appointmentStatus.${status}`)}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label={t("form.notes")}>
                <textarea name="notes" className={textareaClass} />
              </Field>
              <button className={buttonClass}>{t("form.save")}</button>
            </form>
          </Panel>
        )}

        <Panel>
          <form action={searchRedirect} className="mb-4 flex flex-col gap-2 sm:flex-row">
            <input type="hidden" name="path" value="/dashboard/agenda" />
            <input name="q" defaultValue={q} placeholder={t("form.empty") ? "" : "Buscar..."} className={`${inputClass} flex-1`} />
            <button className={secondaryButtonClass}>{tCommon("actions.search")}</button>
          </form>

          <div className="space-y-3">
            {appointments.map((appointment) => (
              <form key={appointment.id} action={updateAppointment} className="rounded-md border border-slate-200 p-3">
                <input type="hidden" name="id" value={appointment.id} />
                <div className="grid gap-3 lg:grid-cols-[1.1fr_1.1fr_170px_140px_120px] lg:items-end">
                  <div>
                    <p className="text-sm font-semibold">{appointment.patient.fullName}</p>
                    <p className="text-xs text-slate-500">{appointment.doctor.fullName}</p>
                  </div>
                  <Field label={t("form.startsAt")}>
                    <input name="startsAt" type="datetime-local" defaultValue={dateTimeLocal(appointment.startsAt)} readOnly={isReadOnly} className={inputClass} />
                  </Field>
                  <Field label={t("form.duration")}>
                    <input name="durationMinutes" type="number" defaultValue={appointment.durationMinutes} readOnly={isReadOnly} className={inputClass} />
                  </Field>
                  <Field label={t("form.status")}>
                    <select name="status" defaultValue={appointment.status} disabled={isReadOnly} className={inputClass}>
                      {Object.values(AppointmentStatus).map((status) => (
                        <option key={status} value={status}>
                          {tCommon(`appointmentStatus.${status}`)}
                        </option>
                      ))}
                    </select>
                  </Field>
                  {!isReadOnly && <button className={buttonClass}>{tCommon("actions.save")}</button>}
                </div>
                <div className="mt-3 grid gap-3 lg:grid-cols-[1fr_120px]">
                  <textarea name="notes" defaultValue={appointment.notes ?? ""} readOnly={isReadOnly} className={textareaClass} />
                  {!isReadOnly && (
                    <button formAction={cancelAppointment} className="h-10 rounded-md border border-rose-200 bg-rose-50 px-4 text-sm font-semibold text-rose-700">
                      {t("actions.cancel")}
                    </button>
                  )}
                </div>
              </form>
            ))}
            {appointments.length === 0 ? <p className="py-8 text-sm text-slate-500">{t("empty")}</p> : null}
          </div>
        </Panel>
      </div>
    </>
  );
}
