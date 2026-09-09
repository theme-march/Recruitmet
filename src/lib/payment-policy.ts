import { createHash } from "node:crypto";
import { z } from "zod";

export const moneySchema = z.coerce.number().finite().positive().max(100000000).multipleOf(0.01);
export const depositSchema = z.object({
  fileId: z.string().min(1), candidateId: z.string().optional(),
  type: z.string().trim().min(1).max(100), amount: moneySchema,
  currency: z.string().regex(/^[A-Z]{3}$/).default("BDT"),
  method: z.string().trim().min(1).max(50), reference: z.string().max(100).optional(),
  collectedAt: z.coerce.date().optional(), dueDate: z.coerce.date().optional(), note: z.string().max(1000).optional(),
  voucher: z.string().max(11_000_000).regex(/^data:(application\/pdf|image\/(png|jpeg));base64,[A-Za-z0-9+/=]+$/).optional(),
  fileName: z.string().max(150).optional(), nextStage: z.string().max(80).optional(),
  items: z.array(z.object({ category: z.string().min(1).max(100), description: z.string().max(300).optional(), amount: moneySchema })).optional(),
}).superRefine((input, context) => {
  if (input.items && Math.round(input.items.reduce((sum, item) => sum + item.amount, 0) * 100) !== Math.round(input.amount * 100)) {
    context.addIssue({ code: "custom", message: "Payment item total must equal payment amount", path: ["items"] });
  }
});
export const paymentHash = (value: string) => createHash("sha256").update(value).digest("hex");
export function paymentIdentity(userId: string, key: string, input: z.infer<typeof depositSchema>) {
  if (key.length < 12 || key.length > 200) throw new Error("A unique Idempotency-Key of 12–200 characters is required.");
  return { idempotencyKey: paymentHash(`${userId}:${key}`), requestHash: paymentHash(JSON.stringify(input)) };
}
