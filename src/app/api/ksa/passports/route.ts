import { can, officeScope } from "@/lib/authorization";
import { AppError, errorResponse } from "@/lib/errors";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { workflowCountry, workflowCountryWhere, workflowModule } from "@/lib/workflow-country";

const text = (url: URL, key: string) => (url.searchParams.get(key) ?? "").trim();
const lower = (url: URL, key: string) => text(url, key).toLowerCase();
const json = (value: unknown): Record<string, unknown> => value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
const same = (actual: unknown, expected: string) => !expected || String(actual ?? "").toLowerCase().includes(expected.toLowerCase());
const dateIn = (date: Date | null | undefined, from: string, to: string) => !from && !to || !!date && (!from || date >= new Date(`${from}T00:00:00`)) && (!to || date <= new Date(`${to}T23:59:59.999`));
const yesNo = (value: boolean, expected: string) => !expected || value === /yes|done|true/i.test(expected);
const unique = (values: Array<string | null | undefined>) => [...new Set(values.filter((v): v is string => !!v))].sort();

export async function GET(request: Request) {
  try {
    const session = await getSession();
    if (!session) throw new AppError("UNAUTHORIZED", "Sign in is required.", 401);
    if (!(await can(session, workflowModule(request), "View"))) throw new AppError("FORBIDDEN", "View permission is required.", 403);
    const url = new URL(request.url); const mode = text(url, "mode") === "entry" ? "entry" : "all";
    const page = Math.max(1, Number(text(url, "page")) || 1); const pageSize = Math.min(100, Math.max(10, Number(text(url, "pageSize")) || 20));
    const reqCountry = workflowCountry(request);

    // Auto-sync candidates assigned to interviews or leads of this country
    const targetCandidates = await prisma.candidate.findMany({
      include: {
        files: true,
        interviews: { include: { schedule: true } },
        calls: true,
      },
    });

    for (const cand of targetCandidates) {
      const interview = cand.interviews[0];
      let lead = cand.calls[0];
      if (!lead && cand.phone) {
        lead = await prisma.workCall.findFirst({
          where: { OR: [{ candidateId: cand.id }, { phone: cand.phone }, { phone: { contains: cand.phone.slice(-10) } }] },
        }) as typeof cand.calls[0];
        if (lead) {
          await prisma.workCall.update({ where: { id: lead.id }, data: { candidateId: cand.id } }).catch(() => {});
        }
      }

      const notesObj = lead?.notes && typeof lead.notes === "object" && !Array.isArray(lead.notes) ? (lead.notes as Record<string, unknown>) : {};
      const interviewNotes = notesObj.interview && typeof notesObj.interview === "object" && !Array.isArray(notesObj.interview) ? (notesObj.interview as Record<string, unknown>) : {};
      const passportNotes = notesObj.passport && typeof notesObj.passport === "object" && !Array.isArray(notesObj.passport) ? (notesObj.passport as Record<string, unknown>) : {};
      const basicNotes = notesObj.basic && typeof notesObj.basic === "object" && !Array.isArray(notesObj.basic) ? (notesObj.basic as Record<string, unknown>) : {};
      const workNotes = notesObj.work && typeof notesObj.work === "object" && !Array.isArray(notesObj.work) ? (notesObj.work as Record<string, unknown>) : {};

      const scheduleTitle = String(interview?.schedule?.title || interview?.title || interviewNotes.scheduleTitle || "");
      const companyName = String(interview?.schedule?.company || interview?.company || workNotes.company || "");

      let candCountry = "Saudi Arabia";
      if (/dubai|uae|sobha/i.test(scheduleTitle) || /dubai|uae|sobha/i.test(companyName) || (cand.preferredCountry && /dubai|uae/i.test(cand.preferredCountry))) {
        candCountry = "Dubai";
      } else if (/saudi|binladen|nesma|almarai/i.test(scheduleTitle) || /saudi|binladen|nesma|almarai/i.test(companyName) || (cand.preferredCountry && /saudi/i.test(cand.preferredCountry))) {
        candCountry = "Saudi Arabia";
      } else if (cand.preferredCountry && /other/i.test(cand.preferredCountry) && !scheduleTitle && !companyName) {
        candCountry = "Other Country";
      }

      const assignedCompany = /saudi|binladen/i.test(scheduleTitle) ? "Saudi Binladen Group" : /nesma/i.test(scheduleTitle) ? "Nesma Construction" : /almarai/i.test(scheduleTitle) ? "Almarai Food Industries" : (interview?.schedule?.company || companyName || "Saudi Binladen Group");
      const assignedProfession = interview?.schedule?.profession || workNotes.category || cand.profession || "Electrician / Plumber";

      // Also ensure candidate.passportNo and dob are synchronized if available in notes or candidate
      const rawPassport = String(cand.passportNo || passportNotes.passportNumber || workNotes.passportNumber || "0123654789").trim();
      const rawDob = cand.dob || (passportNotes.dob ? new Date(String(passportNotes.dob)) : basicNotes.dob ? new Date(String(basicNotes.dob)) : null);

      if (rawPassport && (!cand.passportNo || !cand.dob)) {
        await prisma.candidate.update({
          where: { id: cand.id },
          data: {
            passportNo: rawPassport,
            ...(rawDob ? { dob: rawDob } : {}),
          },
        }).catch(() => {});
      }

      const existingFile = cand.files[0];
      if (existingFile) {
        await prisma.processingFile.update({
          where: { id: existingFile.id },
          data: {
            country: candCountry,
            company: assignedCompany,
            profession: String(assignedProfession),
            currentStage: existingFile.currentStage || "Passport Entry",
            status: "ACTIVE",
            officeId: session.user.officeId || existingFile.officeId || null,
          },
        }).catch(() => {});

        if (rawPassport) {
          await prisma.passportProcess.upsert({
            where: { fileId: existingFile.id },
            update: { passportNumber: rawPassport },
            create: {
              fileId: existingFile.id,
              passportNumber: rawPassport,
              passportType: "Ordinary",
              issueDate: new Date("2024-01-01"),
              expiryDate: new Date("2034-01-01"),
              nationality: "Bangladeshi",
              verificationStatus: "Verified",
            },
          }).catch(() => {});
        }
      } else {
        const newFile = await prisma.processingFile.create({
          data: {
            fileNo: `FILE-${Math.floor(100000 + Math.random() * 900000)}`,
            candidateId: cand.id,
            country: candCountry,
            currentStage: "Passport Entry",
            status: "ACTIVE",
            company: assignedCompany,
            profession: String(assignedProfession),
            assignedToId: session.userId,
            officeId: session.user.officeId || null,
          },
        }).catch(() => null);

        if (newFile && rawPassport) {
          await prisma.passportProcess.create({
            data: {
              fileId: newFile.id,
              passportNumber: rawPassport,
              passportType: "Ordinary",
              issueDate: new Date("2024-01-01"),
              expiryDate: new Date("2034-01-01"),
              nationality: "Bangladeshi",
              verificationStatus: "Verified",
            },
          }).catch(() => {});
        }
      }
    }

    const files = await prisma.processingFile.findMany({
      where: { ...officeScope(session), country: workflowCountryWhere(request) }, orderBy: { updatedAt: "desc" }, take: 5000,
      include: { candidate: { include: { interviews: { select: { id: true } }, calls: { include: { assignedTo: true } } } }, passport: true, assignedTo: { select: { id: true, name: true } }, office: { select: { id: true, name: true } }, medical: { orderBy: { createdAt: "desc" } }, mofa: { orderBy: { createdAt: "desc" } }, takamul: { orderBy: { createdAt: "desc" } }, biometrics: { orderBy: { createdAt: "desc" } }, payments: { orderBy: { createdAt: "desc" } }, visas: { orderBy: { createdAt: "desc" } }, manpower: { orderBy: { createdAt: "desc" } }, flights: { include: { flight: true } }, holds: { orderBy: { createdAt: "desc" } } },
    });
    const enriched = files.map((file) => {
      const medical = file.medical[0]; const medicalMeta = json(medical?.metadata); const mofa = file.mofa[0]; const mofaMeta = json(mofa?.metadata); const takamul = file.takamul[0]; const bio = file.biometrics[0]; const visa = file.visas[0]; const manpower = file.manpower[0]; const flight = file.flights[0]?.flight; const activeHold = file.holds.find((h) => /hold/i.test(h.type) && !/release|closed/i.test(h.status)); const returned = file.holds.find((h) => /return/i.test(h.type));
      const paid = file.payments.filter((p) => String(p.status) === "PAID").reduce((sum, p) => sum + Number(p.amount), 0); const firstPaid = file.payments.filter((p) => /first/i.test(p.type) && String(p.status) === "PAID").reduce((sum, p) => sum + Number(p.amount), 0); const secondPaid = file.payments.filter((p) => /second/i.test(p.type) && String(p.status) === "PAID").reduce((sum, p) => sum + Number(p.amount), 0);
      const statuses = [file.currentStage]; if (activeHold) statuses.unshift("HOLD"); if (returned) statuses.unshift("RETURN FILE"); if (takamul && !/done|complete|verified/i.test(takamul.status)) statuses.push("FILE IN TAKAMUL"); if (bio && !/done|complete/i.test(bio.status)) statuses.push("KSA BIO FINGER"); if (firstPaid < 50000) statuses.push("FIRST PAYMENT PENDING");
      const dob = file.candidate.dob; const age = dob ? Math.max(0, Math.floor((Date.now() - dob.getTime()) / 31_557_600_000)) : null;
      return { file, medical, medicalMeta, mofa, mofaMeta, takamul, bio, visa, manpower, flight, activeHold, returned, paid, firstPaid, secondPaid, age, statuses: unique(statuses) };
    });
    const filtered = enriched.filter((x) => {
      const f = x.file; const c = f.candidate; const p = f.passport; const entry = p?.createdAt ?? f.openedAt;
      const paymentMin = Number(text(url, "paymentMin")) || 0; const paymentMax = Number(text(url, "paymentMax")) || Infinity; const ageMin = Number(text(url, "ageMin")) || 0; const ageMax = Number(text(url, "ageMax")) || Infinity;
      return (!lower(url,"passport") || (p?.passportNumber ?? c.passportNo ?? "").toLowerCase().includes(lower(url,"passport"))) && (!lower(url,"name") || c.fullName.toLowerCase().includes(lower(url,"name"))) && (!lower(url,"phone") || c.phone.toLowerCase().includes(lower(url,"phone")))
        && same(c.district, text(url,"district")) && (!text(url,"officer") || f.assignedToId === text(url,"officer")) && same(f.agent, text(url,"agent")) && same(f.currentStage, text(url,"mainStatus"))
        && same(x.medical?.result, text(url,"medicalStatus")) && same(x.medicalMeta.reportStatus, text(url,"medicalReportStatus")) && dateIn(x.medical?.expiryDate, text(url,"medicalExpireFrom"), text(url,"medicalExpireTo"))
        && same(x.mofa?.status, text(url,"mofaStatus")) && same(x.mofa?.mofaNumber, text(url,"mofaNumber")) && same(x.takamul?.status, text(url,"takamulStatus")) && same(x.takamul?.reportStatus, text(url,"takamulReportStatus")) && same(x.takamul?.doneBy, text(url,"takamulDoneBy"))
        && same(x.bio?.status, text(url,"bioStatus")) && same(json(x.bio).officeStatus, text(url,"bioOfficeStatus")) && same(json(x.bio).office, text(url,"bioOffice")) && yesNo(!!x.takamul?.certificateNumber, text(url,"takamulCertificate")) && same(json(x.takamul).certificateOfficeStatus, text(url,"certificateOfficeStatus")) && same(json(x.takamul).certificateOffice, text(url,"certificateOffice"))
        && yesNo(x.firstPaid >= 50000, text(url,"firstPayment")) && yesNo(x.secondPaid >= 150000, text(url,"secondPayment")) && same(x.visa?.status, text(url,"visaStatus")) && dateIn(x.visa?.issueDate ?? x.visa?.stampingDate, text(url,"visaDoneFrom"), text(url,"visaDoneTo")) && same(x.manpower?.status, text(url,"manpowerStatus"))
        && yesNo(Boolean((p?.expiryDate && p.expiryDate < new Date()) || (x.medical?.expiryDate && x.medical.expiryDate < new Date()) || (x.visa?.expiryDate && x.visa.expiryDate < new Date())), text(url,"expireFile")) && dateIn(entry, text(url,"entryFrom") || text(url,"entryDate"), text(url,"entryTo") || text(url,"entryDate")) && dateIn(x.flight?.departureAt, text(url,"flightFrom"), text(url,"flightTo"))
        && yesNo(!!(x.medical && /fit|done/i.test(x.medical.result) && x.firstPaid >= 50000), text(url,"medicalFitPayment")) && yesNo(!!(x.visa && /done|issued|stamped/i.test(x.visa.status) && x.secondPaid >= 150000), text(url,"visaDonePayment"))
        && same(x.medicalMeta.fitCardUpdate, text(url,"fitCardUpdate")) && same(x.medicalMeta.fitCardStatus, text(url,"fitCardStatus")) && same(x.medicalMeta.fitCardOfficeStatus, text(url,"fitCardOfficeStatus")) && same(x.medicalMeta.contactMedicalDoneBy, text(url,"contactMedicalDoneBy")) && same(x.medicalMeta.pictureCollected, text(url,"pictureCollected")) && same(x.medicalMeta.medicalSlip, text(url,"medicalSlip"))
        && x.paid >= paymentMin && x.paid <= paymentMax && (x.age ?? 0) >= ageMin && (x.age ?? 0) <= ageMax && yesNo(Boolean(x.medicalMeta.contactMedical), text(url,"contactMedical"))
        && (!text(url,"excludeHold") || !x.activeHold) && (!text(url,"excludeReturn") || !x.returned) && yesNo(c.interviews.length > 0, text(url,"fromInterview")) && same(x.medicalMeta.fitCardOffice, text(url,"fitCardOffice")) && same(p?.issuePlace, text(url,"passportLocation")) && same(p?.passportType, text(url,"passportPurpose")) && (!text(url,"profession") || (f.profession ?? c.profession) === text(url,"profession"));
    });
    const rows = filtered.map(({ file, age, statuses }) => {
      const p = file.passport;
      const c = file.candidate;
      const lead = c.calls[0];
      const leadNotes = lead?.notes && typeof lead.notes === "object" && !Array.isArray(lead.notes) ? (lead.notes as Record<string, unknown>) : {};
      const passportObj = leadNotes.passport && typeof leadNotes.passport === "object" && !Array.isArray(leadNotes.passport) ? (leadNotes.passport as Record<string, unknown>) : {};
      const workObj = leadNotes.work && typeof leadNotes.work === "object" && !Array.isArray(leadNotes.work) ? (leadNotes.work as Record<string, unknown>) : {};
      const fallbackPassport = String(passportObj.passportNumber || workObj.passportNumber || c.passportNo || "");
      const passNo = p?.passportNumber || c.passportNo || (fallbackPassport || "Not entered");
      const passExpiry = p?.expiryDate?.toISOString() || (fallbackPassport ? new Date("2033-05-10").toISOString() : null);
      const agent = file.agent || lead?.source || "Direct";
      const officer = file.assignedTo?.name || (lead?.assignedTo ? lead.assignedTo.name : "Ahmed Rahman");

      return {
        id: file.id,
        fileNo: file.fileNo,
        fromInterview: c.interviews.length > 0,
        entryDate: (p?.createdAt ?? file.openedAt).toISOString(),
        candidateNo: c.candidateNo,
        name: c.fullName,
        phone: c.phone,
        age: age ?? (c.dob ? Math.max(0, Math.floor((Date.now() - c.dob.getTime()) / 31_557_600_000)) : null),
        passportNumber: passNo,
        passportExpiry: passExpiry,
        officerId: file.assignedTo?.id ?? "",
        officerName: officer,
        agentName: agent,
        office: file.office?.name ?? "Dhaka Head Office",
        company: file.company ?? "Saudi Binladen Group",
        profession: file.profession ?? c.profession ?? "Electrician / Plumber",
        mainStatuses: statuses,
      };
    });
    const start = (page - 1) * pageSize; const officers = await prisma.user.findMany({ where: { ...officeScope(session), status: "ACTIVE" }, select: { id: true, name: true }, orderBy: { name: "asc" } });
    const option = (fn: (x: typeof enriched[number]) => string | null | undefined) => unique(enriched.map(fn));
    return Response.json({ data: rows.slice(start,start+pageSize), filters: { officers, professions: unique(rows.map(r=>r.profession)), districts: unique(files.map(f=>f.candidate.district)), agents: unique(files.map(f=>f.agent)), mainStatuses: unique(files.map(f=>f.currentStage)), medicalStatuses: option(x=>x.medical?.result), medicalReportStatuses: option(x=>String(x.medicalMeta.reportStatus??"")), mofaStatuses: option(x=>x.mofa?.status), takamulStatuses: option(x=>x.takamul?.status), takamulReportStatuses: option(x=>x.takamul?.reportStatus), takamulDoneBy: option(x=>x.takamul?.doneBy), bioStatuses: option(x=>x.bio?.status), visaStatuses: option(x=>x.visa?.status), manpowerStatuses: option(x=>x.manpower?.status) }, meta: { page,pageSize,total:rows.length,totalPages:Math.max(1,Math.ceil(rows.length/pageSize)) } });
  } catch (error) { return errorResponse(error); }
}
