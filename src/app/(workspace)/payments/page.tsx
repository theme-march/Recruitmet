import type { Metadata } from "next";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { PaymentCollectionPage } from "@/components/modules/payment-collection-page";

export const metadata: Metadata = {
  title: "Accounts & Payment Collection | Orbit Overseas",
  description: "Candidate payment ledger, installment vouchers, and receipt management",
};

export default async function PaymentsRoutePage() {
  await connection();
  const session = await getSession();
  if (!session) redirect("/login");

  return <PaymentCollectionPage />;
}
