import Link from "next/link";
import { getTranslations } from "next-intl/server";

import {
  authorizeMedicalReportViewer,
  createMedicalReport,
  createPatientMedicalReport,
  deleteMedicalReport,
  searchRedirect,
} from "@/actions/dashboard-actions";
import { buttonClass, Field, inputClass, PageHeader, Panel, secondaryButtonClass, textareaClass } from "@/components/dashboard/ui";
import { formatBytes } from "@/lib/utils";
import { db } from "@/server/db";
import { requireAuthenticatedAppUserOrRedirect } from "@/server/security/auth";
import {
  buildAppointmentWhereClause,
  buildDoctorWhereClause,
  buildMedicalReportWhereClause,
  buildPatientWhereClause,
  resolveLinkedIds,
} from "@/server/security/authorize";

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; uploadStatus?: string; uploadMessage?: string }>;
}) {
  const params = await searchParams;
  const q = params.q?.trim();
  const uploadStatus = params.uploadStatus === "success" || params.uploadStatus === "error" ? params.uploadStatus : null;
  const uploadMessage = params.uploadMessage?.trim() || null;
  const appUser = await requireAuthenticatedAppUserOrRedirect();
  const { doctorId, patientId } = await resolveLinkedIds(appUser.id);
  const userContext = { id: appUser.id, role: appUser.role, email: appUser.email, doctorId, patientId };

  const t = await getTranslations("reports");
  const tCommon = await getTranslations("common");
  const locale = appUser.locale || "pt-BR";

  const [reports, patients, doctors, appointments, patientContext, allDoctors] = await Promise.all([
    db.medicalReport.findMany({
      where: {
        deletedAt: null,
        ...buildMedicalReportWhereClause(userContext),
        OR: q
          ? [
              { title: { contains: q, mode: "insensitive" } },
              { patient: { fullName: { contains: q, mode: "insensitive" } } },
              { doctor: { fullName: { contains: q, mode: "insensitive" } } },
              { specialty: { contains: q, mode: "insensitive" } },
            ]
          : undefined,
      },
      include: {
        patient: true,
        doctor: true,
        accessGrants: {
          where: { deletedAt: null },
          include: { doctor: true },
          orderBy: { createdAt: "desc" },
        },
        attachments: {
          where: { isCurrent: true, deletedAt: null },
          orderBy: { version: "desc" },
          take: 1,
        },
      },
      orderBy: { reportDate: "desc" },
      take: 80,
    }),
    appUser.role !== "PATIENT"
      ? db.patient.findMany({
          where: {
            deletedAt: null,
            ...buildPatientWhereClause(userContext),
          },
          orderBy: { fullName: "asc" },
        })
      : [],
    appUser.role !== "PATIENT"
      ? db.doctor.findMany({
          where: {
            deletedAt: null,
            ...buildDoctorWhereClause(userContext),
          },
          orderBy: { fullName: "asc" },
        })
      : [],
    appUser.role !== "PATIENT"
      ? db.appointment.findMany({
          where: {
            deletedAt: null,
            ...buildAppointmentWhereClause(userContext),
          },
          include: { patient: true, doctor: true },
          orderBy: { startsAt: "desc" },
          take: 80,
        })
      : [],
    appUser.role === "PATIENT" && patientId
      ? db.patient.findFirst({
          where: {
            id: patientId,
            deletedAt: null,
          },
          include: {
            assignedDoctor: true,
            appointments: {
              where: { deletedAt: null },
              include: { doctor: true },
              orderBy: { startsAt: "desc" },
              take: 30,
            },
          },
        })
      : null,
    appUser.role === "PATIENT"
      ? db.doctor.findMany({
          where: { deletedAt: null },
          orderBy: { fullName: "asc" },
        })
      : [],
  ]);

  const isReadOnly = appUser.role === "PATIENT";
  const availableDoctors = patientContext
    ? [
        ...(patientContext.assignedDoctor ? [patientContext.assignedDoctor] : []),
        ...patientContext.appointments.map((appointment) => appointment.doctor),
      ].filter((doctor, index, allDoctors) => allDoctors.findIndex((current) => current.id === doctor.id) === index)
    : [];
  const patientUploadReturnPath = q ? `/dashboard/laudos?q=${encodeURIComponent(q)}` : "/dashboard/laudos";

  return (
    <>
      <PageHeader title={t("title")} description={t("description")} />

      {uploadStatus && uploadMessage && (
        <div
          className={`mb-4 rounded-md border px-4 py-3 text-sm ${
            uploadStatus === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-800"
              : "border-rose-200 bg-rose-50 text-rose-700"
          }`}
        >
          {uploadMessage}
        </div>
      )}

      <div className={`grid gap-6 ${isReadOnly ? "xl:grid-cols-[400px_1fr]" : "xl:grid-cols-[400px_1fr]"}`}>
        {!isReadOnly && (
          <Panel>
            <h2 className="mb-4 text-base font-semibold">{t("form.newReport")}</h2>
            <form action={createMedicalReport} className="grid gap-3">
              <Field label={t("form.title")}>
                <input name="title" required className={inputClass} />
              </Field>
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
                <select name="doctorId" required className={inputClass}>
                  <option value="">{tCommon("actions.loading")}</option>
                  {doctors.map((doctor) => (
                    <option key={doctor.id} value={doctor.id}>
                      {doctor.fullName}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label={t("form.appointment")}>
                <select name="appointmentId" className={inputClass}>
                  <option value="">{tCommon("empty.noResults") ? "Sem consulta" : ""}</option>
                  {appointments.map((appointment) => (
                    <option key={appointment.id} value={appointment.id}>
                      {appointment.patient.fullName} - {appointment.doctor.fullName}
                    </option>
                  ))}
                </select>
              </Field>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label={t("form.specialty")}>
                  <input name="specialty" required className={inputClass} />
                </Field>
                <Field label={t("form.reportDate")}>
                  <input name="reportDate" type="date" className={inputClass} />
                </Field>
              </div>
              <Field label={t("form.file")}>
                <input
                  name="file"
                  type="file"
                  required
                  accept=".pdf,.txt,application/pdf,text/plain"
                  className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
                />
              </Field>
              <Field label={t("form.observations")}>
                <textarea name="observations" className={textareaClass} />
              </Field>
              <button className={buttonClass}>{t("form.save")}</button>
            </form>
          </Panel>
        )}

        {isReadOnly && (
          <Panel>
            <h2 className="mb-4 text-base font-semibold">Anexar novo laudo/exame</h2>
            {patientContext && availableDoctors.length > 0 ? (
              <form action={createPatientMedicalReport} className="grid gap-3">
                <input type="hidden" name="patientId" value={patientContext.id} />
                <input type="hidden" name="returnPath" value={patientUploadReturnPath} />
                <Field label={t("form.title")}>
                  <input name="title" required className={inputClass} />
                </Field>
                <Field label={t("form.doctor")}>
                  <select name="doctorId" required className={inputClass}>
                    <option value="">Selecione</option>
                    {availableDoctors.map((doctor) => (
                      <option key={doctor.id} value={doctor.id}>
                        {doctor.fullName} ({doctor.specialty})
                      </option>
                    ))}
                  </select>
                </Field>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label={t("form.specialty")}>
                    <input name="specialty" required className={inputClass} />
                  </Field>
                  <Field label={t("form.reportDate")}>
                    <input name="reportDate" type="date" className={inputClass} />
                  </Field>
                </div>
                <Field label={t("form.file")}>
                  <input
                    name="file"
                    type="file"
                    required
                    accept=".pdf,.txt,application/pdf,text/plain"
                    className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
                  />
                </Field>
                <Field label={t("form.observations")}>
                  <textarea name="observations" className={textareaClass} />
                </Field>
                <button className={buttonClass}>Enviar laudo</button>
              </form>
            ) : (
              <p className="text-sm text-slate-500">Nenhum médico vinculado foi encontrado para associar este envio.</p>
            )}
          </Panel>
        )}

        <Panel>
          <form action={searchRedirect} className="mb-4 flex flex-col gap-2 sm:flex-row">
            <input type="hidden" name="path" value="/dashboard/laudos" />
            <input name="q" defaultValue={q} placeholder={t("form.save") ? "Buscar..." : ""} className={`${inputClass} flex-1`} />
            <button className={secondaryButtonClass}>{tCommon("actions.search")}</button>
          </form>

          <div className="space-y-3">
            {reports.map((report) => {
              const attachment = report.attachments[0];
              const alreadyAuthorizedDoctorIds = new Set(report.accessGrants.map((grant) => grant.doctorId));
              const authorizationCandidates = allDoctors.filter(
                (doctor) => doctor.id !== report.doctorId && !alreadyAuthorizedDoctorIds.has(doctor.id),
              );
              return (
                <div key={report.id} className="rounded-md border border-slate-200 p-4">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div className="space-y-1">
                      <h2 className="text-base font-semibold">{report.title}</h2>
                      <p className="text-sm text-slate-600">
                        {report.patient.fullName} - {report.doctor.fullName} - {report.specialty}
                      </p>
                      <p className="text-xs text-slate-500">
                        {new Intl.DateTimeFormat(locale).format(report.reportDate)}
                        {attachment ? ` - ${attachment.originalName} (${formatBytes(attachment.sizeBytes)})` : ""}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {attachment ? (
                        <>
                          <Link href={`/api/reports/${report.id}/view`} className={secondaryButtonClass}>
                            {t("actions.view")}
                          </Link>
                          <Link href={`/api/reports/${report.id}/download`} className={secondaryButtonClass}>
                            {t("actions.download")}
                          </Link>
                        </>
                      ) : null}
                      {!isReadOnly && (
                        <form action={deleteMedicalReport}>
                          <input type="hidden" name="id" value={report.id} />
                          <button className="h-10 rounded-md border border-rose-200 bg-rose-50 px-4 text-sm font-semibold text-rose-700">
                            {t("actions.delete")}
                          </button>
                        </form>
                      )}
                    </div>
                  </div>
                  {report.observations ? <p className="mt-3 text-sm leading-6 text-slate-600">{report.observations}</p> : null}

                  {isReadOnly && (
                    <div className="mt-4 space-y-3 border-t border-slate-100 pt-4">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Medicos autorizados para visualizacao</p>
                        {report.accessGrants.length > 0 ? (
                          <p className="mt-1 text-sm text-slate-700">
                            {report.accessGrants.map((grant) => `${grant.doctor.fullName} (${grant.doctor.specialty})`).join("; ")}
                          </p>
                        ) : (
                          <p className="mt-1 text-sm text-slate-500">Nenhum medico extra autorizado.</p>
                        )}
                      </div>

                      {authorizationCandidates.length > 0 ? (
                        <form action={authorizeMedicalReportViewer} className="grid gap-2 sm:grid-cols-[1fr_auto]">
                          <input type="hidden" name="reportId" value={report.id} />
                          <input type="hidden" name="returnPath" value={patientUploadReturnPath} />
                          <select name="doctorId" required className={inputClass}>
                            <option value="">Autorizar outro medico...</option>
                            {authorizationCandidates.map((doctor) => (
                              <option key={doctor.id} value={doctor.id}>
                                {doctor.fullName} ({doctor.specialty})
                              </option>
                            ))}
                          </select>
                          <button className={secondaryButtonClass}>Autorizar visualizacao</button>
                        </form>
                      ) : (
                        <p className="text-sm text-slate-500">Todos os medicos disponiveis ja foram autorizados para este laudo.</p>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
            {reports.length === 0 ? <p className="py-8 text-sm text-slate-500">{t("empty")}</p> : null}
          </div>
        </Panel>
      </div>
    </>
  );
}
