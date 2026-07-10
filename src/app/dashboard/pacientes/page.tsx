import { Gender } from "@prisma/client";

import { createPatient, deletePatient, searchRedirect, updatePatient } from "@/actions/dashboard-actions";
import { buttonClass, Field, inputClass, PageHeader, Panel, secondaryButtonClass } from "@/components/dashboard/ui";
import { db } from "@/server/db";
import { requireAuthenticatedAppUser } from "@/server/security/auth";

function dateInput(date: Date | null) {
  return date ? date.toISOString().slice(0, 10) : "";
}

export default async function PatientsPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const params = await searchParams;
  const q = params.q?.trim();
  const appUser = await requireAuthenticatedAppUser();
  const patients = await db.patient.findMany({
    where: {
      deletedAt: null,
      createdByUserId: appUser.id,
      OR: q
        ? [
            { fullName: { contains: q, mode: "insensitive" } },
            { cpf: { contains: q, mode: "insensitive" } },
            { email: { contains: q, mode: "insensitive" } },
          ]
        : undefined,
    },
    orderBy: { fullName: "asc" },
  });

  return (
    <>
      <PageHeader title="Pacientes" description="Cadastre, edite, pesquise e remova pacientes da clínica." />

      <div className="grid gap-6 xl:grid-cols-[380px_1fr]">
        <Panel>
          <h2 className="mb-4 text-base font-semibold">Novo paciente</h2>
          <form action={createPatient} className="grid gap-3">
            <Field label="Nome completo">
              <input name="fullName" required className={inputClass} />
            </Field>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="CPF">
                <input name="cpf" required className={inputClass} />
              </Field>
              <Field label="Nascimento">
                <input name="birthDate" type="date" className={inputClass} />
              </Field>
            </div>
            <Field label="Gênero">
              <select name="gender" defaultValue={Gender.UNDISCLOSED} className={inputClass}>
                {Object.values(Gender).map((gender) => (
                  <option key={gender} value={gender}>
                    {gender}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Telefone">
              <input name="phone" className={inputClass} />
            </Field>
            <Field label="Email">
              <input name="email" type="email" className={inputClass} />
            </Field>
            <Field label="Endereço">
              <input name="address" className={inputClass} />
            </Field>
            <button className={buttonClass}>Salvar paciente</button>
          </form>
        </Panel>

        <Panel>
          <form action={searchRedirect} className="mb-4 flex flex-col gap-2 sm:flex-row">
            <input type="hidden" name="path" value="/dashboard/pacientes" />
            <input name="q" defaultValue={q} placeholder="Buscar por nome, CPF ou email" className={`${inputClass} flex-1`} />
            <button className={secondaryButtonClass}>Buscar</button>
          </form>

          <div className="space-y-3">
            {patients.map((patient) => (
              <form key={patient.id} action={updatePatient} className="rounded-md border border-slate-200 p-3">
                <input type="hidden" name="id" value={patient.id} />
                <div className="grid gap-3 lg:grid-cols-[1.4fr_130px_150px_1fr_110px] lg:items-end">
                  <Field label="Nome">
                    <input name="fullName" defaultValue={patient.fullName} className={inputClass} />
                  </Field>
                  <Field label="CPF">
                    <input name="cpf" defaultValue={patient.cpf} className={inputClass} />
                  </Field>
                  <Field label="Nascimento">
                    <input name="birthDate" type="date" defaultValue={dateInput(patient.birthDate)} className={inputClass} />
                  </Field>
                  <Field label="Email">
                    <input name="email" type="email" defaultValue={patient.email ?? ""} className={inputClass} />
                  </Field>
                  <button className={buttonClass}>Salvar</button>
                </div>
                <div className="mt-3 grid gap-3 lg:grid-cols-[120px_1fr_1fr_120px] lg:items-end">
                  <Field label="Gênero">
                    <select name="gender" defaultValue={patient.gender} className={inputClass}>
                      {Object.values(Gender).map((gender) => (
                        <option key={gender} value={gender}>
                          {gender}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Telefone">
                    <input name="phone" defaultValue={patient.phone ?? ""} className={inputClass} />
                  </Field>
                  <Field label="Endereço">
                    <input name="address" defaultValue={patient.address ?? ""} className={inputClass} />
                  </Field>
                  <button formAction={deletePatient} className="h-10 rounded-md border border-rose-200 bg-rose-50 px-4 text-sm font-semibold text-rose-700">
                    Excluir
                  </button>
                </div>
              </form>
            ))}
            {patients.length === 0 ? <p className="py-8 text-sm text-slate-500">Nenhum paciente encontrado.</p> : null}
          </div>
        </Panel>
      </div>
    </>
  );
}
