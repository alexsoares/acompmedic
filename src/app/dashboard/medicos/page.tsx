import { createDoctor, deleteDoctor, searchRedirect, updateDoctor } from "@/actions/dashboard-actions";
import { buttonClass, Field, inputClass, PageHeader, Panel, secondaryButtonClass } from "@/components/dashboard/ui";
import { db } from "@/server/db";
import { requireAuthenticatedAppUserOrRedirect } from "@/server/security/auth";

export default async function DoctorsPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const params = await searchParams;
  const q = params.q?.trim();
  const appUser = await requireAuthenticatedAppUserOrRedirect();
  const doctors = await db.doctor.findMany({
    where: {
      deletedAt: null,
      createdByUserId: appUser.id,
      OR: q
        ? [
            { fullName: { contains: q, mode: "insensitive" } },
            { specialty: { contains: q, mode: "insensitive" } },
            { crm: { contains: q, mode: "insensitive" } },
          ]
        : undefined,
    },
    orderBy: { fullName: "asc" },
  });

  return (
    <>
      <PageHeader title="Médicos" description="Gerencie médicos, CRM, especialidades e dados de contato." />

      <div className="grid gap-6 xl:grid-cols-[380px_1fr]">
        <Panel>
          <h2 className="mb-4 text-base font-semibold">Novo médico</h2>
          <form action={createDoctor} className="grid gap-3">
            <Field label="Nome completo">
              <input name="fullName" required className={inputClass} />
            </Field>
            <Field label="CRM">
              <input name="crm" required className={inputClass} />
            </Field>
            <Field label="Especialidade">
              <input name="specialty" required className={inputClass} />
            </Field>
            <Field label="Telefone">
              <input name="phone" className={inputClass} />
            </Field>
            <Field label="Email">
              <input name="email" type="email" className={inputClass} />
            </Field>
            <button className={buttonClass}>Salvar médico</button>
          </form>
        </Panel>

        <Panel>
          <form action={searchRedirect} className="mb-4 flex flex-col gap-2 sm:flex-row">
            <input type="hidden" name="path" value="/dashboard/medicos" />
            <input name="q" defaultValue={q} placeholder="Buscar por nome, CRM ou especialidade" className={`${inputClass} flex-1`} />
            <button className={secondaryButtonClass}>Buscar</button>
          </form>

          <div className="space-y-3">
            {doctors.map((doctor) => (
              <form key={doctor.id} action={updateDoctor} className="rounded-md border border-slate-200 p-3">
                <input type="hidden" name="id" value={doctor.id} />
                <div className="grid gap-3 lg:grid-cols-[1.4fr_130px_1fr_110px] lg:items-end">
                  <Field label="Nome">
                    <input name="fullName" defaultValue={doctor.fullName} className={inputClass} />
                  </Field>
                  <Field label="CRM">
                    <input name="crm" defaultValue={doctor.crm} className={inputClass} />
                  </Field>
                  <Field label="Especialidade">
                    <input name="specialty" defaultValue={doctor.specialty} className={inputClass} />
                  </Field>
                  <button className={buttonClass}>Salvar</button>
                </div>
                <div className="mt-3 grid gap-3 lg:grid-cols-[1fr_1fr_120px] lg:items-end">
                  <Field label="Telefone">
                    <input name="phone" defaultValue={doctor.phone ?? ""} className={inputClass} />
                  </Field>
                  <Field label="Email">
                    <input name="email" type="email" defaultValue={doctor.email ?? ""} className={inputClass} />
                  </Field>
                  <button formAction={deleteDoctor} className="h-10 rounded-md border border-rose-200 bg-rose-50 px-4 text-sm font-semibold text-rose-700">
                    Excluir
                  </button>
                </div>
              </form>
            ))}
            {doctors.length === 0 ? <p className="py-8 text-sm text-slate-500">Nenhum médico encontrado.</p> : null}
          </div>
        </Panel>
      </div>
    </>
  );
}
