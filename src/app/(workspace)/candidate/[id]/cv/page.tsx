import type { Metadata } from "next";
import { connection } from "next/server";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { can } from "@/lib/authorization";
import { CandidateCvPageClient } from "@/components/modules/candidate-cv-page";
import type { CvData } from "@/lib/cv-pdf-generator";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  return {
    title: `Candidate CV Generator (${id}) | Orbit Overseas`,
    description: "Create, customize and download candidate CV in PDF format",
  };
}

function formatCvDate(date?: Date | string | null): string {
  if (!date) return "—";
  const d = typeof date === "string" ? new Date(date) : date;
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function calculateAge(date?: Date | string | null): string {
  if (!date) return "—";
  const d = typeof date === "string" ? new Date(date) : date;
  if (isNaN(d.getTime())) return "—";
  const now = new Date();
  let years = now.getFullYear() - d.getFullYear();
  const m = now.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) {
    years--;
  }
  return `${years} years`;
}

export default async function CandidateCvPageRoute({
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
        medical: { orderBy: { createdAt: "desc" as const }, take: 1 },
        visas: { orderBy: { createdAt: "desc" as const }, take: 1 },
        manpower: { orderBy: { createdAt: "desc" as const }, take: 1 },
      },
    },
    interviews: {
      orderBy: { scheduledAt: "desc" as const },
      take: 1,
      include: { schedule: true },
    },
    calls: {
      orderBy: { createdAt: "desc" as const },
      take: 1,
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

  // Fallback: check if id matches a processing file directly
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
  const activeEdu = candidate.educations[0];
  const activeExp = candidate.experiences[0];

  const profession =
    activeFile?.profession || candidate.profession || "General Trade";
  const nationality =
    activePassport?.nationality?.toUpperCase() || "BANGLADESHI";
  const gender = candidate.gender || "Male";
  const country =
    activeFile?.country || candidate.preferredCountry || "Overseas";

  // Default summary matching Image 2 style
  const defaultSummary = `${candidate.fullName} is a ${nationality.toLowerCase()} ${gender.toLowerCase()} applying for the ${profession} position. He has basic English skills and is eager to contribute to a clean, safe and productive work environment in ${country}.`;

  const initialExperiences = candidate.experiences.length > 0
    ? candidate.experiences.map((exp, idx) => ({
        id: exp.id || `exp-${idx + 1}`,
        title: exp.role || `${profession} (041)`,
        company: exp.employer || activeFile?.companyRecord?.name || activeFile?.company || "",
        period: exp.years ? `${exp.years} Years` : "Current",
        description: exp.skills ? String(exp.skills) : "",
      }))
    : [
        {
          id: "exp-1",
          title: activeExp?.role || `${profession} (041)`,
          company: activeFile?.companyRecord?.name || activeFile?.company || "Almarai",
          period: "Current",
          description: "",
        },
      ];

  const initialEducations = candidate.educations.length > 0
    ? candidate.educations.map((edu, idx) => ({
        id: edu.id || `edu-${idx + 1}`,
        level: edu.level,
        institute: edu.institution || "Dhaka Board",
        year: edu.passingYear ? String(edu.passingYear) : "2018",
        result: edu.result || "",
      }))
    : [
        {
          id: "edu-1",
          level: candidate.education || "HSC Passed",
          institute: "Dhaka Board",
          year: "2018",
          result: "",
        },
      ];

  const initialCvData: CvData = {
    id: candidate.id,
    candidateNo: candidate.candidateNo,
    fullName: candidate.fullName,
    profession,
    phone: candidate.phone,
    email: candidate.email || "—",
    address: candidate.address || candidate.district || "—",
    district: candidate.district || candidate.address || "—",
    languages: "Basic English",
    summary: defaultSummary,
    dob: formatCvDate(candidate.dob),
    age: calculateAge(candidate.dob),
    gender,
    nationality,
    nid: candidate.nationalId || "—",
    passportNo:
      activePassport?.passportNumber || candidate.passportNo || "—",
    passportIssueDate: formatCvDate(activePassport?.issueDate),
    passportExpiryDate: formatCvDate(activePassport?.expiryDate),
    fatherName: "",
    motherName: "",
    maritalStatus: candidate.maritalStatus || "Single",
    drivingLicense: "Valid Light Vehicle License",
    height: "5' 7\"",
    weight: "65 kg",
    qualification: activeEdu?.level || candidate.education || "Secondary School Certificate (SSC)",
    experiences: initialExperiences,
    educations: initialEducations,
    customFields: [],
    experienceTitle:
      activeExp?.role || `${profession} (041)`,
    experienceCompany:
      activeFile?.companyRecord?.name ||
      activeFile?.company ||
      activeExp?.employer ||
      "",
    experiencePeriod: "Current",
    experienceDescription:
      activeExp?.skills ? String(activeExp.skills) : "",
    educationLevel:
      activeEdu?.level || candidate.education || "Secondary School Certificate",
    educationInstitute: activeEdu?.institution || "Dhaka Board",
    educationYear: activeEdu?.passingYear ? String(activeEdu.passingYear) : "2018",
    profileImageUrl: candidate.photo
      ? /^https?:\/\//.test(candidate.photo)
        ? candidate.photo
        : `/api/candidates/${candidate.id}/photo?v=${candidate.updatedAt.getTime()}`
      : null,
    targetCountry: country,
  };

  return <CandidateCvPageClient initialData={initialCvData} />;
}
