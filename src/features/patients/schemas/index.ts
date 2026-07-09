import { z } from "zod";

export const patientSchema = z.object({
  fullName: z.string().min(3).max(150),
  cpf: z.string().trim().min(11).max(14),
  email: z.email().nullable().optional(),
  phone: z.string().trim().min(8).max(20).nullable().optional(),
});
