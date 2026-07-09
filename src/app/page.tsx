import Link from "next/link";

import { AppShell } from "@/components/layout/app-shell";
import { APP_NAME } from "@/lib/constants";

const sections = [
  "Next.js 15 App Router + React 19 + TypeScript",
  "Prisma com Supabase PostgreSQL",
  "Supabase Auth e Supabase Storage",
  "Arquitetura modular preparada para LGPD e futura IA",
  "Deploy imediato na Vercel via variaveis de ambiente",
];

export default function Home() {
  return (
    <AppShell>
      <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col justify-center px-6 py-20 sm:px-10">
        <div className="grid gap-14 lg:grid-cols-[1.35fr_0.65fr] lg:items-end">
          <section className="space-y-8">
            <div className="inline-flex items-center rounded-full border border-black/10 bg-white px-4 py-2 text-sm font-medium tracking-wide text-zinc-700 shadow-sm">
              Producao pronta para Vercel, Supabase e Prisma
            </div>
            <div className="space-y-5">
              <h1 className="max-w-4xl text-4xl font-semibold tracking-tight text-zinc-950 sm:text-6xl">
                {APP_NAME}
              </h1>
              <p className="max-w-3xl text-lg leading-8 text-zinc-600 sm:text-xl">
                Base Full Stack em Next.js criada para autenticação, agenda médica, gestão de pacientes,
                médicos, laudos e upload seguro de arquivos clínicos com trilha de auditoria.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {sections.map((section) => (
                <div
                  key={section}
                  className="rounded-2xl border border-black/10 bg-white/95 p-5 text-sm font-medium text-zinc-700 shadow-sm"
                >
                  {section}
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-[2rem] border border-black/10 bg-zinc-950 p-8 text-zinc-50 shadow-2xl">
            <div className="space-y-6">
              <div>
                <p className="text-sm uppercase tracking-[0.2em] text-zinc-400">Proximas etapas</p>
                <h2 className="mt-3 text-2xl font-semibold">Backoffice clinico modular</h2>
              </div>
              <ul className="space-y-3 text-sm leading-7 text-zinc-300">
                <li>Autenticação com Supabase Auth e perfis de acesso.</li>
                <li>Prisma com migrations, seeds, soft delete, auditoria e UUID.</li>
                <li>Agenda diaria, semanal e mensal com bloqueio de conflito.</li>
                <li>Upload de PDF e TXT em bucket privado com historico de substituição.</li>
                <li>Contrato MedicalReportAIService pronto para troca futura de LLM.</li>
              </ul>

              <div className="flex flex-wrap gap-3">
                <Link
                  href="/api/health"
                  className="rounded-full bg-white px-5 py-3 text-sm font-semibold text-zinc-950 transition hover:bg-zinc-200"
                >
                  Health check
                </Link>
                <Link
                  href="https://vercel.com/new"
                  className="rounded-full border border-white/20 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
                >
                  Publicar na Vercel
                </Link>
              </div>
            </div>
          </section>
        </div>
      </main>
    </AppShell>
  );
}
