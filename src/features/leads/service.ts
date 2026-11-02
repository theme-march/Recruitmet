import "server-only";

import { can } from "@/lib/authorization";
import { AppError } from "@/lib/errors";
import { prisma } from "@/lib/prisma";
import type { AwaitedSession } from "@/lib/types";
import type { z } from "zod";
import type { followUpSchema, leadCreateSchema } from "./schemas";

type Session = NonNullable<AwaitedSession>;
type JsonRecord = Record<string, unknown>;

const asRecord = (value: unknown): JsonRecord =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as JsonRecord)
    : {};

const firstText = (...values: unknown[]) => {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return undefined;
};

const validDate = (...values: unknown[]) => {
  for (const value of values) {
    if (value instanceof Date && !Number.isNaN(value.getTime())) return value;
    if (typeof value === "string" && value.trim()) {
      const parsed = new Date(value);
      if (!Number.isNaN(parsed.getTime())) return parsed;
    }
  }
  return undefined;
};

const reference = (prefix: string) =>
  `${prefix}-${crypto.randomUUID().replaceAll("-", "").slice(0, 12).toUpperCase()}`;

const normalizeCountry = (value?: string | null) => {
  if (!value) return "Saudi Arabia";
  if (/saudi|ksa/i.test(value)) return "Saudi Arabia";
  if (/dubai|uae|emirates/i.test(value)) return "Dubai";
  return value;
};

export async function createLead(
  input: z.infer<typeof leadCreateSchema>,
  session: Session,
) {
  if (!(await can(session, "call-center", "Add"))) {
    throw new AppError("FORBIDDEN", "Add permission is required.", 403);
  }
  const duplicate = await prisma.workCall.findFirst({
    where: { phone: input.phone, status: { notIn: ["Closed", "Not Interested"] } },
  });
  if (duplicate) {
    throw new AppError(
      "DUPLICATE_LEAD",
      `An open lead already exists as ${duplicate.leadNo}.`,
      409,
    );
  }

  const leadNo = `LEAD-${Date.now().toString().slice(-8)}`;
  const notes = {
    profile: {
      dob: input.dob,
      gender: input.gender,
      nationalId: input.nationalId,
      maritalStatus: input.maritalStatus,
      email: input.email,
      address: input.address,
      district: input.district,
      passportStatus: input.passportStatus,
      passportNo: input.passportNo,
      education: input.education,
      passingYear: input.passingYear,
      experience: input.experience,
      skills: input.skills,
      bankLoan: input.bankLoan,
      xBidesh: input.xBidesh,
      workSubCategory: input.workSubCategory,
      demand: input.demand,
      proposedRate: input.proposedRate,
      salary: input.salary,
      behaviorTag: input.behaviorTag,
    },
    comments: input.comments,
  };

  return prisma.$transaction(async (tx) => {
    const lead = await tx.workCall.create({
      data: {
        leadNo,
        fullName: input.fullName,
        phone: input.phone,
        alternatePhones: input.alternatePhones,
        country: input.country,
        workCategory: input.workCategory,
        company: input.company,
        source: input.source,
        purpose: input.purpose,
        priority: input.priority,
        followUpAt: input.followUpAt,
        assignedToId: session.userId,
        status: "New",
        notes,
      },
    });
    if (input.followUpAt) {
      await tx.followUp.create({
        data: {
          leadId: lead.id,
          assignedToId: session.userId,
          dueAt: input.followUpAt,
          purpose: input.purpose || "Lead follow-up",
          status: "Pending",
        },
      });
    }
    await tx.auditLog.create({
      data: {
        userId: session.userId,
        role: session.user.role.name,
        module: "Office Operations",
        recordId: lead.id,
        action: "CREATE_LEAD",
        newValue: { leadNo, phone: input.phone, priority: input.priority },
        correlationId: crypto.randomUUID(),
      },
    });
    return lead;
  });
}

export async function addFollowUp(
  leadId: string,
  input: z.infer<typeof followUpSchema>,
  session: Session,
) {
  if (!(await can(session, "call-center", "Edit"))) {
    throw new AppError("FORBIDDEN", "Edit permission is required.", 403);
  }
  const lead = await prisma.workCall.findUnique({ where: { id: leadId } });
  if (!lead) throw new AppError("NOT_FOUND", "Lead not found.", 404);

  return prisma.$transaction(async (tx) => {
    const followUp = await tx.followUp.create({
      data: { leadId, assignedToId: session.userId, ...input, status: "Pending" },
    });
    await tx.workCall.update({
      where: { id: leadId },
      data: { followUpAt: input.dueAt, status: "Follow-up" },
    });
    await tx.notification.create({
      data: {
        recipient: session.userId,
        title: "Follow-up scheduled",
        message: `${lead.leadNo} is due ${input.dueAt.toISOString()}.`,
        type: "Follow-up Reminder",
        scheduledAt: input.reminderAt ?? input.dueAt,
        status: "Scheduled",
      },
    });
    return followUp;
  });
}

/** Both conversion APIs use this single candidate-and-file transaction. */
export async function convertLeadToFile(
  leadId: string,
  session: Session,
  options: { requireApproval?: boolean } = {},
) {
  const requiredAction = options.requireApproval ? "Approve" : "Edit";
  if (
    !(await can(session, "call-center", requiredAction)) ||
    !(await can(session, "call-center", "Create"))
  ) {
    throw new AppError(
      "FORBIDDEN",
      `${requiredAction} and Create permissions are required to convert a lead.`,
      403,
    );
  }

  const defaultOffice = session.user.officeId
    ? null
    : await prisma.office.findFirst({ select: { id: true } });
  const officeId = session.user.officeId || defaultOffice?.id || null;

  return prisma.$transaction(async (tx) => {
    const lead = await tx.workCall.findUnique({ where: { id: leadId } });
    if (!lead) throw new AppError("NOT_FOUND", "Lead not found.", 404);

    const notes = asRecord(lead.notes);
    const profile = asRecord(notes.profile);
    const identity = asRecord(notes.identity);
    const personal = asRecord(notes.personal);
    const passport = asRecord(notes.passport);
    const work = asRecord(notes.work);
    const passportNo = firstText(
      profile.passportNo,
      identity.passportNo,
      passport.passportNo,
      passport.passportNumber,
    );
    const nationalId = firstText(profile.nationalId, identity.nationalId);
    const email = firstText(profile.email, personal.email);

    let candidate = lead.candidateId
      ? await tx.candidate.findUnique({ where: { id: lead.candidateId } })
      : null;
    let candidateCreated = false;
    if (!candidate) {
      const identifiers = [
        { phone: lead.phone, fullName: lead.fullName },
        ...(passportNo ? [{ passportNo }] : []),
        ...(nationalId ? [{ nationalId }] : []),
        ...(email ? [{ email }] : []),
      ];
      candidate = await tx.candidate.findFirst({ where: { OR: identifiers } });
    }
    if (!candidate) {
      candidate = await tx.candidate.create({
        data: {
          candidateNo: reference("CAN"),
          registrationNo: reference("REG"),
          fullName: lead.fullName,
          phone: lead.phone,
          passportNo,
          nationalId,
          email,
          dob: validDate(profile.dob, identity.dob),
          gender: firstText(profile.gender, personal.gender),
          maritalStatus: firstText(profile.maritalStatus, personal.maritalStatus),
          address: firstText(profile.address, personal.address),
          district: firstText(profile.district, personal.district),
          education: firstText(profile.education, personal.education),
          experience: firstText(profile.experience, personal.experience),
          profession: lead.workCategory || firstText(work.category) || "General Worker",
          preferredCountry: normalizeCountry(lead.country),
          source: lead.source,
          officeId,
          status: "ACTIVE",
          phones: { create: { phone: lead.phone, isPrimary: true } },
        },
      });
      candidateCreated = true;
    }

    let file = await tx.processingFile.findFirst({
      where: {
        candidateId: candidate.id,
        status: { notIn: ["RETURNED", "CANCELLED", "ARCHIVED", "EXPIRED"] },
      },
      orderBy: { updatedAt: "desc" },
    });
    let fileCreated = false;
    const country = normalizeCountry(lead.country || candidate.preferredCountry);
    const profession =
      lead.workCategory || firstText(work.category) || candidate.profession || "General Worker";
    const company = lead.company || firstText(work.company);
    if (file) {
      file = await tx.processingFile.update({
        where: { id: file.id },
        data: { country, profession, company: company || file.company, status: "ACTIVE" },
      });
    } else {
      file = await tx.processingFile.create({
        data: {
          fileNo: reference("FILE"),
          candidateId: candidate.id,
          country,
          profession,
          company,
          currentStage: "Passport Entry",
          status: "ACTIVE",
          officeId,
          assignedToId: session.userId,
        },
      });
      fileCreated = true;
    }

    if (passportNo) {
      const existingPassport = await tx.passportProcess.findUnique({
        where: { passportNumber: passportNo },
      });
      const filePassport = await tx.passportProcess.findUnique({ where: { fileId: file.id } });
      if (!existingPassport && !filePassport) {
        const issueDate = validDate(passport.issueDate, identity.issueDate) ?? new Date();
        const suppliedExpiry = validDate(passport.expiryDate, identity.expiryDate);
        const expiryDate = suppliedExpiry ?? new Date(issueDate);
        if (!suppliedExpiry) expiryDate.setFullYear(expiryDate.getFullYear() + 10);
        await tx.passportProcess.create({
          data: {
            fileId: file.id,
            passportNumber: passportNo,
            passportType: firstText(passport.passportType) || "Ordinary",
            issueDate,
            expiryDate,
            verificationStatus: "Verified",
            enteredBy: session.user.name,
          },
        });
      }
    }

    await tx.workCall.update({
      where: { id: lead.id },
      data: { candidateId: candidate.id, status: "Converted" },
    });
    if (lead.status !== "Converted" || candidateCreated || fileCreated) {
      await tx.auditLog.create({
        data: {
          userId: session.userId,
          role: session.user.role.name,
          module: "Office Operations",
          recordId: lead.id,
          action: "CONVERT_LEAD_TO_FILE",
          oldValue: { status: lead.status },
          newValue: {
            status: "Converted",
            candidateNo: candidate.candidateNo,
            fileNo: file.fileNo,
          },
          correlationId: crypto.randomUUID(),
        },
      });
      await tx.activityLog.create({
        data: {
          userId: session.userId,
          module: "call-center",
          recordId: lead.id,
          action: "CONVERT_TO_FILE",
          summary: `Converted lead ${lead.leadNo} to processing file ${file.fileNo} for ${lead.fullName}`,
        },
      });
    }
    return { candidate, file, candidateCreated, fileCreated };
  });
}

export async function convertLead(leadId: string, session: Session) {
  const { candidate } = await convertLeadToFile(leadId, session, {
    requireApproval: true,
  });
  return candidate;
}
