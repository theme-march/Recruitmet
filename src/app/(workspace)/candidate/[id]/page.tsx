import type { Metadata } from "next";
import { connection } from "next/server";
import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

export async function generateMetadata(): Promise<Metadata> {
  return { title: "Candidate Profile | Orbit Overseas" };
}

export default async function CandidateProfileRedirectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await connection();
  const session = await getSession();
  if (!session) redirect("/login");

  const { id } = await params;

  // Search candidate by ID, candidateNo, or passportNo
  const candidate = await prisma.candidate.findFirst({
    where: {
      OR: [
        { id },
        { candidateNo: id },
        { passportNo: id },
        { phone: id },
      ],
    },
    include: {
      files: {
        orderBy: { updatedAt: "desc" },
        take: 1,
        select: { id: true, fileNo: true },
      },
    },
  });

  if (candidate?.files?.[0]) {
    redirect(`/file/${candidate.files[0].id}?view=pipeline`);
  }

  // Also check if id directly matches a processing file
  const directFile = await prisma.processingFile.findFirst({
    where: {
      OR: [{ id }, { fileNo: id }],
    },
    select: { id: true },
  });

  if (directFile) {
    redirect(`/file/${directFile.id}?view=pipeline`);
  }

  if (candidate) {
    // Registered candidate without an active processing file yet -> redirect to candidates list
    redirect(`/candidates?q=${encodeURIComponent(candidate.candidateNo)}`);
  }

  notFound();
}
