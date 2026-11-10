import type { Metadata } from "next";
import { connection } from "next/server";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { can } from "@/lib/authorization";
import { CandidateMofaPageClient, type MofaData } from "@/components/modules/candidate-mofa-page";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  return {
    title: `Saudi Embassy MOFA Application (${id}) | Orbit Overseas`,
    description: "Generate and print official Saudi Arabia Embassy MOFA Visa Application Form",
  };
}

function formatDate(date?: Date | string | null): string {
  if (!date) return "";
  const d = typeof date === "string" ? new Date(date) : date;
  if (isNaN(d.getTime())) return "";
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  return `${day}-${month}-${year}`;
}

export default async function CandidateMofaPageRoute({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await connection();
  const session = await getSession();
  if (!session) redirect("/login");
  if (!(await can(session, "call-center", "read"))) redirect("/dashboard");

  const { id } = await params;

  const candidateInclude = {
    phones: true,
    educations: { orderBy: { passingYear: "desc" as const } },
    experiences: true,
    files: {
      orderBy: { updatedAt: "desc" as const },
      include: {
        passport: true,
        companyRecord: true,
        mofa: { orderBy: { createdAt: "desc" as const }, take: 1 },
      },
    },
    calls: {
      orderBy: { createdAt: "desc" as const },
      take: 2,
    },
  };

  let candidate = await prisma.candidate.findFirst({
    where: {
      OR: [
        { id },
        { candidateNo: id },
        { passportNo: id },
        { phone: id },
      ],
    },
    include: candidateInclude,
  });

  if (!candidate) {
    const file = await prisma.processingFile.findFirst({
      where: { OR: [{ id }, { fileNo: id }] },
      select: { candidateId: true },
    });

    if (file?.candidateId) {
      candidate = await prisma.candidate.findUnique({
        where: { id: file.candidateId },
        include: candidateInclude,
      });
    }
  }

  if (!candidate) {
    notFound();
  }

  const activeFile = candidate.files[0];
  const activePassport = activeFile?.passport;
  const activeMofa = activeFile?.mofa?.[0];
  const mofaMeta = (activeMofa?.metadata || {}) as Record<string, any>;

  // Extract father name and mother name from call notes if present
  let fatherName = mofaMeta.fatherName || "";
  let motherName = mofaMeta.motherName || "";
  let placeOfBirth = mofaMeta.placeOfBirth || candidate.district || "DHAKA";
  let religion = mofaMeta.religion || "ISLAM";
  let sect = mofaMeta.sect || "Sunni";

  if (!fatherName || !motherName) {
    for (const call of candidate.calls) {
      if (call.notes && typeof call.notes === "object") {
        const notesObj = call.notes as Record<string, any>;
        if (notesObj.identity) {
          if (!fatherName && notesObj.identity.fatherName) fatherName = notesObj.identity.fatherName;
          if (!motherName && notesObj.identity.motherName) motherName = notesObj.identity.motherName;
          if (!placeOfBirth && notesObj.identity.placeOfBirth) placeOfBirth = notesObj.identity.placeOfBirth;
        }
      }
    }
  }

  const mofaNumber = activeMofa?.mofaNumber || mofaMeta.mofaNumber || `E${Math.floor(100000000 + Math.random() * 900000000)}`;
  const sponsorName = activeFile?.companyRecord?.name || activeFile?.company || mofaMeta.sponsorNameAndAddress || "ALMARAI COMPANY, P.O. BOX 8524, RIYADH 11492, KINGDOM OF SAUDI ARABIA";
  const sponsorAddress = mofaMeta.sponsorNameAndAddress || sponsorName;

  const mofaData: MofaData = {
    candidateId: candidate.id,
    candidateNo: candidate.candidateNo,
    fileId: activeFile?.id,
    fileNo: activeFile?.fileNo,
    photo: candidate.photo
      ? /^https?:\/\//.test(candidate.photo)
        ? candidate.photo
        : `/api/candidates/${candidate.id}/photo?v=${candidate.updatedAt.getTime()}`
      : null,

    // Barcode & Application
    mofaNumber,
    applicationType: mofaMeta.applicationType || "New Application",
    visaType: mofaMeta.visaType || "Work Visa",

    // Personal Info
    fullName: candidate.fullName,
    fatherName,
    motherName,
    dob: formatDate(candidate.dob),
    placeOfBirth: placeOfBirth.toUpperCase(),
    prevNationality: "BANGLADESHI",
    presentNationality: "BANGLADESHI",
    sex: (candidate.gender || "male").toLowerCase(),
    maritalStatus: candidate.maritalStatus || "Single",
    sect,
    religion,
    qualification: mofaMeta.qualification || candidate.education || candidate.educations[0]?.level || "Secondary (SSC)",
    profession: activeFile?.profession || candidate.profession || "General Trade",
    professionAr: mofaMeta.professionAr || "عامل عادي",
    homeAddress: candidate.address || `Village / Area: ${candidate.district || "Dhaka"}, Bangladesh, Phone: ${candidate.phone}`,
    phone: candidate.phone,

    // Agency Info
    agencyName: mofaMeta.agencyName || "ORBIT RECRUITMENT AGENCY",
    agencyRl: mofaMeta.agencyRl || "1542",
    agencyAddress: mofaMeta.agencyAddress || "Plot No. 23, Road No. 11, Block F, Banani, Dhaka-1213, Bangladesh",
    agencyPhone: mofaMeta.agencyPhone || "+880 1800 000000",

    // Passport Info
    passportNo: activePassport?.passportNumber || candidate.passportNo || "—",
    issuePlace: activePassport?.issuePlace || activePassport?.issuingAuthority || "DHAKA",
    issueDate: formatDate(activePassport?.issueDate) || "10-01-2023",
    expiryDate: formatDate(activePassport?.expiryDate) || "09-01-2033",

    // Travel & Sponsor Info
    purposeOfTravel: (mofaMeta.purposeOfTravel as any) || "Work",
    durationOfStay: mofaMeta.durationOfStay || "02 Years",
    dateOfArrival: mofaMeta.dateOfArrival || "",
    dateOfDeparture: mofaMeta.dateOfDeparture || "",
    modeOfPayment: (mofaMeta.modeOfPayment as any) || "Cash",
    paymentChequeNo: mofaMeta.paymentChequeNo || "",
    paymentDate: mofaMeta.paymentDate || "",
    relationship: mofaMeta.relationship || "EMPLOYER AND EMPLOYEE",
    destinationCity: mofaMeta.destinationCity || "CITY: RIYADH, K.S.A",
    carrier: mofaMeta.carrier || "SAUDI AIRLINES / BIMAN BANGLADESH AIRLINES",
    sponsorNameAndAddress: sponsorAddress,

    dependents: [],
  };

  return <CandidateMofaPageClient initialData={mofaData} />;
}
