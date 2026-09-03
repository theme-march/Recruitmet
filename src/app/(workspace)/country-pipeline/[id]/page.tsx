import type { Metadata } from "next";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { CountryPipelineDetail } from "@/components/modules/country-pipeline-detail";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const country = await prisma.country.findFirst({
    where: { OR: [{ id }, { code: id }, { name: id }] },
    select: { name: true, code: true },
  });

  return {
    title: country ? `${country.name} Recruitment Pipeline | Orbit Overseas` : "Country Pipeline | Orbit Overseas",
  };
}

export default async function CountryPipelinePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await connection();
  const session = await getSession();
  if (!session) redirect("/login");

  const { id } = await params;
  return <CountryPipelineDetail countryId={id} />;
}
