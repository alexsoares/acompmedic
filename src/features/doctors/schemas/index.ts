import { z } from "zod";

export const doctorSchema = z.object({
  fullName: z.string().min(3).max(150),
  crm: z.string().trim().min(3).max(30),
  specialty: z.string().trim().min(2).max(100),
  email: z.email().nullable().optional(),
});
