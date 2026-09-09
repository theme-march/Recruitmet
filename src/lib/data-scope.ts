import type { Prisma } from "@prisma/client";
type ScopeActor = { user: { officeId: string | null; role: { name: string } } } | null;

// Preserve the existing shared/unassigned-record policy, but apply it to the
// payment's linked record rather than treating module access as global access.
export function paymentScope(session: ScopeActor): Prisma.PaymentWhereInput {
  if (!session) return { id: { in: [] } };
  if (session.user.role.name === "Super Administrator" || !session.user.officeId) return {};
  const office = { OR: [{ officeId: session.user.officeId }, { officeId: null }] };
  return { OR: [{ file: { is: office } }, { fileId: null, candidate: { is: office } }] };
}
