import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { AppointmentStatus } from "@prisma/client";
import { Eye, Pencil, Trash2 } from "lucide-react";

import {
  cancelAppointment,
  searchRedirect,
  updateAppointment,
} from "@/actions/dashboard-actions";
import { buttonClass, Field, inputClass, PageHeader, Panel, secondaryButtonClass, textareaClass } from "@/components/dashboard/ui";
import { DoctorSelectField } from "@/components/dashboard/doctor-select-field";
import { AppointmentCreateForm } from "@/components/dashboard/appointment-create-form";
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

function formatDateTime(date: Date, locale: string) {
  return date.toLocaleString(locale === "en" ? "en-US" : "pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function buildAgendaHref({ q, editId, viewId }: { q?: string; editId?: string; viewId?: string }) {
  const search = new URLSearchParams();

  if (q) {
    search.set("q", q);
  }

  if (editId) {
    search.set("editId", editId);
  }

  if (viewId) {
    search.set("viewId", viewId);
  }

  const query = search.toString();
  return query ? `/dashboard/agenda?${query}` : "/dashboard/agenda";
}

export default async function AgendaPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; doctorId?: string; editId?: string; viewId?: string }>;
}) {
  const params = await searchParams;
  const q = params.q?.trim();
  const editId = params.editId?.trim();
  const viewId = params.viewId?.trim();

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
  const selectedAppointment = editId ? appointments.find((app) => app.id === editId) ?? null : null;
  const viewedAppointment = viewId ? appointments.find((app) => app.id === viewId) ?? null : null;

  return (
    <>
      <PageHeader title={t("title")} description={t("description")} />

      <div className={`grid gap-6 ${isReadOnly ? "grid-cols-1" : "xl:grid-cols-[380px_1fr]"}`}>
        {!isReadOnly && (
          <Panel>
            <h2 className="mb-4 text-base font-semibold">{t("form.newAppointment")}</h2>
            <AppointmentCreateForm
              patients={patients.map((p) => ({ id: p.id, fullName: p.fullName }))}
              doctors={doctors.map((d) => ({ id: d.id, fullName: d.fullName, specialty: d.specialty }))}
              patientLabel={t("form.patient")}
              doctorLabel={t("form.doctor")}
              startsAtLabel={t("form.startsAt")}
              durationLabel={t("form.duration")}
              statusLabel={t("form.status")}
              notesLabel={t("form.notes")}
              saveLabel={t("form.save")}
              loadingLabel={tCommon("actions.loading")}
              statusOptions={Object.fromEntries(
                Object.values(AppointmentStatus).map((s) => [s, tCommon(`appointmentStatus.${s}`)])
              )}
            />
          </Panel>
        )}

        <Panel className="min-w-0">
          <form action={searchRedirect} className="mb-4 flex flex-col gap-2 sm:flex-row">
            <input type="hidden" name="path" value="/dashboard/agenda" />
            <input name="q" defaultValue={q} placeholder={t("form.empty") ? "" : "Buscar..."} className={`${inputClass} flex-1`} />
            <button className={secondaryButtonClass}>{tCommon("actions.search")}</button>
          </form>

          <div className="overflow-x-auto rounded-lg border border-slate-200">
            <table className="min-w-full divide-y divide-slate-200 bg-white text-sm">
              <thead className="bg-slate-50 font-semibold text-slate-700">
                <tr>
                  <th className="px-4 py-3 text-left">{t("form.patient")}</th>
                  <th className="px-4 py-3 text-left">{t("form.doctor")}</th>
                  <th className="px-4 py-3 text-left">{t("form.startsAt")}</th>
                  <th className="px-4 py-3 text-left hidden sm:table-cell">{t("form.duration")}</th>
                  <th className="px-4 py-3 text-left">{t("form.status")}</th>
                  <th className="px-4 py-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-slate-600">
                {appointments.map((appointment) => (
                  <tr key={appointment.id} className="hover:bg-slate-50 transition">
                    <td className="px-4 py-3 font-medium text-slate-900">{appointment.patient.fullName}</td>
                    <td className="px-4 py-3">{appointment.doctor.fullName}</td>
                    <td className="px-4 py-3">{formatDateTime(appointment.startsAt, appUser.locale)}</td>
                    <td className="px-4 py-3 hidden sm:table-cell">{appointment.durationMinutes} min</td>
                    <td className="px-4 py-3">
                      <span className="inline-flex rounded-full bg-teal-50 px-2.5 py-0.5 text-xs font-semibold text-teal-800">
                        {tCommon(`appointmentStatus.${appointment.status}`)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          href={buildAgendaHref({ q, viewId: appointment.id })}
                          title={tCommon("actions.view")}
                          className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-slate-200 text-slate-700 transition hover:bg-slate-100"
                        >
                          <Eye className="h-4 w-4" />
                        </Link>
                        <Link
                          href={buildAgendaHref({ q, editId: appointment.id })}
                          title={tCommon("actions.edit")}
                          className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-amber-200 text-amber-700 transition hover:bg-amber-50"
                        >
                          <Pencil className="h-4 w-4" />
                        </Link>
                        <form action={cancelAppointment}>
                          <input type="hidden" name="id" value={appointment.id} />
                          <button
                            className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-rose-200 text-rose-700 transition hover:bg-rose-50"
                            title={t("actions.cancel") ? t("actions.cancel") : "Cancelar"}
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </form>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {appointments.length === 0 ? <p className="py-8 text-sm text-slate-500">{t("empty")}</p> : null}

          {selectedAppointment && (
            <div className="mt-6 rounded-md border border-slate-200 p-4 bg-white">
              <h3 className="mb-4 text-base font-semibold text-slate-900">{tCommon("actions.edit")}</h3>
              <form action={updateAppointment} className="grid gap-3">
                <input type="hidden" name="id" value={selectedAppointment.id} />
                
                <Field label={t("form.patient")}>
                  <select name="patientId" disabled className={inputClass}>
                    <option value={selectedAppointment.patient.id}>
                      {selectedAppointment.patient.fullName}
                    </option>
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
                    <input
                      name="startsAt"
                      type="datetime-local"
                      required
                      defaultValue={dateTimeLocal(selectedAppointment.startsAt)}
                      className={inputClass}
                    />
                  </Field>
                  <Field label={t("form.duration")}>
                    <input
                      name="durationMinutes"
                      type="number"
                      min="10"
                      step="5"
                      defaultValue={selectedAppointment.durationMinutes}
                      className={inputClass}
                    />
                  </Field>
                </div>

                <Field label={t("form.status")}>
                  <select
                    name="status"
                    defaultValue={selectedAppointment.status}
                    className={inputClass}
                  >
                    {Object.values(AppointmentStatus).map((status) => (
                      <option key={status} value={status}>
                        {tCommon(`appointmentStatus.${status}`)}
                      </option>
                    ))}
                  </select>
                </Field>

                <Field label={t("form.notes")}>
                  <textarea
                    name="notes"
                    defaultValue={selectedAppointment.notes ?? ""}
                    className={textareaClass}
                  />
                </Field>

                <div className="mt-2 flex items-center justify-end gap-2">
                  <a href={buildAgendaHref({ q })} className={secondaryButtonClass}>
                    {tCommon("actions.cancel")}
                  </a>
                  <button type="submit" className={buttonClass}>
                    {tCommon("actions.save")}
                  </button>
                </div>
              </form>
            </div>
          )}

          {viewedAppointment && !selectedAppointment && (
            <div className="mt-6 rounded-md border border-slate-200 p-4 bg-white">
              <h3 className="mb-4 text-base font-semibold text-slate-900">{tCommon("actions.view")}</h3>
              <dl className="grid gap-3 text-sm text-slate-700 sm:grid-cols-2">
                <div>
                  <dt className="text-slate-500">{t("form.patient")}</dt>
                  <dd className="font-medium text-slate-900">{viewedAppointment.patient.fullName}</dd>
                </div>
                <div>
                  <dt className="text-slate-500">{t("form.doctor")}</dt>
                  <dd className="font-medium text-slate-900">{viewedAppointment.doctor.fullName}</dd>
                </div>
                <div>
                  <dt className="text-slate-500">{t("form.startsAt")}</dt>
                  <dd>{formatDateTime(viewedAppointment.startsAt, appUser.locale)}</dd>
                </div>
                <div>
                  <dt className="text-slate-500">{t("form.duration")}</dt>
                  <dd>{viewedAppointment.durationMinutes} min</dd>
                </div>
                <div>
                  <dt className="text-slate-500">{t("form.status")}</dt>
                  <dd className="inline-flex rounded-full bg-teal-50 px-2.5 py-0.5 text-xs font-semibold text-teal-800">
                    {tCommon(`appointmentStatus.${viewedAppointment.status}`)}
                  </dd>
                </div>
              </dl>
              {viewedAppointment.notes && (
                <div className="mt-4 rounded-md border border-slate-200 p-3 bg-slate-50">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                    {t("form.notes")}
                  </p>
                  <p className="text-sm text-slate-700 whitespace-pre-wrap">{viewedAppointment.notes}</p>
                </div>
              )}
              <div className="mt-4 flex justify-end">
                <a href={buildAgendaHref({ q })} className={secondaryButtonClass}>
                  {tCommon("actions.close")}
                </a>
              </div>
            </div>
          )}
        </Panel>
      </div>
    </>
  );
}
