"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

import { createSupabaseBrowserClient } from "@/server/supabase/browser";

type Mode = "login" | "signup";

export function LoginForm() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("login");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const formData = new FormData(event.currentTarget);
    const email = String(formData.get("email") ?? "");
    const password = String(formData.get("password") ?? "");
    const fullName = String(formData.get("fullName") ?? "");
    const supabase = createSupabaseBrowserClient();

    const result =
      mode === "login"
        ? await supabase.auth.signInWithPassword({ email, password })
        : await supabase.auth.signUp({
            email,
            password,
            options: {
              data: { full_name: fullName },
            },
          });

    if (result.error) {
      setError(result.error.message);
      setIsSubmitting(false);
      return;
    }

    await fetch("/api/auth/provision", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fullName }),
    });

    router.replace("/dashboard");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {mode === "signup" ? (
        <label className="grid gap-2 text-sm font-medium text-slate-700">
          Nome completo
          <input
            name="fullName"
            required
            className="h-11 rounded-md border border-slate-300 bg-white px-3 text-sm outline-none focus:border-teal-700"
          />
        </label>
      ) : null}

      <label className="grid gap-2 text-sm font-medium text-slate-700">
        Email
        <input
          name="email"
          type="email"
          required
          className="h-11 rounded-md border border-slate-300 bg-white px-3 text-sm outline-none focus:border-teal-700"
        />
      </label>

      <label className="grid gap-2 text-sm font-medium text-slate-700">
        Senha
        <input
          name="password"
          type="password"
          required
          minLength={6}
          className="h-11 rounded-md border border-slate-300 bg-white px-3 text-sm outline-none focus:border-teal-700"
        />
      </label>

      {error ? <p className="rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p> : null}

      <button
        type="submit"
        disabled={isSubmitting}
        className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-md bg-teal-700 px-4 text-sm font-semibold text-white transition hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
        {mode === "login" ? "Entrar" : "Criar conta"}
      </button>

      <button
        type="button"
        onClick={() => setMode(mode === "login" ? "signup" : "login")}
        className="w-full text-center text-sm font-medium text-teal-800 hover:text-teal-950"
      >
        {mode === "login" ? "Criar novo acesso" : "Já tenho acesso"}
      </button>
    </form>
  );
}
