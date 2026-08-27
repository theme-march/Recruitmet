import { z } from "zod";
export const passwordSchema=z.string().min(10,"Password must be at least 10 characters").regex(/[A-Z]/,"Add an uppercase letter").regex(/[a-z]/,"Add a lowercase letter").regex(/[0-9]/,"Add a number").regex(/[^A-Za-z0-9]/,"Add a special character");
export const loginSchema=z.object({identity:z.string().min(3).max(190),password:z.string().min(8).max(128),remember:z.boolean().optional(),captchaToken:z.string().optional()});
export const forgotSchema=z.object({identity:z.string().min(3).max(190)});
export const resetSchema=z.object({token:z.string().min(32),password:passwordSchema,confirmPassword:z.string()}).refine(v=>v.password===v.confirmPassword,{message:"Passwords do not match",path:["confirmPassword"]});
export const changeSchema=z.object({currentPassword:z.string().min(8),password:passwordSchema,confirmPassword:z.string()}).refine(v=>v.password===v.confirmPassword,{message:"Passwords do not match",path:["confirmPassword"]});
