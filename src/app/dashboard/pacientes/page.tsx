import Link from "next/link";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Gender } from "@prisma/client";

import { createPatient, deletePatient, searchRedirect, updatePatient } from "@/actions/dashboard-actions";
import { buttonClass, Field, inputClass, PageHeader, Panel, secondaryButtonClass } from "@/components/dashboard/ui";
import { db } from "@/server/db";
import { requireAuthenticatedAppUserOrRedirect } from "@/server/security/auth";
import { buildPatientWhereClause, resolveLinkedIds, ForbiddenError } from "@/server/security/authorize";

function dateInput(date: Date | null) {
  return date ? date.toISOString().slice(0, 10) : "";
}

export default async function PatientsPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const params = await searchParams;
  const q = params.q?.trim();
  const appUser = await requireAuthenticatedAppUserOrRedirect();
  const { doctorId, patientId } = await resolveLinkedIds(appUser.id);
  const userContext = { id: appUser.id, role: appUser.role, email: appUser.email, doctorId, patientId };

  // 1. PATIENT role: Redirect directly to their own detail file
  if (appUser.role === "PATIENT") {
    if (patientId) {
      redirect(`/dashboard/pacientes/${patientId}`);
    } else {
      throw new ForbiddenError("Registro de paciente não vinculado.");
    }
  }

  const t = await getTranslations("patients");
  const tCommon = await getTranslations("common");
  const locale = appUser.locale || "pt-BR";

  // Fetch patients list
  const patients = await db.patient.findMany({
    where: {
      deletedAt: null,
      ...buildPatientWhereClause(userContext),
      OR: q
        ? [
            { fullName: { contains: q, mode: "insensitive" } },
            { cpf: { contains: q, mode: "insensitive" } },
            { email: { contains: q, mode: "insensitive" } },
          ]
        : undefined,
    },
    include: {
      appointments: {
        where: { deletedAt: null, startsAt: { gte: new Date() } },
        orderBy: { startsAt: "asc" },
        take: 1,
      },
    },
    orderBy: { fullName: "asc" },
  });

  // Fetch all doctors for admin to assign
  const allDoctors =
    appUser.role === "ADMIN"
      ? await db.doctor.findMany({
          where: { deletedAt: null },
          orderBy: { fullName: "asc" },
        })
      : [];

  // 2. DOCTOR role: simple list -> selection flow (doesn't display full form tables of patients)
  if (appUser.role === "DOCTOR") {
    return (
      <>
        <PageHeader title={t("title")} description={t("description")} />

        <Panel>
          <form action={searchRedirect} className="mb-6 flex flex-col gap-2 sm:flex-row">
            <input type="hidden" name="path" value="/dashboard/pacientes" />
            <input name="q" defaultValue={q} placeholder={t("form.searchPlaceholder")} className={`${inputClass} flex-1`} />
            <button className={secondaryButtonClass}>{tCommon("actions.search")}</button>
          </form>

          <div className="overflow-x-auto rounded-lg border border-slate-200">
            <table className="min-w-full divide-y divide-slate-200 bg-white text-sm">
              <thead className="bg-slate-50 font-semibold text-slate-700">
                <tr>
                  <th className="px-4 py-3 text-left">{t("form.fullName")}</th>
                  <th className="px-4 py-3 text-left">Próxima Consulta</th>
                  <th className="px-4 py-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-slate-600">
                {patients.map((patient) => {
                  const nextAppt = patient.appointments[0];
                  return (
                    <tr key={patient.id} className="hover:bg-slate-50 transition">
                      <td className="px-4 py-3 font-medium text-slate-900">{patient.fullName}</td>
                      <td className="px-4 py-3 text-slate-500">
                        {nextAppt ? (
                          new Intl.DateTimeFormat(locale, {
                            dateStyle: "short",
                            timeStyle: "short",
                          }).format(nextAppt.startsAt)
                        ) : (
                          <span className="text-xs text-slate-400">Nenhuma consulta agendada</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Link
                          href={`/dashboard/pacientes/${patient.id}`}
                          className="inline-flex h-9 items-center justify-center rounded-md bg-teal-50 px-4 text-sm font-semibold text-teal-800 hover:bg-teal-100 transition"
                        >
                          Ver Prontuário
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {patients.length === 0 && (
              <p className="py-8 text-center text-slate-500">{t("empty")}</p>
            )}
          </div>
        </Panel>
      </>
    );
  }

  // 3. ADMIN role: full editable table listing as requested
  return (
    <>
      <PageHeader title={t("title")} description={t("description")} />

      <div className="grid gap-6 xl:grid-cols-[380px_1fr]">
        <Panel>
          <h2 className="mb-4 text-base font-semibold">{t("form.newPatient")}</h2>
          <form action={createPatient} className="grid gap-3">
            <Field label={t("form.fullName")}>
              <input name="fullName" required className={inputClass} />
            </Field>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label={t("form.cpf")}>
                <input name="cpf" className={inputClass} />
              </Field>
              <Field label={t("form.birthDate")}>
                <input name="birthDate" type="date" className={inputClass} />
              </Field>
            </div>
            <Field label={t("form.gender")}>
              <select name="gender" defaultValue={Gender.UNDISCLOSED} className={inputClass}>
                {Object.values(Gender).map((gender) => (
                  <option key={gender} value={gender}>
                    {tCommon(`gender.${gender}`)}
                  </option>
                ))}
              </select>
            </Field>
            <Field label={t("form.assignedDoctor")}>
              <select name="assignedDoctorId" defaultValue="" className={inputClass}>
                <option value="">-- Selecione --</option>
                {allDoctors.map((doc) => (
                  <option key={doc.id} value={doc.id}>
                    {doc.fullName} ({doc.specialty})
                  </option>
                ))}
              </select>
            </Field>
            <Field label={t("form.phone")}>
              <input name="phone" className={inputClass} />
            </Field>
            <Field label={t("form.email")}>
              <input name="email" type="email" className={inputClass} />
            </Field>
            <Field label={t("form.address")}>
              <input name="address" className={inputClass} />
            </Field>
            <Field label={t("form.notes")}>
              <textarea name="notes" className={inputClass} rows={2} />
            </Field>
            <button className={buttonClass}>{t("form.save")}</button>
          </form>
        </Panel>

        <Panel>
          <form action={searchRedirect} className="mb-4 flex flex-col gap-2 sm:flex-row">
            <input type="hidden" name="path" value="/dashboard/pacientes" />
            <input name="q" defaultValue={q} placeholder={t("form.searchPlaceholder")} className={`${inputClass} flex-1`} />
            <button className={secondaryButtonClass}>{tCommon("actions.search")}</button>
          </form>

          <div className="space-y-3">
            {patients.map((patient) => (
              <form key={patient.id} action={updatePatient} className="rounded-md border border-slate-200 p-3">
                <input type="hidden" name="id" value={patient.id} />
                <div className="grid gap-3 lg:grid-cols-[1.4fr_130px_150px_1fr_110px] lg:items-end">
                  <Field label={t("form.fullName")}>
                    <input name="fullName" defaultValue={patient.fullName} className={inputClass} />
                  </Field>
                  <Field label={t("form.cpf")}>
                    <input name="cpf" defaultValue={patient.cpf ?? ""} className={inputClass} />
                  </Field>
                  <Field label={t("form.birthDate")}>
                    <input name="birthDate" type="date" defaultValue={dateInput(patient.birthDate)} className={inputClass} />
                  </Field>
                  <Field label={t("form.email")}>
                    <input name="email" type="email" defaultValue={patient.email ?? ""} className={inputClass} />
                  </Field>
                  <button className={buttonClass}>{tCommon("actions.save")}</button>
                </div>
                <div className="mt-3 grid gap-3 lg:grid-cols-[125px_130px_1fr_1fr_120px] lg:items-end">
                  <Field label={t("form.gender")}>
                    <select name="gender" defaultValue={patient.gender} className={inputClass}>
                      {Object.values(Gender).map((gender) => (
                        <option key={gender} value={gender}>
                          {tCommon(`gender.${gender}`)}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field label={t("form.phone")}>
                    <input name="phone" defaultValue={patient.phone ?? ""} className={inputClass} />
                  </Field>
                  <Field label={t("form.assignedDoctor")}>
                    <select name="assignedDoctorId" defaultValue={patient.assignedDoctorId ?? ""} className={inputClass}>
                      <option value="">-- Sem médico --</option>
                      {allDoctors.map((doc) => (
                        <option key={doc.id} value={doc.id}>
                          {doc.fullName}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field label={t("form.address")}>
                    <input name="address" defaultValue={patient.address ?? ""} className={inputClass} />
                  </Field>
                  <button formAction={deletePatient} className="h-10 rounded-md border border-rose-200 bg-rose-50 px-4 text-sm font-semibold text-rose-700">
                    {tCommon("actions.delete")}
                  </button>
                </div>
              </form>
            ))}
            {patients.length === 0 ? <p className="py-8 text-sm text-slate-500">{t("empty")}</p> : null}
          </div>
        </Panel>
      </div>
    </>
  );
}
