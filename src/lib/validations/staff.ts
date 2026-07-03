import { z } from "zod";
import { ROLES } from "@/lib/rbac";

export const createStaffAccountSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Enter a valid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  role: z.enum(ROLES),
  phone: z.string().optional(),
});

export type CreateStaffAccountInput = z.infer<typeof createStaffAccountSchema>;

export const attendanceStatusValues = [
  "PRESENT",
  "ABSENT",
  "HALF_DAY",
  "LEAVE",
  "HOLIDAY",
] as const;

export const markAttendanceSchema = z.object({
  userId: z.string().min(1, "Select a staff member"),
  date: z.string().min(1, "Date is required"),
  status: z.enum(attendanceStatusValues),
  note: z.string().optional(),
});

export type MarkAttendanceInput = z.infer<typeof markAttendanceSchema>;

export const setStaffTargetSchema = z.object({
  userId: z.string().min(1, "Select a staff member"),
  periodMonth: z.string().min(1, "Month is required"),
  targetAmount: z.coerce.number().positive("Target must be greater than 0"),
});

export type SetStaffTargetInput = z.output<typeof setStaffTargetSchema>;
export type SetStaffTargetFormValues = z.input<typeof setStaffTargetSchema>;
