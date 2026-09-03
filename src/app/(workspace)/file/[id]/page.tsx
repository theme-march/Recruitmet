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
  const { id } = await params;
  const file = await prisma.processingFile.findFirst({
    where: { OR: [{ id }, { fileNo: id }] },
    select: { fileNo: true, candidate: { select: { fullName: true } } },
  });

  if (!file) {
    return {
      title: "Candidate File Not Found | Orbit Overseas",
    };
  }

  return {
    title: `File ${file.fileNo} - ${file.candidate.fullName} | Orbit Recruitment OS`,
    description: `Dossier and recruitment lifecycle workflow for file ${file.fileNo}`,
  };
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
    select: { id: true, fileNo: true },
  });

  if (!file) {
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
