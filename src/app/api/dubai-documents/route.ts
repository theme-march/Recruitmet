import { can, officeScope } from "@/lib/authorization";
import { AppError, errorResponse } from "@/lib/errors";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

const categories = [
  "Passport",
  "Medical",
  "Police Clearance",
  "Skill Certificate",
  "Driving Licence",
  "Visa Copy",
  "BMET Smart Card",
  "Flight Ticket",
] as const;

export async function GET(request: Request) {
  try {
    const session = await getSession();
    if (!session) throw new AppError("UNAUTHORIZED", "Sign in is required.", 401);
    if (!(await can(session, "documents", "View")))
      throw new AppError("FORBIDDEN", "Document view permission is required.", 403);

    const url = new URL(request.url);
    const q = (url.searchParams.get("q") ?? "").toLowerCase();
    const wanted = url.searchParams.get("status") ?? "";
    const country = url.searchParams.get("country") ?? "";
    const selectedCategory = url.searchParams.get("category") ?? "";
    const page = Math.max(1, Number(url.searchParams.get("page")) || 1);
    const pageSize = Math.min(100, Math.max(10, Number(url.searchParams.get("pageSize")) || 20));

    const isSuperAdmin = session.user.role?.name === "Super Administrator" || (session.user as any).roleKey === "SUPER_ADMIN";
    const whereScope = isSuperAdmin ? {} : officeScope(session);

    const [files, dbCountries] = await Promise.all([
      prisma.processingFile.findMany({
        where: whereScope,
        orderBy: { updatedAt: "desc" },
        take: 5000,
        include: {
          candidate: {
            include: {
              educations: true,
              experiences: true,
            },
          },
          passport: true,
          police: true,
          medical: true,
          mofa: true,
          takamul: true,
          biometrics: true,
          manpower: true,
          visas: true,
          companyRecord: true,
          assignedTo: { select: { name: true } },
          office: { select: { name: true } },
          documents: { orderBy: { updatedAt: "desc" } },
        },
      }),
      prisma.country.findMany({
        where: { active: true },
        orderBy: { name: "asc" },
      }),
    ]);

    const activeCountryNames = [
      ...dbCountries.map((c) => c.name),
      "Other",
    ].filter((name, idx, arr) => arr.indexOf(name) === idx);

    const rows = files.map((file) => {
      const profession = (file.profession ?? file.candidate.profession ?? "").toLowerCase();
      const docs = file.documents;
      const rawCountry = (file.country || "").trim();
      const isDubaiCountry = /dubai|uae|emirates/i.test(rawCountry);
      const isSaudiCountry = /saudi|ksa/i.test(rawCountry);
      const isDriver = /driver|driving|heavy|light|operator|chauffeur/i.test(profession);
      const isUnskilled = /cleaner|labor|helper|domestic|packing/i.test(profession);

      // 1. Passport
      const hasPassport = Boolean(file.passport?.passportNumber || file.candidate?.passportNo);
      const passportStatus = hasPassport ? "DONE" : "PENDING";

      // 2. Medical
      const hasMedical =
        file.medical.length > 0 ||
        docs.some((d) => /medical/i.test(d.type) && ["UPLOADED", "VERIFIED"].includes(d.status));
      const medicalStatus = hasMedical ? "DONE" : "PENDING";

      // 3. Police Clearance
      const hasPolice =
        file.police.length > 0 ||
        docs.some((d) => /police|pc document|pcc/i.test(d.type) && ["UPLOADED", "VERIFIED"].includes(d.status));
      const pcStatus = isDubaiCountry ? "NO NEED" : hasPolice ? "DONE" : "PENDING";

      // 4. Skill Certificate (Takamul SVP for Saudi / Trade Cert for Skilled)
      const hasCert =
        docs.some((d) => /certificate|cert|diploma|skill|takamul/i.test(d.type) && ["UPLOADED", "VERIFIED"].includes(d.status)) ||
        file.candidate.educations.length > 0 ||
        file.takamul.some((t) => t.status === "PASSED" || Boolean(t.certificateNumber));
      const certStatus = isSaudiCountry ? (hasCert ? "DONE" : "PENDING") : isUnskilled ? "NO NEED" : hasCert ? "DONE" : "PENDING";

      // 5. Driving Licence
      const hasLicence =
        docs.some((d) => /licen[cs]e/i.test(d.type) && ["UPLOADED", "VERIFIED"].includes(d.status)) ||
        file.candidate.experiences.some((e) => /driver|licen[cs]e/i.test(e.role));
      const licenceStatus = isDriver ? (hasLicence ? "DONE" : "PENDING") : "NO NEED";

      // 6. Visa Copy
      const hasVisa =
        file.visas.some((v) => Boolean(v.visaNumber) && v.status !== "Rejected") ||
        file.mofa.some((m) => m.status === "Approved") ||
        docs.some((d) => /visa|evisa/i.test(d.type) && ["UPLOADED", "VERIFIED"].includes(d.status));
      const visaStatus = hasVisa ? "DONE" : "PENDING";

      // 7. BMET Smart Card
      const hasManpower =
        file.manpower.some((m) => Boolean(m.reference) || ["APPROVED", "ISSUED", "SUBMITTED", "Approved", "Issued", "Submitted"].includes(m.status || "")) ||
        docs.some((d) => /manpower|smartcard/i.test(d.type) && ["UPLOADED", "VERIFIED"].includes(d.status));
      const manpowerStatus = hasManpower ? "DONE" : "PENDING";

      // 8. Flight Ticket
      const hasFlight =
        file.status === "COMPLETED" ||
        file.currentStage === "Flight" ||
        docs.some((d) => /flight|ticket/i.test(d.type) && ["UPLOADED", "VERIFIED"].includes(d.status));
      const flightStatus = hasFlight ? "DONE" : "PENDING";

      const statuses: Record<(typeof categories)[number], "PENDING" | "DONE" | "NO NEED"> = {
        Passport: passportStatus,
        Medical: medicalStatus,
        "Police Clearance": pcStatus,
        "Skill Certificate": certStatus,
        "Driving Licence": licenceStatus,
        "Visa Copy": visaStatus,
        "BMET Smart Card": manpowerStatus,
        "Flight Ticket": flightStatus,
      };

      const docAttachments: Record<string, string | undefined> = {
        Passport: docs.find((d) => /passport|pp/i.test(d.type))?.url || undefined,
        Medical: docs.find((d) => /medical/i.test(d.type))?.url || undefined,
        "Police Clearance": docs.find((d) => /police|pc document|pcc/i.test(d.type))?.url || undefined,
        "Skill Certificate": docs.find((d) => /certificate|cert|diploma|skill|takamul/i.test(d.type))?.url || undefined,
        "Driving Licence": docs.find((d) => /licen[cs]e/i.test(d.type))?.url || undefined,
        "Visa Copy": docs.find((d) => /visa|evisa/i.test(d.type))?.url || undefined,
        "BMET Smart Card": docs.find((d) => /manpower|smartcard/i.test(d.type))?.url || undefined,
        "Flight Ticket": docs.find((d) => /flight|ticket/i.test(d.type))?.url || undefined,
      };

      const matchedDb = dbCountries.find(
        (c) =>
          c.name.toLowerCase() === rawCountry.toLowerCase() ||
          (/saudi/i.test(rawCountry) && /saudi/i.test(c.name)) ||
          (/dubai|uae/i.test(rawCountry) && /dubai/i.test(c.name))
      );
      const normalizedCountry = matchedDb ? matchedDb.name : rawCountry || "Other";

      const companyName = file.company || file.companyRecord?.name || file.manpower?.[0]?.company || "Almarai";
      const professionName = file.profession || file.visas?.[0]?.profession || file.candidate?.profession || file.manpower?.[0]?.profession || "General Worker";

      return {
        id: file.id,
        fileNo: file.fileNo,
        candidateId: file.candidateId,
        candidateNo: file.candidate.candidateNo,
        name: file.candidate.fullName,
        phone: file.candidate.phone,
        passport: file.passport?.passportNumber ?? file.candidate.passportNo ?? "Not entered",
        country: normalizedCountry,
        rawCountry,
        officer: file.assignedTo?.name ?? "Call Center Officer",
        office: file.office?.name ?? "Dhaka Head Office",
        company: companyName,
        profession: professionName,
        currentStage: file.currentStage || "Passport Entry",
        fileStatus: file.status || "ACTIVE",
        medicalResult: file.medical?.[0]?.result || null,
        visaStatus: file.visas?.[0]?.status || null,
        manpowerStatus: file.manpower?.[0]?.status || null,
        statuses,
        docAttachments,
      };
    });

    const filtered = rows.filter((row) => {
      const matchesQ =
        !q ||
        [row.name, row.phone, row.passport, row.fileNo, row.country, row.rawCountry, row.company, row.profession].some((v) =>
          v.toLowerCase().includes(q)
        );
      const matchesStatus = !wanted || Object.values(row.statuses).includes(wanted as never);
      const matchesCategory =
        !selectedCategory ||
        (selectedCategory in row.statuses &&
          (wanted ? row.statuses[selectedCategory as (typeof categories)[number]] === wanted : true));
      const targetCountry = country.trim().toLowerCase();
      const matchesCountry =
        !country ||
        targetCountry === "all" ||
        targetCountry === "all countries" ||
        row.country.toLowerCase() === targetCountry ||
        row.rawCountry.toLowerCase() === targetCountry ||
        (targetCountry.includes("saudi") && row.country.toLowerCase().includes("saudi")) ||
        (targetCountry.includes("dubai") && (row.country.toLowerCase().includes("dubai") || row.rawCountry.toLowerCase().includes("dubai"))) ||
        (targetCountry.includes("other") && !/saudi|dubai|uae|emirates/i.test(row.country));

      return matchesQ && matchesStatus && matchesCategory && matchesCountry;
    });

    const summary = Object.fromEntries(
      categories.map((name) => [
        name,
        {
          PENDING: filtered.filter((r) => r.statuses[name] === "PENDING").length,
          DONE: filtered.filter((r) => r.statuses[name] === "DONE").length,
          "NO NEED": filtered.filter((r) => r.statuses[name] === "NO NEED").length,
        },
      ])
    );

    const offset = (page - 1) * pageSize;
    return Response.json({
      data: filtered.slice(offset, offset + pageSize),
      summary,
      categories,
      filters: {
        countries: activeCountryNames,
      },
      meta: {
        page,
        pageSize,
        total: filtered.length,
        totalFiles: filtered.length,
        totalPages: Math.max(1, Math.ceil(filtered.length / pageSize)),
      },
    });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) throw new AppError("UNAUTHORIZED", "Sign in is required.", 401);
    if (!(await can(session, "documents", "Write")))
      throw new AppError("FORBIDDEN", "Document upload permission is required.", 403);

    const body = await request.json();
    const { fileId, candidateId, category, fileData, fileName } = body;

    let targetFileId = fileId;
    let targetCandidateId = candidateId;

    if (!targetFileId && targetCandidateId) {
      const f = await prisma.processingFile.findFirst({
        where: { candidateId: targetCandidateId },
        orderBy: { createdAt: "desc" },
      });
      if (f) targetFileId = f.id;
    }

    if (!targetCandidateId && targetFileId) {
      const f = await prisma.processingFile.findUnique({
        where: { id: targetFileId },
        select: { candidateId: true },
      });
      if (f) targetCandidateId = f.candidateId;
    }

    if (!targetCandidateId) {
      throw new AppError("BAD_REQUEST", "Candidate identifier is required.", 400);
    }

    const docType = category || "General Document";

    const newDoc = await prisma.document.create({
      data: {
        documentNo: `DOC-${Date.now().toString().slice(-8)}`,
        candidateId: targetCandidateId,
        fileId: targetFileId || undefined,
        type: docType,
        status: "VERIFIED",
        fileName: fileName || `${docType}-Scan.pdf`,
        url: fileData,
      },
    });

    if (targetFileId) {
      await prisma.processingFile.update({
        where: { id: targetFileId },
        data: { updatedAt: new Date() },
      });
    }

    return Response.json({
      success: true,
      message: `${docType} uploaded and verified successfully!`,
      data: newDoc,
    });
  } catch (error) {
    return errorResponse(error);
  }
}
