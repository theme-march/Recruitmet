import { can } from "@/lib/authorization";
import { AppError, errorResponse } from "@/lib/errors";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { toAppRole } from "@/lib/roles";
import { Prisma } from "@prisma/client";

const object = (value: unknown) => value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession();
    if (!session) throw new AppError("UNAUTHORIZED", "Sign in is required.", 401);
    if (!(await can(session, "interviews", "View"))) throw new AppError("FORBIDDEN", "View permission is required.", 403);
    const { id } = await params;
    const url = new URL(request.url);
    const q = (url.searchParams.get("q") ?? "").trim().toLowerCase();
    const fileStatus = url.searchParams.get("fileStatus") ?? "";
    const interviewStatus = url.searchParams.get("interviewStatus") ?? "";
    const agentFilter = (url.searchParams.get("agent") ?? "").trim();
    const page = Math.max(1, Number(url.searchParams.get("page")) || 1);
    const exporting = url.searchParams.get("export") === "1";
    const pageSize = exporting ? 5000 : Math.min(100, Math.max(10, Number(url.searchParams.get("pageSize")) || 20));
    const schedule = await prisma.interviewSchedule.findUnique({
      where: { id },
      include: {
        interviews: {
          orderBy: { createdAt: "asc" },
          include: {
            candidate: {
              include: {
                files: { take: 1, orderBy: { updatedAt: "desc" } },
                calls: { take: 1, orderBy: { updatedAt: "desc" } },
              },
            },
          },
        },
      },
    });
    if (!schedule) throw new AppError("NOT_FOUND", "Interview schedule was not found.", 404);
    const people = schedule.interviews.map((interview) => {
      const call = interview.candidate.calls?.find((c) => {
        const n = object(c?.notes);
        const inv = object(n.interview);
        return inv.scheduleId === schedule.id || inv.scheduleTitle === schedule.title;
      }) || interview.candidate.calls?.[0];

      const notes = object(call?.notes);
      const work = object(notes.work);
      const latestFile = interview.candidate.files?.[0];
      const rowFileStatus = String(work.fileStatus ?? latestFile?.currentStage ?? (interview.candidate.registrationNo ? "Registration Done" : "Pre-Confirmed"));
      const displayName = call?.fullName || interview.candidate.fullName;
      const displayPhone = call?.phone || interview.candidate.phone;
      const rowAgent = latestFile?.agent || (work?.agent as string) || interview.candidate.source || "Direct";

      return {
        id: interview.id,
        candidateId: interview.candidateId,
        candidateNo: interview.candidate.candidateNo,
        name: displayName,
        phone: displayPhone,
        passportNo: interview.candidate.passportNo || "N/A",
        interviewDate: interview.scheduledAt.toISOString(),
        category: interview.profession ?? interview.candidate.profession ?? "Uncategorized",
        agent: rowAgent,
        fileStatus: rowFileStatus,
        interviewStatus: interview.result === "Scheduled" ? "Waiting For Interview" : interview.result,
        rating: interview.rating,
        processingFileId: latestFile?.id || null,
        fileNo: latestFile?.fileNo || null,
      };
    });

    const attendance = {
      registered: people.length,
      waiting: people.filter((row) => /waiting|scheduled/i.test(row.interviewStatus)).length,
      present: people.filter((row) => /selected|passed|attended/i.test(row.interviewStatus)).length,
      rejected: people.filter((row) => /reject/i.test(row.interviewStatus)).length,
      absent: people.filter((row) => /absent|rescheduled/i.test(row.interviewStatus)).length,
      other: people.filter((row) => !/waiting|scheduled|selected|passed|attended|reject|absent|rescheduled/i.test(row.interviewStatus)).length,
    };

    // Compute Agent Breakdown for this interview drive
    const agentMap: Record<string, { agent: string; total: number; selected: number; rejected: number; waiting: number; absent: number }> = {};
    for (const p of people) {
      const ag = p.agent && p.agent !== "Direct" ? p.agent : "Direct Office";
      if (!agentMap[ag]) {
        agentMap[ag] = { agent: ag, total: 0, selected: 0, rejected: 0, waiting: 0, absent: 0 };
      }
      agentMap[ag].total++;
      if (/selected|passed|attended/i.test(p.interviewStatus)) agentMap[ag].selected++;
      else if (/reject/i.test(p.interviewStatus)) agentMap[ag].rejected++;
      else if (/absent/i.test(p.interviewStatus)) agentMap[ag].absent++;
      else agentMap[ag].waiting++;
    }
    const agentBreakdown = Object.values(agentMap).sort((a, b) => b.total - a.total);

    const fileStatuses = ["Pre-Confirmed", "Confirm", "Received PP", "Call Back & Requested PP", "New Incoming Lead"];
    const fileStatusCounts = Object.fromEntries(fileStatuses.map((status) => [status, people.filter((row) => row.fileStatus === status).length]));

    const filtered = people.filter((row) => {
      const matchesQ = !q || `${row.name} ${row.phone} ${row.candidateNo} ${row.passportNo} ${row.agent}`.toLowerCase().includes(q);
      const matchesFileStatus = !fileStatus || row.fileStatus === fileStatus;
      const matchesInterviewStatus = !interviewStatus || (
        interviewStatus === "Selected" ? /selected|passed|attended/i.test(row.interviewStatus) :
        interviewStatus === "Rejected" ? /reject/i.test(row.interviewStatus) :
        interviewStatus === "Waiting" || interviewStatus === "Waiting For Interview" ? /waiting|scheduled/i.test(row.interviewStatus) :
        interviewStatus === "Absent" ? /absent|rescheduled/i.test(row.interviewStatus) :
        row.interviewStatus === interviewStatus
      );
      const matchesAgent = !agentFilter || (
        agentFilter === "Direct" ? (row.agent === "Direct" || !row.agent) :
        agentFilter === "HAS_AGENT" ? (row.agent && row.agent !== "Direct") :
        row.agent.toLowerCase().includes(agentFilter.toLowerCase())
      );
      return matchesQ && matchesFileStatus && matchesInterviewStatus && matchesAgent;
    });

    // Fetch matching Demand Letter from Works & Demands
    let matchingDemand = null;
    const searchTerms = [schedule.company, schedule.profession, schedule.title].filter(Boolean) as string[];
    if (searchTerms.length) {
      matchingDemand = await prisma.demand.findFirst({
        where: {
          OR: [
            ...(schedule.company ? [{ company: { name: { contains: schedule.company } } }, { title: { contains: schedule.company } }] : []),
            ...(schedule.profession ? [{ profession: { contains: schedule.profession } }] : []),
          ],
        },
        include: { company: { include: { office: true } } },
      });
    }

    const demandReq = (matchingDemand?.requirements ?? {}) as Record<string, unknown>;
    const demandInfo = {
      id: matchingDemand?.id || null,
      demandNo: matchingDemand?.demandNo || "DEM-AUTO",
      title: matchingDemand?.title || schedule.title,
      country: matchingDemand?.country || (/dubai|uae/i.test(schedule.title || schedule.company || "") ? "Dubai" : "Saudi Arabia"),
      company: matchingDemand?.company?.name || schedule.company || "Foreign Employer",
      office: matchingDemand?.company?.office?.name || "Dhaka Head Office",
      profession: matchingDemand?.profession || schedule.profession || "General",
      totalVisaQty: matchingDemand?.visaQuantity || matchingDemand?.quantity || schedule.capacity || 50,
      salary: Number(matchingDemand?.salary || 50000),
      currency: matchingDemand?.currency || "BDT",
      visaRate: Number(matchingDemand?.visaRate || 500000),
      commission: Number(matchingDemand?.commissionPerFile || 15000),
      deadline: matchingDemand?.deadline ? matchingDemand.deadline.toISOString() : null,
      workHour: String(demandReq.workHour || "8 Hours / Day"),
      workLocation: String(demandReq.workLocation || schedule.venue || "Saudi Arabia"),
      note: String(demandReq.note || schedule.instructions || "Passport & relevant trade experience required"),
      status: matchingDemand?.status || "Active",
    };

    // Fetch all registered agency partners
    const allRegisteredAgents = await prisma.agent.findMany({
      select: { id: true, name: true, code: true },
      orderBy: { name: "asc" },
    });

    const start = exporting ? 0 : (page - 1) * pageSize;
    return Response.json({
      data: {
        schedule: {
          id: schedule.id,
          title: schedule.title,
          company: schedule.company,
          profession: schedule.profession,
          scheduledAt: schedule.scheduledAt.toISOString(),
          venue: schedule.venue,
          interviewer: schedule.interviewer,
          capacity: schedule.capacity || 50,
          instructions: schedule.instructions,
          status: schedule.status,
        },
        demand: demandInfo,
        attendance,
        agentBreakdown,
        allAgents: allRegisteredAgents,
        fileStatusCounts,
        people: filtered.slice(start, start + pageSize),
        meta: { page, pageSize, total: filtered.length, totalPages: Math.max(1, Math.ceil(filtered.length / pageSize)) },
      },
    });
  } catch (error) { return errorResponse(error); }
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession();
    if (!session) throw new AppError("UNAUTHORIZED", "Sign in is required.", 401);

    const { id } = await params;
    const schedule = await prisma.interviewSchedule.findUnique({ where: { id } });
    if (!schedule) throw new AppError("NOT_FOUND", "Interview schedule not found.", 404);

    const body = await request.json();
    const { candidateId, phone, name } = body;
    const cleanPhone = (phone ? String(phone) : "").trim();

    let candidateRecord = null;

    // 1. If candidateId provided, check if it's a Candidate ID or a WorkCall ID
    if (candidateId) {
      candidateRecord = await prisma.candidate.findUnique({ where: { id: candidateId } });
      if (!candidateRecord) {
        const lead = await prisma.workCall.findUnique({ where: { id: candidateId } });
        if (lead) {
          if (lead.candidateId) {
            candidateRecord = await prisma.candidate.findUnique({ where: { id: lead.candidateId } });
          }
          if (!candidateRecord) {
            candidateRecord = await prisma.candidate.create({
              data: {
                candidateNo: `CAND-${Date.now().toString().slice(-8)}`,
                fullName: lead.fullName || name || "Candidate",
                phone: lead.phone,
                preferredCountry: lead.country || "Saudi Arabia",
                status: "ACTIVE",
              },
            });
            await prisma.workCall.update({ where: { id: lead.id }, data: { candidateId: candidateRecord.id } });
          }
        }
      }
    }

    // 2. If not found yet, check by phone
    if (!candidateRecord && cleanPhone) {
      candidateRecord = await prisma.candidate.findFirst({
        where: { OR: [{ phone: cleanPhone }, { phone: { contains: cleanPhone.slice(-10) } }] },
      });

      if (!candidateRecord) {
        const lead = await prisma.workCall.findFirst({
          where: { OR: [{ phone: cleanPhone }, { phone: { contains: cleanPhone.slice(-10) } }] },
        });
        if (lead) {
          if (lead.candidateId) {
            candidateRecord = await prisma.candidate.findUnique({ where: { id: lead.candidateId } });
          }
          if (!candidateRecord) {
            candidateRecord = await prisma.candidate.create({
              data: {
                candidateNo: `CAND-${Date.now().toString().slice(-8)}`,
                fullName: lead.fullName || name || "Candidate",
                phone: lead.phone,
                preferredCountry: lead.country || "Saudi Arabia",
                status: "ACTIVE",
              },
            });
            await prisma.workCall.update({ where: { id: lead.id }, data: { candidateId: candidateRecord.id } });
          }
        } else {
          candidateRecord = await prisma.candidate.create({
            data: {
              candidateNo: `CAND-${Date.now().toString().slice(-8)}`,
              fullName: name || `Candidate ${cleanPhone.slice(-4)}`,
              phone: cleanPhone,
              preferredCountry: "Saudi Arabia",
              status: "ACTIVE",
            },
          });
        }
      }
    }

    if (!candidateRecord) throw new AppError("BAD_REQUEST", "Could not identify or create candidate record.", 400);

    // Create or update interview record with validated Candidate ID
    const existing = await prisma.interview.findFirst({
      where: { candidateId: candidateRecord.id, scheduleId: schedule.id },
    });

    let interview;
    if (existing) {
      interview = await prisma.interview.update({
        where: { id: existing.id },
        data: { result: "Scheduled", scheduledAt: schedule.scheduledAt },
      });
    } else {
      interview = await prisma.interview.create({
        data: {
          candidateId: candidateRecord.id,
          scheduleId: schedule.id,
          title: schedule.title,
          company: schedule.company,
          profession: schedule.profession,
          scheduledAt: schedule.scheduledAt,
          result: "Scheduled",
        },
      });
    }

    // Update WorkCall notes and ProcessingFile if existing
    const lead = await prisma.workCall.findFirst({ where: { candidateId: candidateRecord.id } });
    if (lead) {
      const notes = object(lead.notes);
      const interviewObj = object(notes.interview);
      interviewObj.scheduleId = schedule.id;
      interviewObj.scheduleTitle = schedule.title;
      interviewObj.option = "With Interview";
      interviewObj.status = "Scheduled";
      await prisma.workCall.update({
        where: { id: lead.id },
        data: {
          notes: { ...notes, interview: interviewObj } as unknown as Prisma.InputJsonObject,
        },
      });
    }

    const isDubai = /sobha|dubai|uae/i.test(schedule.title || schedule.company || "");
    const schedCountry = isDubai ? "Dubai" : "Saudi Arabia";

    const candidateFile = await prisma.processingFile.findFirst({
      where: { candidateId: candidateRecord.id },
    });

    if (candidateFile) {
      await prisma.processingFile.update({
        where: { id: candidateFile.id },
        data: {
          country: schedCountry,
          status: "ACTIVE",
          company: schedule.company || candidateFile.company || "Saudi Binladen Group",
          profession: schedule.profession || candidateFile.profession || "Electrician / Plumber",
          currentStage: "Passport Entry",
        },
      });
    } else {
      await prisma.processingFile.create({
        data: {
          fileNo: `FILE-${Math.floor(100000 + Math.random() * 900000)}`,
          candidateId: candidateRecord.id,
          country: schedCountry,
          currentStage: "Passport Entry",
          status: "ACTIVE",
          company: schedule.company || "Saudi Binladen Group",
          profession: schedule.profession || candidateRecord.profession || "Electrician / Plumber",
          assignedToId: session.userId,
        },
      });
    }

    return Response.json({ ok: true, data: interview, message: "Candidate added to interview!" }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}


export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession();
    if (!session) throw new AppError("UNAUTHORIZED", "Sign in is required.", 401);
    if (!(await can(session, "registration", "Update"))) {
      throw new AppError("FORBIDDEN", "Permission required to edit interview drives. Please contact a Super Administrator.", 403);
    }

    const { id } = await params;
    const body = await request.json();
    const { title, company, profession, scheduledAt, venue, capacity, instructions, status } = body;

    const updated = await prisma.interviewSchedule.update({
      where: { id },
      data: {
        title: title !== undefined ? title : undefined,
        company: company !== undefined ? company : undefined,
        profession: profession !== undefined ? profession : undefined,
        scheduledAt: scheduledAt ? new Date(scheduledAt) : undefined,
        venue: venue !== undefined ? venue : undefined,
        capacity: capacity !== undefined ? Number(capacity) : undefined,
        instructions: instructions !== undefined ? instructions : undefined,
        status: status !== undefined ? status : undefined,
      },
    });

    return Response.json({ ok: true, data: updated, message: "Interview drive updated successfully!" });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession();
    if (!session) throw new AppError("UNAUTHORIZED", "Sign in is required.", 401);
    if (!(await can(session, "registration", "Delete"))) {
      throw new AppError("FORBIDDEN", "Permission required to delete interview drives. Please contact a Super Administrator.", 403);
    }

    const { id } = await params;
    // Delete associated interviews first if needed
    await prisma.interview.deleteMany({ where: { scheduleId: id } }).catch(() => {});
    await prisma.interviewSchedule.delete({ where: { id } });

    return Response.json({ ok: true, message: "Interview drive deleted successfully!" });
  } catch (error) {
    return errorResponse(error);
  }
}
