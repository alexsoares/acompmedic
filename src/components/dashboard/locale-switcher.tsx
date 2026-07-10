"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateUserLocale } from "@/actions/dashboard-actions";

type LocaleSwitcherProps = {
  currentLocale: string;
  isLoggedIn: boolean;
};

export function LocaleSwitcher({ currentLocale, isLoggedIn }: LocaleSwitcherProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function onChange(locale: string) {
    startTransition(async () => {
      // Set the language cookie
      document.cookie = `NEXT_LOCALE=${locale}; path=/; max-age=31536000; SameSite=Lax`;

      // Persist in the database profile if logged in
      if (isLoggedIn) {
        try {
          await updateUserLocale(locale);
        } catch (err) {
          console.error("Failed to persist user locale:", err);
        }
      }

      router.refresh();
    });
  }

  return (
    <select
      disabled={isPending}
      value={currentLocale}
      onChange={(e) => onChange(e.target.value)}
      className="h-10 rounded-md border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 outline-none focus:border-teal-700 focus:ring-1 focus:ring-teal-700 disabled:opacity-50"
    >
      <option value="pt-BR">Português (PT-BR)</option>
      <option value="en-US">English (EN-US)</option>
    </select>
  );
}
