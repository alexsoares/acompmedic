import { z } from "zod";

const publicEnvSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
});

const parsedPublicEnv = publicEnvSchema.safeParse({
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
});

if (!parsedPublicEnv.success) {
  throw new Error(`Invalid public environment variables: ${parsedPublicEnv.error.message}`);
}

export const publicEnv = parsedPublicEnv.data;

export type PublicEnv = typeof publicEnv;
