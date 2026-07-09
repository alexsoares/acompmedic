import { APPOINTMENT_STATUS } from "@/lib/constants";

export type AppointmentStatus = (typeof APPOINTMENT_STATUS)[keyof typeof APPOINTMENT_STATUS];
