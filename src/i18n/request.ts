import { getRequestConfig } from "next-intl/server";
import { cookies } from "next/headers";

export default getRequestConfig(async () => {
  const cookieStore = await cookies();
  const locale = cookieStore.get("NEXT_LOCALE")?.value || "pt-BR";

  return {
    locale,
    messages: {
      common: (await import(`../../messages/${locale}/common.json`)).default,
      auth: (await import(`../../messages/${locale}/auth.json`)).default,
      dashboard: (await import(`../../messages/${locale}/dashboard.json`)).default,
      patients: (await import(`../../messages/${locale}/patients.json`)).default,
      doctors: (await import(`../../messages/${locale}/doctors.json`)).default,
      appointments: (await import(`../../messages/${locale}/appointments.json`)).default,
      reports: (await import(`../../messages/${locale}/reports.json`)).default,
    },
  };
});
