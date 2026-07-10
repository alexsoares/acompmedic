import { getTranslations } from "next-intl/server";

import { createDoctor, deleteDoctor, searchRedirect, updateDoctor } from "@/actions/dashboard-actions";
import { buttonClass, Field, inputClass, PageHeader, Panel, secondaryButtonClass } from "@/components/dashboard/ui";
import { db } from "@/server/db";
import { requireAuthenticatedAppUserOrRedirect } from "@/server/security/auth";
import { buildDoctorWhereClause, resolveLinkedIds } from "@/server/security/authorize";

export default async function DoctorsPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const params = await searchParams;
  const q = params.q?.trim();
  const appUser = await requireAuthenticatedAppUserOrRedirect();
  const { doctorId } = await resolveLinkedIds(appUser.id);
  const userContext = { id: appUser.id, role: appUser.role, email: appUser.email, doctorId };

  const t = await getTranslations("doctors");
  const tCommon = await getTranslations("common");

  // buildDoctorWhereClause will throw ForbiddenError for PATIENT
  const doctorWhere = buildDoctorWhereClause(userContext);

  const doctors = await db.doctor.findMany({
    where: {
      deletedAt: null,
      ...doctorWhere,
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

  const isAdmin = appUser.role === "ADMIN";

  return (
    <>
      <PageHeader title={t("title")} description={t("description")} />

      <div className={`grid gap-6 ${isAdmin ? "xl:grid-cols-[380px_1fr]" : "grid-cols-1"}`}>
        {isAdmin && (
          <Panel>
            <h2 className="mb-4 text-base font-semibold">{t("form.newDoctor")}</h2>
            <form action={createDoctor} className="grid gap-3">
              <Field label={t("form.fullName")}>
                <input name="fullName" required className={inputClass} />
              </Field>
              <Field label={t("form.crm")}>
                <input name="crm" required className={inputClass} />
              </Field>
              <Field label={t("form.specialty")}>
                <input name="specialty" required className={inputClass} />
              </Field>
              <Field label={t("form.phone")}>
                <input name="phone" className={inputClass} />
              </Field>
              <Field label={t("form.email")}>
                <input name="email" type="email" className={inputClass} />
              </Field>
              <button className={buttonClass}>{t("form.save")}</button>
            </form>
          </Panel>
        )}

        <Panel>
          <form action={searchRedirect} className="mb-4 flex flex-col gap-2 sm:flex-row">
            <input type="hidden" name="path" value="/dashboard/medicos" />
            <input name="q" defaultValue={q} placeholder={t("form.searchPlaceholder")} className={`${inputClass} flex-1`} />
            <button className={secondaryButtonClass}>{tCommon("actions.search")}</button>
          </form>

          <div className="space-y-3">
            {doctors.map((doctor) => (
              <form key={doctor.id} action={updateDoctor} className="rounded-md border border-slate-200 p-3">
                <input type="hidden" name="id" value={doctor.id} />
                <div className="grid gap-3 lg:grid-cols-[1.4fr_130px_1fr_110px] lg:items-end">
                  <Field label={t("form.fullName")}>
                    <input name="fullName" defaultValue={doctor.fullName} readOnly={!isAdmin} className={inputClass} />
                  </Field>
                  <Field label={t("form.crm")}>
                    <input name="crm" defaultValue={doctor.crm} readOnly={!isAdmin} className={inputClass} />
                  </Field>
                  <Field label={t("form.specialty")}>
                    <input name="specialty" defaultValue={doctor.specialty} readOnly={!isAdmin} className={inputClass} />
                  </Field>
                  {isAdmin && <button className={buttonClass}>{tCommon("actions.save")}</button>}
                </div>
                <div className="mt-3 grid gap-3 lg:grid-cols-[1fr_1fr_120px] lg:items-end">
                  <Field label={t("form.phone")}>
                    <input name="phone" defaultValue={doctor.phone ?? ""} readOnly={!isAdmin} className={inputClass} />
                  </Field>
                  <Field label={t("form.email")}>
                    <input name="email" type="email" defaultValue={doctor.email ?? ""} readOnly={!isAdmin} className={inputClass} />
                  </Field>
                  {isAdmin && (
                    <button formAction={deleteDoctor} className="h-10 rounded-md border border-rose-200 bg-rose-50 px-4 text-sm font-semibold text-rose-700">
                      {tCommon("actions.delete")}
                    </button>
                  )}
                </div>
              </form>
            ))}
            {doctors.length === 0 ? <p className="py-8 text-sm text-slate-500">{t("empty")}</p> : null}
          </div>
        </Panel>
      </div>
    </>
  );
}
