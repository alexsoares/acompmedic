import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { CalendarDays, FileText, ArrowLeft, Phone, Mail, MapPin, User } from "lucide-react";

import { Panel, secondaryButtonClass } from "@/components/dashboard/ui";
import { PatientReportForm } from "@/components/dashboard/patient-report-form";
import { db } from "@/server/db";
import { requireAuthenticatedAppUserOrRedirect } from "@/server/security/auth";
import { buildPatientWhereClause, resolveLinkedIds, ForbiddenError } from "@/server/security/authorize";
import { formatBytes } from "@/lib/utils";

function calculateAge(birthDate: Date | null): number | null {
  if (!birthDate) return null;
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const m = today.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
}

export default async function PatientDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ uploadStatus?: string; uploadMessage?: string }>;
}) {
  const { id } = await params;
  const query = await searchParams;
  const appUser = await requireAuthenticatedAppUserOrRedirect();
  const { doctorId, patientId } = await resolveLinkedIds(appUser.id);
  const userContext = { id: appUser.id, role: appUser.role, email: appUser.email, doctorId, patientId };

  const t = await getTranslations("patients");
  const tCommon = await getTranslations("common");
  const locale = appUser.locale || "pt-BR";
  const uploadStatus = query.uploadStatus === "success" || query.uploadStatus === "error" ? query.uploadStatus : null;
  const uploadMessage = query.uploadMessage?.trim() || null;

  const patient = await db.patient.findFirst({
    where: {
      id,
      deletedAt: null,
      ...buildPatientWhereClause(userContext),
    },
    include: {
      assignedDoctor: true,
      appointments: {
        where: { deletedAt: null },
        include: { doctor: true },
        orderBy: { startsAt: "desc" },
      },
      medicalReports: {
        where: { deletedAt: null },
        include: {
          doctor: true,
          attachments: {
            where: { isCurrent: true, deletedAt: null },
            orderBy: { version: "desc" },
            take: 1,
          },
        },
        orderBy: { reportDate: "desc" },
      },
    },
  });

  if (!patient) {
    throw new ForbiddenError("Paciente não encontrado ou sem permissão de acesso.");
  }

  const age = calculateAge(patient.birthDate);
  const availableDoctors = [
    ...(patient.assignedDoctor ? [patient.assignedDoctor] : []),
    ...patient.appointments.map((appointment) => appointment.doctor),
  ].filter((doctor, index, doctors) => doctors.findIndex((current) => current.id === doctor.id) === index);

  return (
    <>
      <div className="mb-4">
        {appUser.role !== "PATIENT" && (
          <Link
            href="/dashboard/pacientes"
            className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-slate-800 transition"
          >
            <ArrowLeft className="h-4 w-4" />
            {tCommon("actions.back") || "Voltar para lista"}
          </Link>
        )}
      </div>

      <div className="mb-6 rounded-lg bg-gradient-to-r from-teal-800 to-cyan-900 p-6 text-white shadow-md">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <span className="rounded bg-teal-600/50 px-2.5 py-1 text-xs font-semibold uppercase tracking-wider text-teal-100">
              Prontuário Médico
            </span>
            <h1 className="mt-2 text-3xl font-bold tracking-tight">{patient.fullName}</h1>
            <p className="mt-1 text-sm text-teal-100">
              {patient.cpf ? `CPF: ${patient.cpf}` : ""}
              {age !== null ? ` • ${age} ${tCommon("age") || "anos"}` : ""}
              {patient.gender ? ` • ${tCommon(`gender.${patient.gender}`)}` : ""}
            </p>
          </div>
          {patient.assignedDoctor && (
            <div className="rounded-md bg-white/10 px-4 py-3 backdrop-blur-sm">
              <p className="text-xs text-teal-200">Médico Responsável</p>
              <p className="font-semibold text-white">{patient.assignedDoctor.fullName}</p>
              <p className="text-xs text-teal-100">{patient.assignedDoctor.specialty}</p>
            </div>
          )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Prontuário / Dados Pessoais */}
        <div className="space-y-6 lg:col-span-1">
          <Panel>
            <h2 className="mb-4 flex items-center gap-2 text-base font-semibold text-slate-900">
              <User className="h-5 w-5 text-teal-700" />
              {t("form.newPatient") ? "Dados Cadastrais" : "Dados"}
            </h2>
            <div className="space-y-4">
              {patient.email && (
                <div className="flex items-start gap-3">
                  <Mail className="h-5 w-5 text-slate-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs text-slate-500">{t("form.email")}</p>
                    <p className="text-sm font-medium text-slate-900">{patient.email}</p>
                  </div>
                </div>
              )}
              {patient.phone && (
                <div className="flex items-start gap-3">
                  <Phone className="h-5 w-5 text-slate-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs text-slate-500">{t("form.phone")}</p>
                    <p className="text-sm font-medium text-slate-900">{patient.phone}</p>
                  </div>
                </div>
              )}
              {patient.address && (
                <div className="flex items-start gap-3">
                  <MapPin className="h-5 w-5 text-slate-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs text-slate-500">{t("form.address")}</p>
                    <p className="text-sm font-medium text-slate-900">{patient.address}</p>
                  </div>
                </div>
              )}
              {patient.notes && (
                <div className="mt-4 rounded-md bg-slate-50 p-3 border border-slate-100">
                  <p className="text-xs font-semibold text-slate-600 mb-1">Observações Clínicas</p>
                  <p className="text-sm text-slate-700 whitespace-pre-wrap">{patient.notes}</p>
                </div>
              )}
            </div>
          </Panel>
        </div>

        {/* Consultas e Laudos */}
        <div className="space-y-6 lg:col-span-2">
          {uploadStatus && uploadMessage && appUser.role === "PATIENT" && (
            <div
              className={`rounded-md border px-4 py-3 text-sm ${
                uploadStatus === "success"
                  ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                  : "border-rose-200 bg-rose-50 text-rose-700"
              }`}
            >
              {uploadMessage}
            </div>
          )}

          {appUser.role === "PATIENT" && (
            <Panel>
              <h2 className="mb-4 flex items-center gap-2 text-base font-semibold text-slate-900">
                <FileText className="h-5 w-5 text-teal-700" />
                Anexar novo laudo/exame
              </h2>
              <PatientReportForm
                patientId={patient.id}
                returnPath={`/dashboard/pacientes/${patient.id}`}
                availableDoctors={availableDoctors}
              />
            </Panel>
          )}

          {/* Histórico de Consultas */}
          <Panel>
            <h2 className="mb-4 flex items-center gap-2 text-base font-semibold text-slate-900">
              <CalendarDays className="h-5 w-5 text-teal-700" />
              Histórico de Consultas
            </h2>
            <div className="divide-y divide-slate-100">
              {patient.appointments.map((appointment) => (
                <div key={appointment.id} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">
                      {new Intl.DateTimeFormat(locale, {
                        dateStyle: "long",
                        timeStyle: "short",
                      }).format(appointment.startsAt)}
                    </p>
                    <p className="text-xs text-slate-500">
                      Dr(a). {appointment.doctor.fullName} ({appointment.doctor.specialty})
                    </p>
                    {appointment.notes && (
                      <p className="mt-1 text-xs text-slate-600 italic">&ldquo;{appointment.notes}&rdquo;</p>
                    )}
                  </div>
                  <span className="w-fit rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
                    {tCommon(`appointmentStatus.${appointment.status}`)}
                  </span>
                </div>
              ))}
              {patient.appointments.length === 0 && (
                <p className="py-4 text-sm text-slate-500">Nenhuma consulta registrada.</p>
              )}
            </div>
          </Panel>

          {/* Laudos Médicos */}
          <Panel>
            <h2 className="mb-4 flex items-center gap-2 text-base font-semibold text-slate-900">
              <FileText className="h-5 w-5 text-teal-700" />
              Laudos e Exames
            </h2>
            <div className="space-y-3">
              {patient.medicalReports.map((report) => {
                const attachment = report.attachments[0];
                return (
                  <div key={report.id} className="rounded-md border border-slate-200 p-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <h3 className="text-sm font-semibold text-slate-900">{report.title}</h3>
                        <p className="text-xs text-slate-500">
                          {new Intl.DateTimeFormat(locale).format(report.reportDate)} • Dr(a). {report.doctor.fullName} ({report.specialty})
                        </p>
                        {attachment && (
                          <p className="text-xs text-slate-400 mt-1">
                            Arquivo: {attachment.originalName} ({formatBytes(attachment.sizeBytes)})
                          </p>
                        )}
                      </div>
                      <div className="flex gap-2">
                        {attachment && (
                          <>
                            <a href={`/api/reports/${report.id}/view`} target="_blank" rel="noreferrer" className={secondaryButtonClass}>
                              Visualizar
                            </a>
                            <a href={`/api/reports/${report.id}/download`} className={secondaryButtonClass}>
                              Baixar
                            </a>
                          </>
                        )}
                      </div>
                    </div>
                    {report.observations && (
                      <p className="mt-2 text-xs text-slate-600 bg-slate-50 p-2 rounded">{report.observations}</p>
                    )}
                  </div>
                );
              })}
              {patient.medicalReports.length === 0 && (
                <p className="py-4 text-sm text-slate-500">Nenhum laudo anexado.</p>
              )}
            </div>
          </Panel>
        </div>
      </div>
    </>
  );
}
