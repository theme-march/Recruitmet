import { can } from "@/lib/authorization";
import { countryModule } from "@/lib/permission-policy";
import type { Metadata } from "next";
import { connection } from "next/server";
import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { FileProcessingWorkspace } from "@/components/modules/file-processing-workspace";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  return { title: "Candidate Dossier | Orbit Overseas" };
}

export default async function FilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await connection();
  const session = await getSession();
  if (!session) redirect("/login");

  const { id } = await params;

  // Verify file exists on server before client render
  const file = await prisma.processingFile.findFirst({
    where: {
      OR: [{ id }, { fileNo: id }],
    },
    select: { id: true, fileNo: true, country: true },
  });

  if (file && !await can(session, countryModule(file.country), "read") && !await can(session, "files", "read")) redirect("/dashboard");
  if (!file) {
    if (!await can(session, "call-center", "read")) redirect("/dashboard");
    const workCall = await prisma.workCall.findFirst({
      where: { OR: [{ id }, { leadNo: id }] },
      select: { id: true },
    });
    if (!workCall) {
      notFound();
    }
  }

  return <FileProcessingWorkspace fileId={file?.id || id} />;
}
