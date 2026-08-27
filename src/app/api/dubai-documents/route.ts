import { can, officeScope } from "@/lib/authorization";
import { AppError, errorResponse } from "@/lib/errors";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

const categories = ["PC Documents", "Certificate", "Licence", "CV", "BMET Finger", "BMET Training"] as const;

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

    const files = await prisma.processingFile.findMany({
      where: officeScope(session),
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
        takamul: true,
        biometrics: true,
        manpower: true,
        visas: true,
        assignedTo: { select: { name: true } },
        office: { select: { name: true } },
        documents: { orderBy: { updatedAt: "desc" } },
      },
    });

    const rows = files.map((file) => {
      const profession = (file.profession ?? file.candidate.profession ?? "").toLowerCase();
      const docs = file.documents;

      // 1. PC Documents (Police Clearance)
      const hasPolice =
        file.police.length > 0 ||
        docs.some((d) => /police|pc document|pcc/i.test(d.type) && ["UPLOADED", "VERIFIED"].includes(d.status));
      const pcStatus = hasPolice ? "DONE" : "PENDING";

      // 2. Certificate
      const hasCert =
        docs.some((d) => /certificate|cert|diploma/i.test(d.type) && ["UPLOADED", "VERIFIED"].includes(d.status)) ||
        file.candidate.educations.length > 0;
      const certStatus = hasCert ? "DONE" : "PENDING";

      // 3. Licence (Driving / Trade License)
      const isDriver = /driver|driving|heavy|light|operator/i.test(profession);
      const hasLicence =
        docs.some((d) => /licen[cs]e/i.test(d.type) && ["UPLOADED", "VERIFIED"].includes(d.status)) ||
        file.candidate.experiences.some((e) => /driver|licen[cs]e/i.test(e.role));
      const licenceStatus = hasLicence ? "DONE" : isDriver ? "PENDING" : "NO NEED";

      // 4. CV / Bio-data
      const hasCv =
        docs.some((d) => /\bcv\b|curriculum|resume|bio/i.test(d.type) && ["UPLOADED", "VERIFIED"].includes(d.status)) ||
        (Boolean(file.candidate.fullName) && Boolean(file.candidate.phone));
      const cvStatus = hasCv ? "DONE" : "PENDING";

      // 5. BMET Finger (Biometrics)
      const hasFinger =
        file.biometrics.some((b) => b.status === "VERIFIED" || Boolean(b.presentDate) || Boolean(b.completedAt)) ||
        file.takamul.some((t) => t.status === "PASSED" || Boolean(t.certificateNumber)) ||
        docs.some((d) => /finger|biometric/i.test(d.type) && ["UPLOADED", "VERIFIED"].includes(d.status));
      const fingerStatus = hasFinger ? "DONE" : "PENDING";

      // 6. BMET Training (Manpower / Orientation)
      const hasTraining =
        file.manpower.some((m) => m.status === "ISSUED" || Boolean(m.approvedAt) || Boolean(m.submittedAt)) ||
        docs.some((d) => /train|bmet.*train/i.test(d.type) && ["UPLOADED", "VERIFIED"].includes(d.status));
      const trainingStatus = hasTraining ? "DONE" : "PENDING";

      const statuses: Record<(typeof categories)[number], "PENDING" | "DONE" | "NO NEED"> = {
        "PC Documents": pcStatus,
        Certificate: certStatus,
        Licence: licenceStatus,
        CV: cvStatus,
        "BMET Finger": fingerStatus,
        "BMET Training": trainingStatus,
      };

      const rawCountry = file.country || "";
      const normalizedCountry = /saudi|ksa/i.test(rawCountry)
        ? "Saudi Arabia"
        : /dubai|uae|emirates/i.test(rawCountry)
        ? "Dubai"
        : "Other Country";

      return {
        id: file.id,
        fileNo: file.fileNo,
        candidateNo: file.candidate.candidateNo,
        name: file.candidate.fullName,
        phone: file.candidate.phone,
        passport: file.passport?.passportNumber ?? file.candidate.passportNo ?? "Not entered",
        country: normalizedCountry,
        rawCountry,
        officer: file.assignedTo?.name ?? "Unassigned",
        office: file.office?.name ?? "SELF",
        company: file.company ?? "N/A",
        profession: file.profession ?? file.candidate.profession ?? "N/A",
        statuses,
      };
    });

    const filtered = rows.filter((row) => {
      const matchesQ =
        !q ||
        [row.name, row.phone, row.passport, row.fileNo, row.country, row.rawCountry].some((v) =>
          v.toLowerCase().includes(q)
        );
      const matchesStatus = !wanted || Object.values(row.statuses).includes(wanted as never);
      const matchesCategory =
        !selectedCategory ||
        (selectedCategory in row.statuses &&
          (wanted ? row.statuses[selectedCategory as (typeof categories)[number]] === wanted : true));
      const matchesCountry =
        !country ||
        country === "All" ||
        row.country === country ||
        (country === "Other Country" && row.country === "Other Country");

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
