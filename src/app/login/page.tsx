import { Activity } from "lucide-react";

import { LoginForm } from "@/app/login/login-form";

export default function LoginPage() {
  return (
    <main className="grid min-h-screen bg-slate-100 lg:grid-cols-[1fr_480px]">
      <section className="hidden bg-teal-900 p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <div className="inline-flex items-center gap-3 text-lg font-semibold">
          <Activity className="h-6 w-6" />
          AcompMedic
        </div>
        <div className="max-w-xl space-y-5">
          <p className="text-sm uppercase tracking-[0.24em] text-teal-200">Backoffice clinico</p>
          <h1 className="text-5xl font-semibold leading-tight">Agenda, pacientes, medicos e laudos em um so lugar.</h1>
          <p className="text-lg leading-8 text-teal-50/80">
            Operação diária para clínicas que precisam acompanhar consultas, documentos e histórico com segurança.
          </p>
        </div>
        <p className="text-sm text-teal-100/70">Supabase Auth, Prisma e trilha de auditoria.</p>
      </section>

      <section className="flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm space-y-8">
          <div className="space-y-2">
            <div className="inline-flex h-10 w-10 items-center justify-center rounded-md bg-teal-700 text-white lg:hidden">
              <Activity className="h-5 w-5" />
            </div>
            <h2 className="text-3xl font-semibold tracking-tight text-slate-950">Acessar o AcompMedic</h2>
            <p className="text-sm leading-6 text-slate-600">Entre com email e senha para abrir o painel da clínica.</p>
          </div>
          <LoginForm />
        </div>
      </section>
    </main>
  );
}
