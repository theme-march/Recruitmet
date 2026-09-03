import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { officeScope } from "@/lib/authorization";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ data: {} });
    }

    const scope = officeScope(session);

    // Live counts for all country pipelines and call center
    const [ksaFiles, dubaiFiles, otherFiles, workCalls, interviews, demands, agentsCount, countriesCount, totalCandidatesCount] = await Promise.all([
      prisma.processingFile.findMany({
        where: { ...scope, country: { contains: "Saudi" } },
        select: {
          id: true,
          currentStage: true,
          passport: { select: { id: true } },
          medical: { select: { id: true } },
          mofa: { select: { id: true } },
          takamul: { select: { id: true } },
          biometrics: { select: { id: true } },
          police: { select: { id: true } },
          payments: { select: { id: true, type: true } },
          visas: { select: { id: true } },
          manpower: { select: { id: true } },
          flights: { select: { flightId: true } },
          holds: { select: { id: true, type: true } },
        },
      }),
      prisma.processingFile.findMany({
        where: { ...scope, country: { in: ["Dubai", "UAE", "United Arab Emirates"] } },
        select: {
          id: true,
          currentStage: true,
          passport: { select: { id: true } },
          medical: { select: { id: true } },
          visas: { select: { id: true } },
          holds: { select: { id: true, type: true } },
        },
      }),
      prisma.processingFile.findMany({
        where: { ...scope, country: { notIn: ["Saudi", "Saudi Arabia", "Dubai", "UAE", "United Arab Emirates"] } },
        select: {
          id: true,
          currentStage: true,
          passport: { select: { id: true } },
          medical: { select: { id: true } },
          visas: { select: { id: true } },
          holds: { select: { id: true, type: true } },
        },
      }),
      prisma.workCall.count(),
      prisma.interviewSchedule.count(),
      prisma.demand.count(),
      prisma.agent.count(),
      prisma.country.count({ where: { active: true } }),
      prisma.candidate.count({ where: scope }),
    ]);

    type FileRecord = (typeof ksaFiles)[number];

    const computeKsa = () => ({
      "Candidates List": ksaFiles.length,
      "Passport List": ksaFiles.length,
      "Passport Entry": ksaFiles.filter((f: FileRecord) => !!f.passport).length,
      "Medical": ksaFiles.filter((f: FileRecord) => f.medical.length > 0).length,
      "Mofa": ksaFiles.filter((f: FileRecord) => f.mofa.length > 0).length,
      "Takamul": ksaFiles.filter((f: FileRecord) => f.takamul.length > 0).length,
      "KSA Bio Finger": ksaFiles.filter((f: FileRecord) => f.biometrics.length > 0).length,
      "Police Clarence": ksaFiles.filter((f: FileRecord) => f.police.length > 0).length,
      "First Payment": ksaFiles.filter((f: FileRecord) => f.payments.some((p: { type: string }) => /first/i.test(p.type))).length,
      "Pre Confirm File": ksaFiles.filter((f: FileRecord) => f.currentStage === "Pre Confirm File").length,
      "E-Visa Stumping": ksaFiles.filter((f: FileRecord) => f.visas.length > 0).length,
      "E-Visa Hold": ksaFiles.filter((f: FileRecord) => f.holds.some((h: { type: string }) => /hold/i.test(h.type))).length,
      "Pending Second Payment": ksaFiles.filter((f: FileRecord) => f.payments.some((p: { type: string }) => /second/i.test(p.type))).length,
      "Manpower": ksaFiles.filter((f: FileRecord) => f.manpower.length > 0).length,
      "Ready For Flight": ksaFiles.filter((f: FileRecord) => f.currentStage === "Ready To Flight").length,
      "Flight": ksaFiles.filter((f: FileRecord) => f.flights.length > 0).length,
      "Return File": ksaFiles.filter((f: FileRecord) => f.holds.some((h: { type: string }) => /return/i.test(h.type))).length,
    });

    const computeDubai = () => ({
      "Candidates List": dubaiFiles.length,
      "Passport List": dubaiFiles.length,
      "Passport Entry": dubaiFiles.filter((f) => !!f.passport).length,
      "Medical": dubaiFiles.filter((f) => f.medical.length > 0).length,
      "First Payment": 0,
      "Approval Application": 0,
      "E-Visa Stumping": dubaiFiles.filter((f) => f.visas.length > 0).length,
      "E-Visa Hold": dubaiFiles.filter((f) => f.holds.some((h) => /hold/i.test(h.type))).length,
      "Second Payment": 0,
      "Visa Done": dubaiFiles.filter((f) => f.visas.length > 0).length,
      "Manpower": 0,
      "Ready to Flight": 0,
      "Flight": 0,
      "Hold File": dubaiFiles.filter((f) => f.holds.some((h) => /hold/i.test(h.type))).length,
      "Return File": dubaiFiles.filter((f) => f.holds.some((h) => /return/i.test(h.type))).length,
    });

    const computeOther = () => ({
      "Candidates List": otherFiles.length,
      "Passport List": otherFiles.length,
      "Passport Entry": otherFiles.filter((f) => !!f.passport).length,
      "Medical": otherFiles.filter((f) => f.medical.length > 0).length,
      "First Payment": 0,
      "Approval Application": 0,
      "Confirm File": 0,
      "E-Visa Stumping": otherFiles.filter((f) => f.visas.length > 0).length,
      "E-Visa Hold": otherFiles.filter((f) => f.holds.some((h) => /hold/i.test(h.type))).length,
      "Second Payment": 0,
      "Visa Done": otherFiles.filter((f) => f.visas.length > 0).length,
      "Manpower": 0,
      "Ready to Flight": 0,
      "Flight": 0,
      "Hold File": otherFiles.filter((f) => f.holds.some((h) => /hold/i.test(h.type))).length,
      "Return File": otherFiles.filter((f) => f.holds.some((h) => /return/i.test(h.type))).length,
    });


    return NextResponse.json(
      {
        data: {
          "call-center": {
            "Candidate List": totalCandidatesCount,
            "Registration & interviews": interviews,
          },
          "ksa": computeKsa(),
          "dubai": computeDubai(),
          "other-country": computeOther(),
          "office-vendor": {
            "Works & Demands": demands,
          },
          "agents": {
            "Agent List": agentsCount,
          },
          "country-setup": {
            "Destination Countries": countriesCount,
          },
        },
      },
      {
        headers: {
          "Cache-Control": "private, max-age=15, stale-while-revalidate=45",
        },
      }
    );
  } catch (error) {
    console.error("Error loading nav counts:", error);
    return NextResponse.json({ data: {} }, { status: 500 });
  }
}

