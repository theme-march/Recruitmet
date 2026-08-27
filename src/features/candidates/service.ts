import "server-only";

import type { z } from "zod";
import { can, officeScope } from "@/lib/authorization";
import { AppError } from "@/lib/errors";
import { prisma } from "@/lib/prisma";
import type { AwaitedSession } from "@/lib/types";
import type { candidateCreateSchema } from "./schemas";

type CandidateInput = z.infer<typeof candidateCreateSchema>;

export async function createCandidate(
  input: CandidateInput,
  session: NonNullable<AwaitedSession>,
) {
  if (!(await can(session, "registration", "Add"))) {
    throw new AppError("FORBIDDEN", "Add permission is required.", 403);
  }

  const identifiers = [
    { phone: input.phone },
    ...(input.passportNo ? [{ passportNo: input.passportNo }] : []),
    ...(input.nationalId ? [{ nationalId: input.nationalId }] : []),
  ];
  const duplicate = await prisma.candidate.findFirst({ where: { OR: identifiers } });
  if (duplicate) {
    throw new AppError(
      "DUPLICATE_CANDIDATE",
      `A candidate already exists as ${duplicate.candidateNo}.`,
      409,
    );
  }

  const { alternatePhones, ...candidateInput } = input;
  const suffix = Date.now().toString().slice(-8);

  return prisma.$transaction(async (tx) => {
    const candidate = await tx.candidate.create({
      data: {
        candidateNo: `CAN-${suffix}`,
        registrationNo: `REG-${suffix}`,
        ...candidateInput,
        officeId: session.user.officeId,
        status: "VERIFIED",
        phones: {
          create: [
            { phone: input.phone, isPrimary: true },
            ...alternatePhones.map((phone) => ({ phone, isPrimary: false })),
          ],
        },
      },
    });
    await tx.activityLog.create({
      data: {
        userId: session.userId,
        module: "Candidate",
        recordId: candidate.id,
        action: "CREATE",
        summary: `Registered ${candidate.candidateNo}`,
      },
    });
    await tx.auditLog.create({
      data: {
        userId: session.userId,
        role: session.user.role.name,
        module: "Candidate",
        recordId: candidate.id,
        action: "CREATE",
        newValue: {
          candidateNo: candidate.candidateNo,
          fullName: candidate.fullName,
          phone: candidate.phone,
        },
        correlationId: crypto.randomUUID(),
      },
    });
    return candidate;
  });
}

export async function listCandidates(
  input: { skip: number; take: number; q?: string },
  session: NonNullable<AwaitedSession>,
) {
  if (!(await can(session, "registration", "View"))) {
    throw new AppError("FORBIDDEN", "View permission is required.", 403);
  }
  const where = {
    ...officeScope(session),
    ...(input.q
      ? {
          OR: [
            { candidateNo: { contains: input.q } },
            { fullName: { contains: input.q } },
            { phone: { contains: input.q } },
            { passportNo: { contains: input.q } },
          ],
        }
      : {}),
  };
  const [data, total] = await Promise.all([
    prisma.candidate.findMany({
      where,
      skip: input.skip,
      take: input.take,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        candidateNo: true,
        registrationNo: true,
        fullName: true,
        phone: true,
        passportNo: true,
        profession: true,
        preferredCountry: true,
        status: true,
        createdAt: true,
        _count: { select: { files: true } },
      },
    }),
    prisma.candidate.count({ where }),
  ]);
  return { data, total };
}
