import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Eye, Pencil, Trash2 } from "lucide-react";

import { createDoctor, deleteDoctor, searchRedirect, updateDoctor } from "@/actions/dashboard-actions";
import { buttonClass, Field, inputClass, PageHeader, Panel, secondaryButtonClass } from "@/components/dashboard/ui";
import { db } from "@/server/db";
import { requireAuthenticatedAppUserOrRedirect } from "@/server/security/auth";
import { buildDoctorWhereClause, resolveLinkedIds } from "@/server/security/authorize";

function buildDoctorsHref({ q, editId, viewId }: { q?: string; editId?: string; viewId?: string }) {
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
  return query ? `/dashboard/medicos?${query}` : "/dashboard/medicos";
}

export default async function DoctorsPage({ searchParams }: { searchParams: Promise<{ q?: string; editId?: string; viewId?: string }> }) {
  const params = await searchParams;
  const q = params.q?.trim();
  const editId = params.editId?.trim();
  const viewId = params.viewId?.trim();
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
    include: {
      assignedPatients: {
        where: { deletedAt: null },
        select: { id: true, fullName: true },
        orderBy: { fullName: "asc" },
      },
    },
    orderBy: { fullName: "asc" },
  });

  const isAdmin = appUser.role === "ADMIN";
  const selectedDoctor = isAdmin && editId ? doctors.find((doctor) => doctor.id === editId) ?? null : null;
  const viewedDoctor = viewId ? doctors.find((doctor) => doctor.id === viewId) ?? null : null;

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

          <div className="overflow-x-auto rounded-lg border border-slate-200">
            <table className="min-w-full divide-y divide-slate-200 bg-white text-sm">
              <thead className="bg-slate-50 font-semibold text-slate-700">
                <tr>
                  <th className="px-4 py-3 text-left">{t("form.fullName")}</th>
                  <th className="px-4 py-3 text-left">{t("form.crm")}</th>
                  <th className="px-4 py-3 text-left">{t("form.specialty")}</th>
                  <th className="px-4 py-3 text-left">{tCommon("nav.patients")}</th>
                  <th className="px-4 py-3 text-left">{t("form.phone")}</th>
                  <th className="px-4 py-3 text-left">{t("form.email")}</th>
                  <th className="px-4 py-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-slate-600">
                {doctors.map((doctor) => (
                  <tr key={doctor.id} className="hover:bg-slate-50 transition">
                    <td className="px-4 py-3 font-medium text-slate-900">{doctor.fullName}</td>
                    <td className="px-4 py-3">{doctor.crm}</td>
                    <td className="px-4 py-3">{doctor.specialty}</td>
                    <td className="px-4 py-3">{doctor.assignedPatients.length}</td>
                    <td className="px-4 py-3">{doctor.phone ?? "-"}</td>
                    <td className="px-4 py-3">{doctor.email ?? "-"}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          href={buildDoctorsHref({ q, viewId: doctor.id })}
                          title={tCommon("actions.view")}
                          className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-slate-200 text-slate-700 transition hover:bg-slate-100"
                          aria-label={tCommon("actions.view")}
                        >
                          <Eye className="h-4 w-4" />
                        </Link>
                        {isAdmin && (
                          <Link
                            href={buildDoctorsHref({ q, editId: doctor.id })}
                            title={tCommon("actions.edit")}
                            className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-amber-200 text-amber-700 transition hover:bg-amber-50"
                            aria-label={tCommon("actions.edit")}
                          >
                            <Pencil className="h-4 w-4" />
                          </Link>
                        )}
                        {isAdmin && (
                          <form action={deleteDoctor}>
                            <input type="hidden" name="id" value={doctor.id} />
                            <button
                              className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-rose-200 text-rose-700 transition hover:bg-rose-50"
                              title={tCommon("actions.delete")}
                              aria-label={tCommon("actions.delete")}
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </form>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {doctors.length === 0 ? <p className="py-8 text-sm text-slate-500">{t("empty")}</p> : null}

          {selectedDoctor && (
            <form action={updateDoctor} className="mt-6 rounded-md border border-slate-200 p-4">
              <input type="hidden" name="id" value={selectedDoctor.id} />
              <h3 className="mb-4 text-base font-semibold text-slate-900">{tCommon("actions.edit")}</h3>
              <div className="grid gap-3 lg:grid-cols-2">
                <Field label={t("form.fullName")}>
                  <input name="fullName" defaultValue={selectedDoctor.fullName} className={inputClass} />
                </Field>
                <Field label={t("form.crm")}>
                  <input name="crm" defaultValue={selectedDoctor.crm} className={inputClass} />
                </Field>
                <Field label={t("form.specialty")}>
                  <input name="specialty" defaultValue={selectedDoctor.specialty} className={inputClass} />
                </Field>
                <Field label={t("form.phone")}>
                  <input name="phone" defaultValue={selectedDoctor.phone ?? ""} className={inputClass} />
                </Field>
                <Field label={t("form.email")}>
                  <input name="email" type="email" defaultValue={selectedDoctor.email ?? ""} className={inputClass} />
                </Field>
              </div>
              <div className="mt-4 flex items-center justify-end gap-2">
                <Link href={buildDoctorsHref({ q })} className={secondaryButtonClass}>
                  {tCommon("actions.cancel")}
                </Link>
                <button className={buttonClass}>{tCommon("actions.save")}</button>
              </div>
            </form>
          )}

          {viewedDoctor && !selectedDoctor && (
            <div className="mt-6 rounded-md border border-slate-200 p-4">
              <h3 className="mb-4 text-base font-semibold text-slate-900">{tCommon("actions.view")}</h3>
              <dl className="grid gap-3 text-sm text-slate-700 sm:grid-cols-2">
                <div>
                  <dt className="text-slate-500">{t("form.fullName")}</dt>
                  <dd className="font-medium text-slate-900">{viewedDoctor.fullName}</dd>
                </div>
                <div>
                  <dt className="text-slate-500">{t("form.crm")}</dt>
                  <dd>{viewedDoctor.crm}</dd>
                </div>
                <div>
                  <dt className="text-slate-500">{t("form.specialty")}</dt>
                  <dd>{viewedDoctor.specialty}</dd>
                </div>
                <div>
                  <dt className="text-slate-500">{t("form.phone")}</dt>
                  <dd>{viewedDoctor.phone ?? "-"}</dd>
                </div>
                <div>
                  <dt className="text-slate-500">{t("form.email")}</dt>
                  <dd>{viewedDoctor.email ?? "-"}</dd>
                </div>
              </dl>

              <div className="mt-4 rounded-md border border-slate-200 p-3">
                <p className="text-sm font-semibold text-slate-900">{tCommon("nav.patients")}</p>
                {viewedDoctor.assignedPatients.length > 0 ? (
                  <ul className="mt-2 space-y-1 text-sm text-slate-700">
                    {viewedDoctor.assignedPatients.map((patient) => (
                      <li key={patient.id}>
                        <Link href={`/dashboard/pacientes/${patient.id}`} className="hover:text-teal-800 hover:underline">
                          {patient.fullName}
                        </Link>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-2 text-sm text-slate-500">-</p>
                )}
              </div>

              <div className="mt-4 flex justify-end">
                <Link href={buildDoctorsHref({ q })} className={secondaryButtonClass}>
                  {tCommon("actions.close")}
                </Link>
              </div>
            </div>
          )}
        </Panel>
      </div>
    </>
  );
}
