import { AppointmentStatus } from "@prisma/client";

import {
  cancelAppointment,
  createAppointment,
  searchRedirect,
  updateAppointment,
} from "@/actions/dashboard-actions";
import { buttonClass, Field, inputClass, PageHeader, Panel, secondaryButtonClass, textareaClass } from "@/components/dashboard/ui";
import { db } from "@/server/db";
import { requireAuthenticatedAppUser } from "@/server/security/auth";

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
  const appUser = await requireAuthenticatedAppUser();

  const [appointments, patients, doctors] = await Promise.all([
    db.appointment.findMany({
      where: {
        deletedAt: null,
        createdByUserId: appUser.id,
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
    db.patient.findMany({ where: { deletedAt: null, createdByUserId: appUser.id }, orderBy: { fullName: "asc" } }),
    db.doctor.findMany({ where: { deletedAt: null, createdByUserId: appUser.id }, orderBy: { fullName: "asc" } }),
  ]);

  return (
    <>
      <PageHeader title="Agenda" description="Crie, reagende e acompanhe consultas por paciente, médico e status." />

      <div className="grid gap-6 xl:grid-cols-[380px_1fr]">
        <Panel>
          <h2 className="mb-4 text-base font-semibold">Nova consulta</h2>
          <form action={createAppointment} className="grid gap-3">
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
                    {doctor.fullName} - {doctor.specialty}
                  </option>
                ))}
              </select>
            </Field>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Data e hora">
                <input name="startsAt" type="datetime-local" required className={inputClass} />
              </Field>
              <Field label="Duração">
                <input name="durationMinutes" type="number" min="10" step="5" defaultValue="30" className={inputClass} />
              </Field>
            </div>
            <Field label="Status">
              <select name="status" defaultValue={AppointmentStatus.SCHEDULED} className={inputClass}>
                {Object.values(AppointmentStatus).map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Observações">
              <textarea name="notes" className={textareaClass} />
            </Field>
            <button className={buttonClass}>Agendar consulta</button>
          </form>
        </Panel>

        <Panel>
          <form action={searchRedirect} className="mb-4 flex flex-col gap-2 sm:flex-row">
            <input type="hidden" name="path" value="/dashboard/agenda" />
            <input name="q" defaultValue={q} placeholder="Buscar por paciente ou médico" className={`${inputClass} flex-1`} />
            <button className={secondaryButtonClass}>Buscar</button>
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
                  <Field label="Data">
                    <input name="startsAt" type="datetime-local" defaultValue={dateTimeLocal(appointment.startsAt)} className={inputClass} />
                  </Field>
                  <Field label="Duração">
                    <input name="durationMinutes" type="number" defaultValue={appointment.durationMinutes} className={inputClass} />
                  </Field>
                  <Field label="Status">
                    <select name="status" defaultValue={appointment.status} className={inputClass}>
                      {Object.values(AppointmentStatus).map((status) => (
                        <option key={status} value={status}>
                          {status}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <button className={buttonClass}>Salvar</button>
                </div>
                <div className="mt-3 grid gap-3 lg:grid-cols-[1fr_120px]">
                  <textarea name="notes" defaultValue={appointment.notes ?? ""} className={textareaClass} />
                  <button formAction={cancelAppointment} className="h-10 rounded-md border border-rose-200 bg-rose-50 px-4 text-sm font-semibold text-rose-700">
                    Cancelar
                  </button>
                </div>
              </form>
            ))}
            {appointments.length === 0 ? <p className="py-8 text-sm text-slate-500">Nenhuma consulta encontrada.</p> : null}
          </div>
        </Panel>
      </div>
    </>
  );
}
