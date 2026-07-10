import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Eye, Download, Trash2 } from "lucide-react";

import {
  authorizeMedicalReportViewer,
  deleteMedicalReport,
  revokeMedicalReportViewer,
  searchRedirect,
} from "@/actions/dashboard-actions";
import { inputClass, PageHeader, Panel, secondaryButtonClass } from "@/components/dashboard/ui";
import { AdminReportForm } from "@/components/dashboard/admin-report-form";
import { PatientReportForm } from "@/components/dashboard/patient-report-form";
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

function buildReportsHref({ q, viewId }: { q?: string; viewId?: string }) {
  const search = new URLSearchParams();

  if (q) {
    search.set("q", q);
  }

  if (viewId) {
    search.set("viewId", viewId);
  }

  const query = search.toString();
  return query ? `/dashboard/laudos?${query}` : "/dashboard/laudos";
}

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; uploadStatus?: string; uploadMessage?: string; viewId?: string }>;
}) {
  const params = await searchParams;
  const q = params.q?.trim();
  const viewId = params.viewId?.trim();
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
  const patientUploadReturnPath = q ? `/dashboard/laudos?q=${encodeURIComponent(q)}` : "/dashboard/laudos";
  const viewedReport = viewId ? reports.find((r) => r.id === viewId) ?? null : null;

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

      <div className="grid gap-6 xl:grid-cols-[400px_1fr]">
        {!isReadOnly && (
          <Panel>
            <h2 className="mb-4 text-base font-semibold">{t("form.newReport")}</h2>
            <AdminReportForm
              patients={patients.map((p) => ({ id: p.id, fullName: p.fullName }))}
              doctors={doctors.map((d) => ({ id: d.id, fullName: d.fullName, specialty: d.specialty }))}
              appointments={appointments.map((a) => ({
                id: a.id,
                patientFullName: a.patient.fullName,
                doctorFullName: a.doctor.fullName,
              }))}
              labels={{
                title: t("form.title"),
                patient: t("form.patient"),
                doctor: t("form.doctor"),
                appointment: t("form.appointment"),
                specialty: t("form.specialty"),
                reportDate: t("form.reportDate"),
                file: t("form.file"),
                observations: t("form.observations"),
                save: t("form.save"),
                loading: tCommon("actions.loading"),
                noAppointment: "Sem consulta",
              }}
            />
          </Panel>
        )}

        {isReadOnly && patientContext && (
          <Panel>
            <h2 className="mb-4 text-base font-semibold">Anexar novo laudo/exame</h2>
            <PatientReportForm
              patientId={patientContext.id}
              returnPath={patientUploadReturnPath}
              availableDoctors={[
                ...(patientContext.assignedDoctor ? [patientContext.assignedDoctor] : []),
                ...patientContext.appointments.map((a) => a.doctor),
              ].filter((d, i, arr) => arr.findIndex((x) => x.id === d.id) === i)}
            />
          </Panel>
        )}

        <Panel className="min-w-0">
          <form action={searchRedirect} className="mb-4 flex flex-col gap-2 sm:flex-row">
            <input type="hidden" name="path" value="/dashboard/laudos" />
            <input name="q" defaultValue={q} placeholder={t("form.save") ? "Buscar..." : ""} className={`${inputClass} flex-1`} />
            <button className={secondaryButtonClass}>{tCommon("actions.search")}</button>
          </form>

          <div className="overflow-x-auto rounded-lg border border-slate-200">
            <table className="min-w-full divide-y divide-slate-200 bg-white text-sm">
              <thead className="bg-slate-50 font-semibold text-slate-700">
                <tr>
                  <th className="px-4 py-3 text-left">{t("form.title")}</th>
                  <th className="px-4 py-3 text-left">{t("form.patient")}</th>
                  <th className="px-4 py-3 text-left">{t("form.doctor")}</th>
                  <th className="px-4 py-3 text-left hidden sm:table-cell">{t("form.specialty")}</th>
                  <th className="px-4 py-3 text-left hidden md:table-cell">{t("form.reportDate")}</th>
                  <th className="px-4 py-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-slate-600">
                {reports.map((report) => {
                  const attachment = report.attachments[0];
                  return (
                    <tr key={report.id} className="hover:bg-slate-50 transition">
                      <td className="px-4 py-3 font-medium text-slate-900">
                        <div>
                          {report.title}
                          {attachment && (
                            <span className="ml-2 inline-flex items-center text-xs text-slate-500 font-normal">
                              ({formatBytes(attachment.sizeBytes)})
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">{report.patient.fullName}</td>
                      <td className="px-4 py-3">{report.doctor.fullName}</td>
                      <td className="px-4 py-3 hidden sm:table-cell">{report.specialty}</td>
                      <td className="px-4 py-3 hidden md:table-cell">
                        {new Intl.DateTimeFormat(locale).format(report.reportDate)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-2">
                          <Link
                            href={buildReportsHref({ q, viewId: report.id })}
                            title={t("actions.view")}
                            className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-slate-200 text-slate-700 transition hover:bg-slate-100"
                          >
                            <Eye className="h-4 w-4" />
                          </Link>
                          {attachment && (
                            <Link
                              href={`/api/reports/${report.id}/download`}
                              title={t("actions.download")}
                              className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-slate-200 text-slate-700 transition hover:bg-slate-100"
                            >
                              <Download className="h-4 w-4" />
                            </Link>
                          )}
                          {!isReadOnly && (
                            <form action={deleteMedicalReport}>
                              <input type="hidden" name="id" value={report.id} />
                              <button
                                className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-rose-200 text-rose-700 transition hover:bg-rose-50"
                                title={t("actions.delete")}
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </form>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {reports.length === 0 ? <p className="py-8 text-sm text-slate-500">{t("empty")}</p> : null}

          {viewedReport && (
            <div className="mt-6 rounded-md border border-slate-200 p-4 bg-white">
              <h3 className="mb-4 text-base font-semibold text-slate-900">Detalhes do Laudo</h3>
              
              <dl className="grid gap-3 text-sm text-slate-700 sm:grid-cols-2">
                <div>
                  <dt className="text-slate-500">Título</dt>
                  <dd className="font-semibold text-slate-900">{viewedReport.title}</dd>
                </div>
                <div>
                  <dt className="text-slate-500">Paciente</dt>
                  <dd>{viewedReport.patient.fullName}</dd>
                </div>
                <div>
                  <dt className="text-slate-500">Médico Emissor</dt>
                  <dd>{viewedReport.doctor.fullName}</dd>
                </div>
                <div>
                  <dt className="text-slate-500">Especialidade</dt>
                  <dd>{viewedReport.specialty}</dd>
                </div>
                <div>
                  <dt className="text-slate-500">Data de Emissão</dt>
                  <dd>{new Intl.DateTimeFormat(locale).format(viewedReport.reportDate)}</dd>
                </div>
                {viewedReport.attachments[0] && (
                  <div>
                    <dt className="text-slate-500">Arquivo Anexo</dt>
                    <dd>
                      <a 
                        href={`/api/reports/${viewedReport.id}/view`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-teal-700 font-semibold hover:underline"
                      >
                        Visualizar Documento ({formatBytes(viewedReport.attachments[0].sizeBytes)})
                      </a>
                    </dd>
                  </div>
                )}
              </dl>

              {viewedReport.observations && (
                <div className="mt-4 rounded-md border border-slate-200 p-3 bg-slate-50">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                    Observações
                  </p>
                  <p className="text-sm text-slate-700 whitespace-pre-wrap">{viewedReport.observations}</p>
                </div>
              )}

              {isReadOnly && (
                <div className="mt-6 border-t border-slate-100 pt-4">
                  <h4 className="text-sm font-semibold text-slate-900 mb-2">
                    Médicos autorizados para visualização
                  </h4>
                  
                  {viewedReport.accessGrants.length > 0 ? (
                    <div className="mb-4 space-y-2">
                      {viewedReport.accessGrants.map((grant) => (
                        <div key={grant.id} className="flex items-center justify-between rounded-md border border-slate-100 bg-slate-50 p-2.5 text-sm text-slate-700">
                          <span>{grant.doctor.fullName} ({grant.doctor.specialty})</span>
                          <form action={revokeMedicalReportViewer}>
                            <input type="hidden" name="reportId" value={viewedReport.id} />
                            <input type="hidden" name="doctorId" value={grant.doctorId} />
                            <input type="hidden" name="returnPath" value={buildReportsHref({ q, viewId: viewedReport.id })} />
                            <button className="text-xs font-semibold text-rose-600 hover:text-rose-800 hover:underline">
                              Revogar
                            </button>
                          </form>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="mb-4 text-sm text-slate-500">Nenhum médico extra autorizado.</p>
                  )}

                  {(() => {
                    const alreadyAuthorizedDoctorIds = new Set(viewedReport.accessGrants.map((grant) => grant.doctorId));
                    const authorizationCandidates = allDoctors.filter(
                      (doctor) => doctor.id !== viewedReport.doctorId && !alreadyAuthorizedDoctorIds.has(doctor.id),
                    );

                    if (authorizationCandidates.length > 0) {
                      return (
                        <form action={authorizeMedicalReportViewer} className="grid gap-2 sm:grid-cols-[1fr_auto]">
                          <input type="hidden" name="reportId" value={viewedReport.id} />
                          <input type="hidden" name="returnPath" value={buildReportsHref({ q, viewId: viewedReport.id })} />
                          <select name="doctorId" required className={inputClass}>
                            <option value="">Autorizar outro médico...</option>
                            {authorizationCandidates.map((doctor) => (
                              <option key={doctor.id} value={doctor.id}>
                                {doctor.fullName} ({doctor.specialty})
                              </option>
                            ))}
                          </select>
                          <button className={secondaryButtonClass}>Autorizar visualização</button>
                        </form>
                      );
                    } else if (allDoctors.filter((d) => d.id !== viewedReport.doctorId).length === 0) {
                      return <p className="text-sm text-slate-500">Não há outros médicos cadastrados no sistema.</p>;
                    } else {
                      return <p className="text-sm text-slate-500">Todos os médicos disponíveis já foram autorizados para este laudo.</p>;
                    }
                  })()}
                </div>
              )}

              <div className="mt-6 flex justify-end">
                <a href={buildReportsHref({ q })} className={secondaryButtonClass}>
                  Fechar Detalhes
                </a>
              </div>
            </div>
          )}
        </Panel>
      </div>
    </>
  );
}
