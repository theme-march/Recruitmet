import { z } from "zod";
import { can } from "@/lib/authorization";
import { AppError, errorResponse } from "@/lib/errors";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { Prisma } from "@prisma/client";

const optionalText = z.string().trim().max(500).optional().default("");
const schema = z.object({
  interviewOption: z.enum(["With Interview", "Without Interview"]),
  interviewScheduleId: optionalText,
  interviewDate: optionalText,
  workCategory: optionalText,
  workSubCategory: optionalText,
  company: optionalText,
  interviewStatus: optionalText,
  fileStatus: optionalText,
  fullName: z.string().trim().min(2).max(150),
  phone: z.string().trim().min(7).max(25),
  additionalPhones: z.array(z.string().trim().max(25)).default([]),
  dob: optionalText,
  age: optionalText,
  passportStatus: optionalText,
  passportNo: optionalText,
  expertIn: optionalText,
  country: z.string().trim().min(2).max(100),
  district: optionalText,
  maritalStatus: optionalText,
  education: optionalText,
  passingYear: optionalText,
  bankLoan: optionalText,
  xBidesh: optionalText,
  email: z.union([z.literal(""), z.email()]).optional().default(""),
  proposedRate: optionalText.default("350000"),
  priority: z.coerce.number().int().min(1).max(5).optional().default(3),
  officeVisit: optionalText.default("Scheduled"),
  callSource: optionalText.default("Direct"),
  agent: optionalText,
  agentId: optionalText,
  callPurpose: optionalText.default("Overseas Employment"),
  behaviorTag: optionalText.default("Highly Interested"),
  callStatus: optionalText.default("New"),
  followUpDate: optionalText,
  followUp1: optionalText,
  followUp2: optionalText,
  followUp3: optionalText,
  workerComments: z.array(z.string().trim().max(2000)).default([]),
  executiveComments: z.array(z.string().trim().max(2000)).default([]),
  adminComments: z.array(z.string().trim().max(2000)).default([]),
});

const validDate = (value: string) => value && !Number.isNaN(new Date(value).getTime()) ? new Date(value) : null;
const jsonObject = (value: unknown) => value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};

export async function GET(request: Request) {
  try {
    const session = await getSession();
    if (!session) throw new AppError("UNAUTHORIZED", "Sign in is required.", 401);
    if (!(await can(session, "call-center", "View"))) throw new AppError("FORBIDDEN", "View permission is required.", 403);
    const url = new URL(request.url);
    const q = (url.searchParams.get("q") ?? "").trim();
    const country = url.searchParams.get("country") || undefined;
    const callStatus = url.searchParams.get("callStatus") || undefined;
    const priority = Number(url.searchParams.get("priority")) || undefined;
    const phone = (url.searchParams.get("phone") ?? "").trim();
    const interviewSchedule = url.searchParams.get("interviewSchedule") || undefined;
    const fileStatus = url.searchParams.get("fileStatus") || undefined;
    const interviewStatus = url.searchParams.get("interviewStatus") || undefined;
    const selectedSummary = url.searchParams.get("summary") || undefined;
    const page = Math.max(1, Number(url.searchParams.get("page")) || 1);
    const pageSize = Math.min(100, Math.max(10, Number(url.searchParams.get("pageSize")) || 25));
    const countryWhere =
      country && country !== "All"
        ? country === "Other Country" || country === "Other"
          ? {
              NOT: [
                { country: { contains: "Saudi" } },
                { country: { contains: "KSA" } },
                { country: { contains: "Dubai" } },
                { country: { contains: "UAE" } },
              ],
            }
          : { country: { contains: country } }
        : {};

    const rows = await prisma.workCall.findMany({
      where: {
        ...countryWhere,
        ...(callStatus ? { status: callStatus } : {}),
        ...(priority ? { priority } : {}),
        ...(phone ? { phone: { contains: phone } } : {}),
        ...(q ? { OR: [{ leadNo: { contains: q } }, { fullName: { contains: q } }, { phone: { contains: q } }, { country: { contains: q } }] } : {}),
      },
      include: {
        assignedTo: true,
        candidate: {
          include: {
            files: {
              select: { id: true, fileNo: true, currentStage: true, country: true },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 2000,
    });

    const enriched = rows.map((row) => {
      const notes = jsonObject(row.notes);
      const interview = jsonObject(notes.interview);
      const work = jsonObject(notes.work);
      const identity = jsonObject(notes.identity);
      const personal = jsonObject(notes.personal);
      const control = jsonObject(notes.control);
      const policy = jsonObject(notes.policy);
      const activeFile = row.candidate?.files?.[0];

      return {
        id: row.id,
        leadNo: row.leadNo,
        fileId: activeFile?.id ?? String(work.processingFileId ?? ""),
        fileNo: activeFile?.fileNo ?? String(work.fileNo ?? ""),
        fullName: row.fullName,
        phone: row.phone,

        additionalPhones: (row.alternatePhones as string[]) ?? [],
        country: row.country ?? "—",
        dataType: "NEW LEAD",
        executive: row.assignedTo?.name ?? "Unassigned",
        priority: row.priority,
        callStatus: row.status,
        fileStatus: String(work.fileStatus ?? "New"),
        callPurpose: row.purpose,
        callSource: row.source,
        proposedRate: String(work.proposedRate ?? ""),
        behaviorTag: String(control.behaviorTag ?? "Interested"),
        officeVisit: String(control.officeVisit ?? "Not Required"),
        dob: String(identity.dob ?? ""),
        age: String(identity.age ?? ""),
        passportStatus: String(identity.passportStatus ?? "Not Available"),
        passportNo: String(identity.passportNo ?? ""),
        expertIn: String(identity.expertIn ?? ""),
        district: String(personal.district ?? "—"),
        maritalStatus: String(personal.maritalStatus ?? "—"),
        education: String(personal.education ?? "—"),
        passingYear: String(personal.passingYear ?? ""),
        bankLoan: String(personal.bankLoan ?? "Not Required"),
        xBidesh: String(personal.xBidesh ?? "Not Registered"),
        email: String(personal.email ?? ""),
        interviewOption: String(interview.option ?? "Without Interview"),
        interviewStatus: String(interview.status ?? "Not Scheduled"),
        interviewScheduleId: String(interview.scheduleId ?? ""),
        interviewSchedule: String(interview.scheduleTitle ?? "—"),
        interviewDate: String(interview.date ?? ""),
        workCategory: String(work.category ?? row.workCategory ?? "—"),
        workSubCategory: String(work.subCategory ?? "—"),
        company: String(work.company ?? row.company ?? "—"),
        workerComments: (policy.workerComments as string[]) ?? [],
        executiveComments: (policy.executiveComments as string[]) ?? [],
        adminComments: (policy.adminComments as string[]) ?? [],
        followUpAt: row.followUpAt?.toISOString() ?? null,
        createdAt: row.createdAt.toISOString(),
      };
    });

    const summaryMatch = (row: (typeof enriched)[number], summary: string) => summary === "All" || row.fileStatus === summary || row.interviewStatus === summary || row.callStatus === summary || (summary === "Pre Confirm" && row.fileStatus === "Pre-Confirmed") || (summary === "Call Back & PP" && /call.?back|passport/i.test(`${row.callStatus} ${row.fileStatus}`));
    const summaryLabels = ["All", "Pre Confirm", "Confirm", "Call Back & PP", "Received PP", "Registration Done", "Interview Present", "Interview Absent", "Rescheduled", "Interview Cancelled", "Converted", "Not Interested"];
    const summary = Object.fromEntries(summaryLabels.map((label) => [label, enriched.filter((row) => summaryMatch(row, label)).length]));
    const filtered = enriched.filter((row) => (!interviewSchedule || row.interviewScheduleId === interviewSchedule) && (!fileStatus || row.fileStatus === fileStatus) && (!interviewStatus || row.interviewStatus === interviewStatus) && (!selectedSummary || summaryMatch(row, selectedSummary)));
    const start = (page - 1) * pageSize;
    return Response.json({ data: filtered.slice(start, start + pageSize), summary, meta: { page, pageSize, total: filtered.length, totalPages: Math.max(1, Math.ceil(filtered.length / pageSize)) } });
  } catch (error) { return errorResponse(error); }
}

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) throw new AppError("UNAUTHORIZED", "Sign in is required.", 401);
    if (!(await can(session, "call-center", "Add"))) throw new AppError("FORBIDDEN", "Add permission is required.", 403);
    const input = schema.parse(await request.json());
    const schedule = input.interviewScheduleId ? await prisma.interviewSchedule.findUnique({ where: { id: input.interviewScheduleId } }) : null;
    if (input.interviewOption === "With Interview" && input.interviewScheduleId && !schedule) throw new AppError("SCHEDULE_NOT_FOUND", "Selected interview schedule was not found.", 404);
    const primaryFollowUp = validDate(input.followUpDate) ?? validDate(input.followUp1);
    const record = await prisma.$transaction(async (tx) => {
      let candidate = await tx.candidate.findFirst({ where: { phone: input.phone, fullName: input.fullName } });
      const candDob = validDate(input.dob);
      if (!candidate) {
        candidate = await tx.candidate.create({
          data: {
            candidateNo: `CAN-${Date.now().toString().slice(-7)}`,
            fullName: input.fullName,
            phone: input.phone,
            preferredCountry: input.country,
            profession: input.workCategory || input.expertIn || "Worker",
            district: input.district || null,
            email: input.email || null,
            dob: candDob,
            passportNo: input.passportNo || null,
            maritalStatus: input.maritalStatus || null,
            education: input.education || null,
            status: "ACTIVE",
            source: input.agent || input.callSource || "Direct",
            officeId: session.user.officeId || null,
          },
        });
      } else {
        await tx.candidate.update({
          where: { id: candidate.id },
          data: {
            passportNo: input.passportNo || candidate.passportNo || null,
            dob: candDob || candidate.dob || null,
            profession: input.workCategory || input.expertIn || candidate.profession || "Worker",
            district: input.district || candidate.district || null,
            source: input.agent || input.callSource || candidate.source || "Direct",
          },
        });
      }

      // Unconditionally create Processing File for candidate so they can be processed immediately
      const fileNo = `FILE-${Math.floor(100000 + Math.random() * 900000)}`;
      const countryNormalized = input.country.includes("Saudi") ? "Saudi Arabia" : input.country.includes("Dubai") ? "Dubai" : input.country;
      const processingFile = await tx.processingFile.create({
        data: {
          fileNo,
          candidateId: candidate.id,
          country: countryNormalized,
          currentStage: "Passport Entry",
          status: "ACTIVE",
          profession: input.workCategory || input.expertIn || "General Worker",
          company: input.company || schedule?.company || (countryNormalized === "Saudi Arabia" ? "Saudi Binladen Group" : "Dubai Workforce Co."),
          agent: input.agent || input.callSource || "Direct",
          assignedToId: session.userId,
          officeId: session.user.officeId || null,
        },
      });

      if (input.passportNo) {
        await tx.passportProcess.create({
          data: {
            fileId: processingFile.id,
            passportNumber: input.passportNo,
            passportType: "Ordinary",
            issueDate: new Date("2023-01-01"),
            expiryDate: new Date("2033-01-01"),
            verificationStatus: "Verified",
          },
        }).catch(() => {});
      }

      if (input.interviewOption === "With Interview" && schedule) {
        await tx.interview.create({
          data: {
            candidateId: candidate.id,
            scheduleId: schedule.id,
            title: schedule.title,
            company: schedule.company,
            profession: input.workSubCategory || input.workCategory || schedule.profession || "Driver",
            scheduledAt: validDate(input.interviewDate) ?? schedule.scheduledAt,
            result: input.interviewStatus || "Waiting For Interview",
          },
        });
      }

      const lead = await tx.workCall.create({ data: {
        leadNo: `LEAD-${Date.now().toString().slice(-8)}`,
        candidateId: candidate.id,
        fullName: input.fullName,
        phone: input.phone,
        alternatePhones: input.additionalPhones.filter(Boolean),
        country: input.country,
        workCategory: input.workCategory || input.expertIn || null,
        company: input.company || schedule?.company || null,
        source: input.callSource || "Direct",
        purpose: input.callPurpose,
        priority: input.priority,
        status: input.callStatus,
        followUpAt: primaryFollowUp,
        assignedToId: session.userId,
        notes: {
          interview: { option: input.interviewOption, scheduleId: schedule?.id, scheduleTitle: schedule?.title, date: input.interviewDate, status: input.interviewStatus },
          work: { category: input.workCategory, subCategory: input.workSubCategory, company: input.company, fileStatus: input.fileStatus, proposedRate: input.proposedRate, processingFileId: processingFile?.id || null, fileNo: processingFile?.fileNo || null },
          identity: { dob: input.dob, age: input.age, passportStatus: input.passportStatus, passportNo: input.passportNo, expertIn: input.expertIn },
          personal: { district: input.district, maritalStatus: input.maritalStatus, education: input.education, passingYear: input.passingYear, bankLoan: input.bankLoan, xBidesh: input.xBidesh, email: input.email },
          control: { officeVisit: input.officeVisit, behaviorTag: input.behaviorTag },
          policy: { workerComments: input.workerComments.filter(Boolean), executiveComments: input.executiveComments.filter(Boolean), adminComments: input.adminComments.filter(Boolean) },
        },
      } });
      const followUps = [input.followUpDate, input.followUp1, input.followUp2, input.followUp3].map(validDate).filter((item): item is Date => Boolean(item));
      if (followUps.length) await tx.followUp.createMany({ data: followUps.map((dueAt, index) => ({ leadId: lead.id, assignedToId: session.userId, dueAt, purpose: input.callPurpose, status: "Pending", note: `Follow-up ${index + 1}` })) });
      await tx.auditLog.create({ data: { userId: session.userId, role: session.user.role.name, module: "call-center", recordId: lead.id, action: "CREATE_WORK_CALL", newValue: input, correlationId: crypto.randomUUID() } });
      await tx.activityLog.create({ data: { userId: session.userId, module: "call-center", recordId: lead.id, action: "CREATE", summary: `Created work call ${lead.leadNo}` } });
      return lead;
    });
    return Response.json({ data: { id: record.id, leadNo: record.leadNo } }, { status: 201 });
  } catch (error) { return errorResponse(error); }
}

const updateSchema = z.object({
  id: z.string().min(1),
  fileStatus: z.string().optional(),
  callStatus: z.string().optional(),
  priority: z.coerce.number().int().min(1).max(5).optional(),
  interviewScheduleId: z.string().optional(),
  interviewStatus: z.string().optional(),
  interviewDate: z.string().optional(),
  comment: z.string().optional(),
  commentType: z.enum(["worker", "executive", "admin"]).optional().default("executive"),
  followUpDate: z.string().optional(),
});

export async function PATCH(request: Request) {
  try {
    const session = await getSession();
    if (!session) throw new AppError("UNAUTHORIZED", "Sign in is required.", 401);

    const input = updateSchema.parse(await request.json());
    const lead = await prisma.workCall.findUnique({ where: { id: input.id } });
    if (!lead) throw new AppError("NOT_FOUND", "Work call lead not found.", 404);

    const notes = jsonObject(lead.notes);
    const work = jsonObject(notes.work);
    const interview = jsonObject(notes.interview);
    const policy = jsonObject(notes.policy);

    // Update File Status
    if (input.fileStatus) {
      work.fileStatus = input.fileStatus;
      if (input.fileStatus === "Pre-Confirmed" || input.fileStatus === "Confirm" || input.fileStatus === "Received PP") {
        if (lead.candidateId) {
          await prisma.processingFile.updateMany({
            where: { candidateId: lead.candidateId },
            data: { status: "ACTIVE", currentStage: input.fileStatus === "Received PP" ? "Medical" : "Passport Entry" },
          });
        }
      }
    }

    // Update Call Status
    let newStatus = lead.status;
    if (input.callStatus) {
      newStatus = input.callStatus;
    }

        // Update Interview Schedule
    if (input.interviewScheduleId !== undefined) {
      if (input.interviewScheduleId) {
        const schedule = await prisma.interviewSchedule.findUnique({ where: { id: input.interviewScheduleId } });
        if (schedule) {
          interview.scheduleId = schedule.id;
          interview.scheduleTitle = schedule.title;
          interview.option = "With Interview";
          interview.status = input.interviewStatus || "Waiting For Interview";
          if (schedule.scheduledAt) {
            interview.date = schedule.scheduledAt.toISOString();
          }

          let candId = lead.candidateId;
          if (!candId) {
            const newCand = await prisma.candidate.create({
              data: {
                candidateNo: `CAN-${Date.now().toString().slice(-7)}`,
                fullName: lead.fullName,
                phone: lead.phone,
                preferredCountry: lead.country || "Saudi Arabia",
                status: "ACTIVE",
              },
            });
            candId = newCand.id;
            await prisma.workCall.update({ where: { id: lead.id }, data: { candidateId: candId } });
          } else {
            await prisma.candidate.update({
              where: { id: candId },
              data: { fullName: lead.fullName },
            });
          }

          const existingInv = await prisma.interview.findFirst({
            where: { candidateId: candId, scheduleId: schedule.id },
          });

          if (existingInv) {
            await prisma.interview.update({
              where: { id: existingInv.id },
              data: {
                title: schedule.title,
                company: schedule.company,
                profession: schedule.profession,
                scheduledAt: schedule.scheduledAt,
                result: input.interviewStatus || "Waiting For Interview",
              },
            });
          } else {
            await prisma.interview.create({
              data: {
                candidateId: candId,
                scheduleId: schedule.id,
                title: schedule.title,
                company: schedule.company,
                profession: schedule.profession,
                scheduledAt: schedule.scheduledAt,
                result: input.interviewStatus || "Waiting For Interview",
              },
            });
          }
        }
      } else {
        interview.scheduleId = null;
        interview.scheduleTitle = "—";
        interview.status = "Not Scheduled";
      }
    }

    if (input.interviewStatus && interview.scheduleId) {
      interview.status = input.interviewStatus;
    }

    // Add comment
    if (input.comment?.trim()) {
      const typeKey = input.commentType === "admin" ? "adminComments" : input.commentType === "worker" ? "workerComments" : "executiveComments";
      const existing = (policy[typeKey] as string[]) || [];
      policy[typeKey] = [...existing, `${input.comment.trim()} (by ${session.user.name} on ${new Date().toLocaleDateString()})`];
    }

    // Follow up date
    let followUpAt = lead.followUpAt;
    if (input.followUpDate) {
      followUpAt = validDate(input.followUpDate);
      if (followUpAt) {
        await prisma.followUp.create({
          data: {
            leadId: lead.id,
            assignedToId: session.userId,
            dueAt: followUpAt,
            purpose: lead.purpose || "Follow-up",
            status: "Pending",
            note: `Follow-up set by ${session.user.name}`,
          },
        });
      }
    }

    const updated = await prisma.workCall.update({
      where: { id: input.id },
      data: {
        status: newStatus,
        priority: input.priority ?? lead.priority,
        followUpAt,
        notes: {
          ...notes,
          work,
          interview,
          policy,
        } as any,
      },
    });

    await prisma.activityLog.create({
      data: {
        userId: session.userId,
        module: "call-center",
        recordId: lead.id,
        action: "UPDATE",
        summary: `Updated lead ${lead.leadNo}: File Status -> ${work.fileStatus}, Call Status -> ${newStatus}`,
      },
    });

    return Response.json({ ok: true, data: updated, message: `Lead ${lead.leadNo} status updated!` });
  } catch (error) {
    return errorResponse(error);
  }
}


