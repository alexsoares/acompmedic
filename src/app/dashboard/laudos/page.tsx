import Link from "next/link";

import { createMedicalReport, deleteMedicalReport, searchRedirect } from "@/actions/dashboard-actions";
import { buttonClass, Field, inputClass, PageHeader, Panel, secondaryButtonClass, textareaClass } from "@/components/dashboard/ui";
import { formatBytes } from "@/lib/utils";
import { db } from "@/server/db";
import { requireAuthenticatedAppUserOrRedirect } from "@/server/security/auth";

export default async function ReportsPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const params = await searchParams;
  const q = params.q?.trim();
  const appUser = await requireAuthenticatedAppUserOrRedirect();
  const [reports, patients, doctors, appointments] = await Promise.all([
    db.medicalReport.findMany({
      where: {
        deletedAt: null,
        createdByUserId: appUser.id,
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
        attachments: {
          where: { isCurrent: true, deletedAt: null },
          orderBy: { version: "desc" },
          take: 1,
        },
      },
      orderBy: { reportDate: "desc" },
      take: 80,
    }),
    db.patient.findMany({ where: { deletedAt: null, createdByUserId: appUser.id }, orderBy: { fullName: "asc" } }),
    db.doctor.findMany({ where: { deletedAt: null, createdByUserId: appUser.id }, orderBy: { fullName: "asc" } }),
    db.appointment.findMany({
      where: { deletedAt: null, createdByUserId: appUser.id },
      include: { patient: true, doctor: true },
      orderBy: { startsAt: "desc" },
      take: 80,
    }),
  ]);

  return (
    <>
      <PageHeader title="Laudos" description="Cadastre laudos e anexe arquivos PDF ou TXT no Storage privado." />

      <div className="grid gap-6 xl:grid-cols-[400px_1fr]">
        <Panel>
          <h2 className="mb-4 text-base font-semibold">Novo laudo</h2>
          <form action={createMedicalReport} className="grid gap-3">
            <Field label="Título">
              <input name="title" required className={inputClass} />
            </Field>
            <Field label="Paciente">
              <select name="patientId" required className={inputClass}>
                <option value="">Selecione</option>
                {patients.map((patient) => (
                  <option key={patient.id} value={patient.id}>
                    {patient.fullName}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Médico">
              <select name="doctorId" required className={inputClass}>
                <option value="">Selecione</option>
                {doctors.map((doctor) => (
                  <option key={doctor.id} value={doctor.id}>
                    {doctor.fullName}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Consulta relacionada">
              <select name="appointmentId" className={inputClass}>
                <option value="">Sem consulta</option>
                {appointments.map((appointment) => (
                  <option key={appointment.id} value={appointment.id}>
                    {appointment.patient.fullName} - {appointment.doctor.fullName}
                  </option>
                ))}
              </select>
            </Field>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Especialidade">
                <input name="specialty" required className={inputClass} />
              </Field>
              <Field label="Data">
                <input name="reportDate" type="date" className={inputClass} />
              </Field>
            </div>
            <Field label="Arquivo PDF ou TXT">
              <input
                name="file"
                type="file"
                required
                accept=".pdf,.txt,application/pdf,text/plain"
                className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
              />
            </Field>
            <Field label="Observações">
              <textarea name="observations" className={textareaClass} />
            </Field>
            <button className={buttonClass}>Salvar laudo</button>
          </form>
        </Panel>

        <Panel>
          <form action={searchRedirect} className="mb-4 flex flex-col gap-2 sm:flex-row">
            <input type="hidden" name="path" value="/dashboard/laudos" />
            <input name="q" defaultValue={q} placeholder="Buscar por paciente, médico, título ou especialidade" className={`${inputClass} flex-1`} />
            <button className={secondaryButtonClass}>Buscar</button>
          </form>

          <div className="space-y-3">
            {reports.map((report) => {
              const attachment = report.attachments[0];
              return (
                <div key={report.id} className="rounded-md border border-slate-200 p-4">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div className="space-y-1">
                      <h2 className="text-base font-semibold">{report.title}</h2>
                      <p className="text-sm text-slate-600">
                        {report.patient.fullName} - {report.doctor.fullName} - {report.specialty}
                      </p>
                      <p className="text-xs text-slate-500">
                        {new Intl.DateTimeFormat("pt-BR").format(report.reportDate)}
                        {attachment ? ` - ${attachment.originalName} (${formatBytes(attachment.sizeBytes)})` : ""}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {attachment ? (
                        <>
                          <Link href={`/api/reports/${report.id}/view`} className={secondaryButtonClass}>
                            Visualizar
                          </Link>
                          <Link href={`/api/reports/${report.id}/download`} className={secondaryButtonClass}>
                            Baixar
                          </Link>
                        </>
                      ) : null}
                      <form action={deleteMedicalReport}>
                        <input type="hidden" name="id" value={report.id} />
                        <button className="h-10 rounded-md border border-rose-200 bg-rose-50 px-4 text-sm font-semibold text-rose-700">
                          Excluir
                        </button>
                      </form>
                    </div>
                  </div>
                  {report.observations ? <p className="mt-3 text-sm leading-6 text-slate-600">{report.observations}</p> : null}
                </div>
              );
            })}
            {reports.length === 0 ? <p className="py-8 text-sm text-slate-500">Nenhum laudo encontrado.</p> : null}
          </div>
        </Panel>
      </div>
    </>
  );
}
