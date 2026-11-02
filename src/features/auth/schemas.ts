import { z } from "zod";

export const passwordSchema = z
  .string()
  .min(10, "Password must be at least 10 characters")
  .regex(/[A-Z]/, "Add an uppercase letter")
  .regex(/[a-z]/, "Add a lowercase letter")
  .regex(/[0-9]/, "Add a number")
  .regex(/[^A-Za-z0-9]/, "Add a special character");

export const loginSchema = z.object({
  identity: z
    .string()
    .min(3, "Username or email must be at least 3 characters")
    .max(190, "Username or email must not exceed 190 characters"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(128, "Password must not exceed 128 characters"),
  remember: z.boolean().optional(),
  captchaToken: z.string().optional(),
});

export const forgotSchema = z.object({
  identity: z.string().min(3, "Username or email must be at least 3 characters").max(190),
});

export const resetSchema = z
  .object({
    token: z.string().min(32, "Invalid recovery token"),
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((v) => v.password === v.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export const changeSchema = z
  .object({
    currentPassword: z.string().min(8, "Current password is required"),
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((v) => v.password === v.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });
