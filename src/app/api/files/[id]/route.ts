import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { z } from "zod";
import { AppError, errorResponse } from "@/lib/errors";
import { getWorkflow, transitionFile } from "@/features/workflow/service";

function parseSafeDate(d?: string | null): Date | undefined {
  if (!d || typeof d !== "string") return undefined;
  const trimmed = d.trim();
  if (!trimmed) return undefined;

  const direct = new Date(trimmed);
  if (!isNaN(direct.getTime())) return direct;

  const parts = trimmed.split(/[-/.]/);
  if (parts.length === 3) {
    const p1 = parseInt(parts[0], 10);
    const p2 = parseInt(parts[1], 10);
    const p3 = parseInt(parts[2], 10);
    if (p3 > 1900) {
      const d1 = new Date(p3, p1 - 1, p2);
      if (!isNaN(d1.getTime())) return d1;
    }
  }
  return undefined;
}

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession();
    if (!session) throw new AppError("UNAUTHORIZED", "Sign in is required.", 401);

    const { id } = await params;
    const fileInclude = {
      candidate: {
        include: {
          office: true,
          phones: true,
          educations: true,
          experiences: true,
          calls: {
            include: {
              followUps: true,
              callRecords: true,
              assignedTo: { select: { id: true, name: true, phone: true } },
            },
            orderBy: { createdAt: "desc" as const },
            take: 5,
          },
          interviews: {
            include: {
              assessments: true,
            },
            orderBy: { scheduledAt: "desc" as const },
            take: 5,
          },
        },
      },
      office: true,
      companyRecord: true,
      demandRecord: true,
      assignedTo: { select: { id: true, name: true, phone: true } },
      passport: true,
      medical: { orderBy: { createdAt: "desc" as const }, take: 5 },
      mofa: { orderBy: { createdAt: "desc" as const }, take: 5 },
      takamul: { orderBy: { createdAt: "desc" as const }, take: 5 },
      biometrics: { orderBy: { createdAt: "desc" as const }, take: 5 },
      police: { orderBy: { createdAt: "desc" as const }, take: 5 },
      visas: { orderBy: { createdAt: "desc" as const }, take: 5 },
      manpower: { orderBy: { createdAt: "desc" as const }, take: 5 },
      payments: { orderBy: { createdAt: "desc" as const } },
      holds: { orderBy: { createdAt: "desc" as const } },
      flights: { include: { flight: true } },
      statusHistory: { orderBy: { createdAt: "desc" as const } },
      documents: { orderBy: { createdAt: "desc" as const } },
      workflowEvents: { orderBy: { createdAt: "desc" as const } },
    };

    let file = await prisma.processingFile.findUnique({
      where: { id },
      include: fileInclude,
    });

    if (!file) {
      file = await prisma.processingFile.findFirst({
        where: { fileNo: id },
        include: fileInclude,
      });
    }

    if (!file) {
      const workCall = await prisma.workCall.findFirst({
        where: {
          OR: [{ id }, { leadNo: id }],
        },
        include: {
          candidate: {
            include: {
              files: {
                orderBy: { createdAt: "desc" },
                take: 1,
              },
            },
          },
        },
      });

      if (workCall) {
        let targetFileId = workCall.candidate?.files?.[0]?.id;
        let candId = workCall.candidateId;

        if (!candId) {
          let cand = await prisma.candidate.findFirst({
            where: { phone: workCall.phone },
            include: { files: { take: 1 } },
          });
          if (!cand) {
            cand = await prisma.candidate.create({
              data: {
                candidateNo: `CAN-${Date.now().toString().slice(-6)}`,
                fullName: workCall.fullName,
                phone: workCall.phone,
                preferredCountry: workCall.country || "Saudi Arabia",
                profession: workCall.workCategory || "General",
              },
              include: { files: true },
            });
          }
          candId = cand.id;
          targetFileId = cand.files?.[0]?.id;

          await prisma.workCall.update({
            where: { id: workCall.id },
            data: { candidateId: candId },
          });
        }

        if (!targetFileId && candId) {
          const newFile = await prisma.processingFile.create({
            data: {
              fileNo: `FILE-${Date.now().toString().slice(-6)}`,
              candidateId: candId,
              country: workCall.country || "Saudi Arabia",
              currentStage: "Passport Entry",
              status: "ACTIVE",
              assignedToId: workCall.assignedToId || session.user.id,
              profession: workCall.workCategory || undefined,
            },
          });
          targetFileId = newFile.id;
        }

        if (targetFileId) {
          file = await prisma.processingFile.findUnique({
            where: { id: targetFileId },
            include: fileInclude,
          });
        }
      }
    }

    if (!file) {
      const cand = await prisma.candidate.findFirst({
        where: {
          OR: [{ id }, { candidateNo: id }],
        },
        include: {
          files: {
            orderBy: { createdAt: "desc" },
            take: 1,
          },
        },
      });

      if (cand) {
        let targetFileId = cand.files?.[0]?.id;
        if (!targetFileId) {
          const newFile = await prisma.processingFile.create({
            data: {
              fileNo: `FILE-${Date.now().toString().slice(-6)}`,
              candidateId: cand.id,
              country: cand.preferredCountry || "Saudi Arabia",
              currentStage: "Passport Entry",
              status: "ACTIVE",
              assignedToId: session.user.id,
              profession: cand.profession || undefined,
            },
          });
          targetFileId = newFile.id;
        }
        if (targetFileId) {
          file = await prisma.processingFile.findUnique({
            where: { id: targetFileId },
            include: fileInclude,
          });
        }
      }
    }

    if (!file) {
      const interview = await prisma.interview.findUnique({
        where: { id },
        include: {
          candidate: {
            include: {
              files: {
                orderBy: { createdAt: "desc" },
                take: 1,
              },
            },
          },
        },
      });

      if (interview && interview.candidate) {
        let targetFileId = interview.candidate.files?.[0]?.id;
        if (!targetFileId) {
          const isDubai = /sobha|dubai|uae/i.test(interview.title || interview.company || "");
          const newFile = await prisma.processingFile.create({
            data: {
              fileNo: `FILE-${Date.now().toString().slice(-6)}`,
              candidateId: interview.candidate.id,
              country: isDubai ? "Dubai" : "Saudi Arabia",
              currentStage: "Passport Entry",
              status: "ACTIVE",
              assignedToId: session.user.id,
              profession: interview.profession || "General Worker",
            },
          });
          targetFileId = newFile.id;
        }
        if (targetFileId) {
          file = await prisma.processingFile.findUnique({
            where: { id: targetFileId },
            include: fileInclude,
          });
        }
      }
    }

    if (!file) throw new AppError("NOT_FOUND", "Candidate processing file not found.", 404);

    let workflowList: Array<{ code: string; name: string; order: number; terminal: boolean }> = [];
    try {
      const workflow = await getWorkflow(file.country || "Saudi Arabia");
      if (workflow?.workflow) {
        workflowList = workflow.workflow.map((x) => ({ code: x.code, name: x.name, order: x.sortOrder, terminal: x.terminal }));
      }
    } catch {
      workflowList = [
        { code: "PASSPORT", name: "Passport Entry", order: 1, terminal: false },
        { code: "MEDICAL", name: "Medical", order: 2, terminal: false },
        { code: "POLICE", name: "Police Clearance", order: 3, terminal: false },
        { code: "PAYMENT", name: "Payment", order: 4, terminal: false },
        { code: "TAKAMUL", name: "Takamul", order: 5, terminal: false },
        { code: "MOFA", name: "Mofa", order: 6, terminal: false },
        { code: "MANPOWER", name: "Manpower", order: 7, terminal: false },
        { code: "FLIGHT", name: "Flight", order: 8, terminal: true },
      ];
    }

    // Resolve agent and agent record safely
    let resolvedAgentName = file.agent || file.candidate?.source || "Direct";
    try {
      const workCallForAgent = await prisma.workCall.findFirst({ where: { candidateId: file.candidateId } });
      const workCallNotes = (workCallForAgent?.notes ?? {}) as Record<string, unknown>;
      const workObj = (workCallNotes.work ?? {}) as Record<string, unknown>;
      resolvedAgentName = file.agent || (workObj.agent as string) || file.candidate?.source || "Direct";
    } catch {}

    let agentRecord = null;
    try {
      if (resolvedAgentName && resolvedAgentName !== "Direct" && resolvedAgentName !== "Direct Office") {
        agentRecord = await prisma.agent.findFirst({
          where: {
            OR: [
              { name: { contains: resolvedAgentName } },
              { code: { contains: resolvedAgentName } },
            ],
          },
          select: { id: true, name: true, code: true, phone: true, district: true },
        });
      }
    } catch {}

    const paymentsList = (file.payments || []).map((p) => ({ ...p, amount: Number(p.amount) }));
    const totalPaid = paymentsList.reduce((sum, p) => sum + (p.amount || 0), 0);
    const isDubai = /dubai|uae/i.test(file.country || "");
    const demandPkg = Number((file.demandRecord as any)?.packagePrice || 0);
    const packageCost = demandPkg > 0 ? demandPkg : (isDubai ? 300000 : 350000);
    const dueAmount = Math.max(0, packageCost - totalPaid);
    const advanceAmount = Math.max(0, totalPaid - packageCost);

    const resolvedPassportNumber = file.passport?.passportNumber || file.candidate?.passportNo || null;

    return NextResponse.json({
      data: {
        ...file,
        agent: resolvedAgentName,
        agentRecord,
        packageCost,
        totalPaid,
        dueAmount,
        advanceAmount,
        passport: file.passport
          ? {
              ...file.passport,
              passportNo: file.passport.passportNumber,
              passportNumber: file.passport.passportNumber,
            }
          : resolvedPassportNumber
          ? {
              passportNo: resolvedPassportNumber,
              passportNumber: resolvedPassportNumber,
              verificationStatus: "Verified",
            }
          : null,
        candidate: file.candidate
          ? {
              ...file.candidate,
              passportNo: resolvedPassportNumber,
              passportNumber: resolvedPassportNumber,
            }
          : null,
        payments: paymentsList,
        holds: (file.holds || []).map((h) => ({ ...h, financialImpact: h.financialImpact ? Number(h.financialImpact) : null })),
        workflow: workflowList,
      },
    });
  } catch (error) {
    console.error("Error in /api/files/[id]:", error);
    return errorResponse(error);
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession();
    if (!session) throw new AppError("UNAUTHORIZED", "Sign in is required.", 401);

    const { id } = await params;
    const body = await request.json();
    const action = body.action || "stage-transition";

    // Dynamically resolve target processing file
    let file = await prisma.processingFile.findUnique({
      where: { id },
      include: { candidate: true },
    });

    if (!file) {
      file = await prisma.processingFile.findFirst({
        where: { fileNo: id },
        include: { candidate: true },
      });
    }

    if (!file) {
      file = await prisma.processingFile.findFirst({
        where: {
          OR: [
            { candidateId: id },
            { candidate: { candidateNo: id } },
          ],
        },
        include: { candidate: true },
      });
    }

    if (!file) {
      const workCall = await prisma.workCall.findFirst({
        where: { OR: [{ id }, { leadNo: id }] },
        include: { candidate: { include: { files: { take: 1 } } } },
      });
      if (workCall?.candidate?.files?.[0]) {
        file = await prisma.processingFile.findUnique({
          where: { id: workCall.candidate.files[0].id },
          include: { candidate: true },
        });
      }
    }

    if (!file) {
      throw new AppError("NOT_FOUND", "Candidate processing file record not found.", 404);
    }

    const fileId = file.id;

    // 1. Stage transition
    if (action === "stage-transition") {
      const { stage, reason } = z.object({
        stage: z.string().min(2),
        reason: z.string().nullish(),
      }).parse(body);

      const updated = await transitionFile({
        fileId,
        targetStage: stage,
        reason: reason || "Stage updated by officer",
        session,
      });
      return NextResponse.json({ ok: true, data: updated });
    }

    // 0. Update Candidate Bio-Data & Master Registration Info
    if (action === "update-candidate-bio" || action === "update-bio") {
      const bioSchema = z.object({
        fullName: z.string().min(2, "Full name is required"),
        phone: z.string().min(5, "Phone number is required"),
        alternatePhone: z.string().nullish(),
        nationalId: z.string().nullish(),
        email: z.string().nullish(),
        dob: z.string().nullish(),
        gender: z.string().nullish(),
        maritalStatus: z.string().nullish(),
        district: z.string().nullish(),
        address: z.string().nullish(),
        profession: z.string().nullish(),
        country: z.string().nullish(),
        preferredCountry: z.string().nullish(),
        agent: z.string().nullish(),
        source: z.string().nullish(),
      });

      const bioData = bioSchema.parse(body);
      const parsedDob = bioData.dob ? parseSafeDate(bioData.dob) : undefined;
      const targetCountry = bioData.country || bioData.preferredCountry || file.country;
      const targetProfession = bioData.profession?.trim() || file.profession || "General Worker";
      const targetAgent = (bioData.agent || bioData.source || "").trim() || file.agent || "Direct";

      // 1. Update Candidate Master
      await prisma.candidate.update({
        where: { id: file.candidateId },
        data: {
          fullName: bioData.fullName.trim(),
          phone: bioData.phone.trim(),
          nationalId: bioData.nationalId?.trim() || null,
          email: bioData.email?.trim() || null,
          dob: parsedDob || file.candidate.dob,
          gender: bioData.gender || file.candidate.gender || "Male",
          maritalStatus: bioData.maritalStatus || file.candidate.maritalStatus || "Single",
          district: bioData.district?.trim() || file.candidate.district || "Dhaka",
          address: bioData.address?.trim() || file.candidate.address || null,
          profession: targetProfession,
          preferredCountry: targetCountry,
          source: targetAgent,
        },
      });

      // 2. Update File Level Details
      await prisma.processingFile.update({
        where: { id: file.id },
        data: {
          profession: targetProfession,
          country: targetCountry,
          agent: targetAgent,
        },
      });

      // 3. Update or create Alternate Phone
      if (bioData.alternatePhone?.trim()) {
        const alt = bioData.alternatePhone.trim();
        const existingAlt = await prisma.candidatePhone.findFirst({
          where: { candidateId: file.candidateId, isPrimary: false },
        });

        if (existingAlt) {
          await prisma.candidatePhone.update({
            where: { id: existingAlt.id },
            data: { phone: alt },
          }).catch(() => {});
        } else {
          await prisma.candidatePhone.create({
            data: {
              candidateId: file.candidateId,
              phone: alt,
              label: "Alternate",
              isPrimary: false,
            },
          }).catch(() => {});
        }
      }

      // 4. Also update WorkCall lead fullName / phone if exists
      await prisma.workCall.updateMany({
        where: { candidateId: file.candidateId },
        data: {
          fullName: bioData.fullName.trim(),
          phone: bioData.phone.trim(),
          country: targetCountry,
          workCategory: targetProfession,
        },
      }).catch(() => {});

      return NextResponse.json({
        ok: true,
        message: "Candidate registration details & bio-data updated successfully!",
      });
    }

    // 2. Update Passport
    if (action === "update-passport") {
      const { passportNumber, expiryDate, issueDate, verificationStatus } = z.object({
        passportNumber: z.string().min(1, "Passport Number is required"),
        expiryDate: z.string().nullish(),
        issueDate: z.string().nullish(),
        verificationStatus: z.string().nullish(),
      }).parse(body);

      const cleanPassport = passportNumber.trim();
      const parsedIssue = parseSafeDate(issueDate) || new Date("2022-01-01");
      const parsedExpiry = parseSafeDate(expiryDate) || new Date("2032-01-01");
      const status = verificationStatus || "Verified";

      // 1. Update Candidate passportNo
      await prisma.candidate.update({
        where: { id: file.candidateId },
        data: { passportNo: cleanPassport },
      }).catch(() => {});

      // 2. Upsert Passport Process
      await prisma.passportProcess.upsert({
        where: { fileId },
        create: {
          fileId,
          passportNumber: cleanPassport,
          passportType: "Ordinary",
          issueDate: parsedIssue,
          expiryDate: parsedExpiry,
          verificationStatus: status,
        },
        update: {
          passportNumber: cleanPassport,
          expiryDate: parsedExpiry,
          issueDate: parsedIssue,
          verificationStatus: status,
        },
      }).catch(async () => {
        const existing = await prisma.passportProcess.findFirst({ where: { fileId } });
        if (existing) {
          await prisma.passportProcess.update({
            where: { id: existing.id },
            data: {
              passportNumber: cleanPassport,
              expiryDate: parsedExpiry,
              issueDate: parsedIssue,
              verificationStatus: status,
            },
          });
        }
      });

      // 3. Move File to Medical Stage
      await prisma.processingFile.update({
        where: { id: fileId },
        data: { currentStage: "Medical", status: "ACTIVE" },
      });

      return NextResponse.json({ ok: true, message: "Passport details saved and candidate advanced to Medical stage!" });
    }

    // 3. Update Medical
    if (action === "update-medical") {
      const { result, medicalCenter, centerName, testDate, tenFingerDone, pictureCollected, medicalSlip, remarks } = z.object({
        result: z.string().nullish(),
        medicalCenter: z.string().nullish(),
        centerName: z.string().nullish(),
        testDate: z.string().nullish(),
        tenFingerDone: z.boolean().nullish(),
        pictureCollected: z.boolean().nullish(),
        medicalSlip: z.boolean().nullish(),
        remarks: z.string().nullish(),
      }).parse(body);

      const resolvedResult = result || "FIT";
      const normResult = resolvedResult.includes("FIT") || resolvedResult.includes("Passed")
        ? "Fit"
        : resolvedResult.includes("UNFIT") || resolvedResult.includes("Failed")
        ? "Unfit"
        : resolvedResult;

      const parsedTestDate = parseSafeDate(testDate) || new Date();
      const existingMed = await prisma.medicalProcess.findFirst({ where: { fileId } });

      if (existingMed) {
        await prisma.medicalProcess.update({
          where: { id: existingMed.id },
          data: {
            center: centerName || medicalCenter || "Ibn Sina GCC Medical Center, Dhaka",
            result: normResult,
            testDate: parsedTestDate,
            metadata: {
              tenFingerDone: Boolean(tenFingerDone),
              pictureCollected: Boolean(pictureCollected),
              medicalSlip: Boolean(medicalSlip),
              remarks: remarks || "",
              fitCardStatus: normResult,
            },
          },
        });
      } else {
        await prisma.medicalProcess.create({
          data: {
            fileId,
            center: centerName || medicalCenter || "Ibn Sina GCC Medical Center, Dhaka",
            result: normResult,
            testDate: parsedTestDate,
            expiryDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
            metadata: {
              tenFingerDone: Boolean(tenFingerDone),
              pictureCollected: Boolean(pictureCollected),
              medicalSlip: Boolean(medicalSlip),
              remarks: remarks || "",
              fitCardStatus: normResult,
            },
          },
        });
      }

      // Next stage
      const nextStage = /saudi/i.test(file.country)
        ? (normResult === "Fit" ? "Police Clearance" : "Hold File")
        : (normResult === "Fit" ? "Payment" : "Hold File");

      await prisma.processingFile.update({
        where: { id: fileId },
        data: { currentStage: nextStage, status: "ACTIVE" },
      });

      return NextResponse.json({ ok: true, message: `Medical examination recorded as ${normResult} and moved to ${nextStage}!` });
    }

    // 3.5 Update Police Clearance
    if (action === "update-police") {
      const { applicationNumber, applicationDate, issueDate, expiryDate, result, status, certificateKey } = z.object({
        applicationNumber: z.string().nullish(),
        applicationDate: z.string().nullish(),
        issueDate: z.string().nullish(),
        expiryDate: z.string().nullish(),
        result: z.string().nullish(),
        status: z.string().nullish(),
        certificateKey: z.string().nullish(),
      }).parse(body);

      const safeAppNo = applicationNumber?.trim() || `PCC-${file.fileNo}`;
      const existingPcc = await prisma.policeClearance.findFirst({ where: { fileId } });

      const parsedAppDate = parseSafeDate(applicationDate) || new Date();
      const parsedIssueDate = parseSafeDate(issueDate) || new Date();
      const parsedExpiryDate = parseSafeDate(expiryDate) || new Date(Date.now() + 180 * 24 * 60 * 60 * 1000);

      if (existingPcc) {
        await prisma.policeClearance.update({
          where: { id: existingPcc.id },
          data: {
            applicationNumber: safeAppNo,
            applicationDate: parsedAppDate,
            issueDate: parsedIssueDate,
            expiryDate: parsedExpiryDate,
            result: result || "Clear / Verified",
            status: status || "Approved",
            certificateKey: certificateKey || `CERT-PCC-${file.candidate.candidateNo}`,
          },
        }).catch(async () => {
          await prisma.policeClearance.update({
            where: { id: existingPcc.id },
            data: {
              applicationDate: parsedAppDate,
              issueDate: parsedIssueDate,
              expiryDate: parsedExpiryDate,
              result: result || "Clear / Verified",
              status: status || "Approved",
            },
          });
        });
      } else {
        await prisma.policeClearance.create({
          data: {
            fileId,
            applicationNumber: safeAppNo,
            applicationDate: parsedAppDate,
            issueDate: parsedIssueDate,
            expiryDate: parsedExpiryDate,
            result: result || "Clear / Verified",
            status: status || "Approved",
            certificateKey: certificateKey || `CERT-PCC-${file.candidate.candidateNo}`,
          },
        }).catch(async () => {
          await prisma.policeClearance.create({
            data: {
              fileId,
              applicationNumber: `${safeAppNo}-${Date.now().toString().slice(-4)}`,
              applicationDate: parsedAppDate,
              issueDate: parsedIssueDate,
              expiryDate: parsedExpiryDate,
              result: result || "Clear / Verified",
              status: status || "Approved",
            },
          });
        });
      }

      await prisma.processingFile.update({
        where: { id: fileId },
        data: { currentStage: "Payment", status: "ACTIVE" },
      });

      return NextResponse.json({ ok: true, message: "Police Clearance certificate saved and moved to Payment stage!" });
    }

    // 4. Record Payment
    if (action === "record-payment") {
      const { amount, type, method, reference, targetStage, documentUrl, fileName } = z.object({
        amount: z.coerce.number().min(0),
        type: z.string().nullish(),
        method: z.string().nullish(),
        reference: z.string().nullish(),
        targetStage: z.string().nullish(),
        documentUrl: z.string().nullish(),
        fileName: z.string().nullish(),
      }).parse(body);

      const paymentType = type?.trim() || "Payment Deposit";
      await prisma.payment.create({
        data: {
          paymentNo: `PAY-${Date.now().toString().slice(-8)}`,
          fileId,
          candidateId: file.candidateId,
          type: paymentType,
          amount,
          status: "PAID",
          method: method || "Cash",
          reference: reference || `REC-${Date.now().toString().slice(-6)}`,
        },
      });

      if (documentUrl) {
        await prisma.document.create({
          data: {
            documentNo: `DOC-${Date.now().toString().slice(-8)}`,
            candidateId: file.candidateId,
            fileId,
            type: "payment_voucher",
            fileName: fileName || `${paymentType}-Voucher.pdf`,
            url: documentUrl,
          },
        }).catch(() => {});
      }

      const nextStage = targetStage || (/saudi/i.test(file.country) ? "Takamul" : /dubai/i.test(file.country) ? "Approval Application" : "E-Visa Stamping");

      await prisma.processingFile.update({
        where: { id: fileId },
        data: { currentStage: nextStage, status: "ACTIVE" },
      });

      return NextResponse.json({ ok: true, message: `Payment of ৳ ${amount.toLocaleString()} BDT (${paymentType}) recorded successfully!` });
    }

    // 4.5 Update Takamul Skill Test
    if (action === "update-takamul") {
      const {
        certificateNumber,
        registrationNumber,
        examDate,
        presentDate,
        centerDistrict,
        status,
        reportStatus,
        doneBy,
        visaProfession,
        takamulProfession,
        remarks,
      } = z.object({
        certificateNumber: z.string().nullish(),
        registrationNumber: z.string().nullish(),
        examDate: z.string().nullish(),
        presentDate: z.string().nullish(),
        centerDistrict: z.string().nullish(),
        status: z.string().nullish(),
        reportStatus: z.string().nullish(),
        doneBy: z.string().nullish(),
        visaProfession: z.string().nullish(),
        takamulProfession: z.string().nullish(),
        remarks: z.string().nullish(),
      }).parse(body);

      const safeCertNo = certificateNumber?.trim() || `TAK-${Date.now().toString().slice(-7)}`;
      const safeRegNo = registrationNumber?.trim() || `REG-TAK-${Date.now().toString().slice(-6)}`;
      const parsedExamDate = parseSafeDate(examDate) || new Date();
      const parsedPresentDate = parseSafeDate(presentDate) || new Date();

      const existing = await prisma.takamulProcess.findFirst({ where: { fileId } });
      if (existing) {
        await prisma.takamulProcess.update({
          where: { id: existing.id },
          data: {
            certificateNumber: safeCertNo,
            registrationNumber: safeRegNo,
            centerDistrict: centerDistrict || "Dhaka",
            status: status || "Present",
            reportStatus: reportStatus || "Passed",
            doneBy: doneBy || "Office",
            visaProfession: visaProfession || file.profession || "Electrician",
            takamulProfession: takamulProfession || file.profession || "Electrician",
            remarks: remarks || "",
          },
        }).catch(async () => {
          await prisma.takamulProcess.update({
            where: { id: existing.id },
            data: {
              reportStatus: reportStatus || "Passed",
              status: status || "Present",
            },
          });
        });
      } else {
        await prisma.takamulProcess.create({
          data: {
            fileId,
            registrationNumber: safeRegNo,
            certificateNumber: safeCertNo,
            examDate: parsedExamDate,
            presentDate: parsedPresentDate,
            centerDistrict: centerDistrict || "Dhaka",
            status: status || "Present",
            reportStatus: reportStatus || "Passed",
            doneBy: doneBy || "Office",
            visaProfession: visaProfession || file.profession || "Electrician",
            takamulProfession: takamulProfession || file.profession || "Electrician",
            remarks: remarks || "",
          },
        }).catch(async () => {
          await prisma.takamulProcess.create({
            data: {
              fileId,
              registrationNumber: `${safeRegNo}-${Date.now().toString().slice(-3)}`,
              certificateNumber: `${safeCertNo}-${Date.now().toString().slice(-3)}`,
              centerDistrict: centerDistrict || "Dhaka",
              status: status || "Present",
              reportStatus: reportStatus || "Passed",
            },
          });
        });
      }

      await prisma.processingFile.update({
        where: { id: fileId },
        data: { currentStage: "Mofa", status: "ACTIVE" },
      });

      return NextResponse.json({ ok: true, message: "Takamul skill certificate saved and moved to Visa / MOFA stage!" });
    }

    // 4.5. Update Dubai / Europe MOHRE Labor Approval & Offer Letter
    if (action === "update-approval" || action === "update-labor-approval") {
      const { applicationNo, laborCardNo, offerLetterStatus, approvalStatus, companyName, remarks } = z.object({
        applicationNo: z.string().nullish(),
        laborCardNo: z.string().nullish(),
        offerLetterStatus: z.string().nullish(),
        approvalStatus: z.string().nullish(),
        companyName: z.string().nullish(),
        remarks: z.string().nullish(),
      }).parse(body);

      const safeAppNo = applicationNo?.trim() || `MB-${Date.now().toString().slice(-6)}`;
      const safeStatus = approvalStatus?.trim() || "Approved";

      // 1. Create or update WorkflowEvent for Labor Approval
      const existingEvent = await prisma.workflowEvent.findFirst({
        where: {
          fileId,
          stage: { in: ["LABOR_APPROVAL", "Approval Application", "Labor Approval"] },
        },
        orderBy: { createdAt: "desc" },
      });

      const eventData = {
        applicationNo: safeAppNo,
        laborCardNo: laborCardNo?.trim() || "",
        offerLetterStatus: offerLetterStatus || "Signed & Verified",
        approvalStatus: safeStatus,
        companyName: companyName || "",
        remarks: remarks || "",
      };

      if (existingEvent) {
        await prisma.workflowEvent.update({
          where: { id: existingEvent.id },
          data: {
            status: safeStatus,
            completedBy: session.user.name,
            completedAt: new Date(),
            data: eventData,
          },
        }).catch(() => {});
      } else {
        await prisma.workflowEvent.create({
          data: {
            fileId,
            stage: "Approval Application",
            status: safeStatus,
            completedBy: session.user.name,
            completedAt: new Date(),
            data: eventData,
          },
        }).catch(() => {});
      }

      // 2. Also register in VisaProcess
      const existingVisa = await prisma.visaProcess.findFirst({ where: { fileId } });
      if (existingVisa) {
        await prisma.visaProcess.update({
          where: { id: existingVisa.id },
          data: {
            visaNumber: safeAppNo,
            status: safeStatus,
          },
        }).catch(() => {});
      } else {
        await prisma.visaProcess.create({
          data: {
            fileId,
            visaNumber: safeAppNo,
            status: safeStatus,
          },
        }).catch(() => {});
      }

      // 3. Move file stage to next stage: "E-Visa Stamping"
      await prisma.processingFile.update({
        where: { id: fileId },
        data: {
          currentStage: "E-Visa Stamping",
          status: "ACTIVE",
          ...(companyName ? { company: companyName.trim() } : {}),
        },
      });

      return NextResponse.json({
        ok: true,
        message: "MOHRE Labor Approval saved and moved to E-Visa Stamping stage!",
      });
    }

    // 5. Update Visa / MOFA / E-Visa
    if (action === "update-visa" || action === "update-mofa" || action === "update-evisa") {
      const { visaNumber, mofaNumber, uidNumber, uidNo, visaStatus, status, issueDate, expiryDate, sponsorName } = z.object({
        visaNumber: z.string().nullish(),
        mofaNumber: z.string().nullish(),
        uidNumber: z.string().nullish(),
        uidNo: z.string().nullish(),
        visaStatus: z.string().nullish(),
        status: z.string().nullish(),
        issueDate: z.string().nullish(),
        expiryDate: z.string().nullish(),
        sponsorName: z.string().nullish(),
      }).parse(body);

      const parsedIssue = parseSafeDate(issueDate) || new Date();
      const parsedExpiry = parseSafeDate(expiryDate) || new Date(Date.now() + 90 * 24 * 60 * 60 * 1000);
      const safeVisaNo = visaNumber?.trim() || `VISA-${Date.now().toString().slice(-6)}`;
      const safeMofaNo = mofaNumber?.trim() || `MOFA-${Date.now().toString().slice(-6)}`;
      const resolvedStatus = status || visaStatus || "Stamped";

      const existingMofa = await prisma.mofaProcess.findFirst({ where: { fileId } });
      if (existingMofa) {
        await prisma.mofaProcess.update({
          where: { id: existingMofa.id },
          data: { mofaNumber: safeMofaNo, status: "Approved", doneDate: new Date(), submitDate: new Date() },
        }).catch(() => {});
      } else {
        await prisma.mofaProcess.create({
          data: { fileId, mofaNumber: safeMofaNo, status: "Approved", doneDate: new Date(), submitDate: new Date() },
        }).catch(() => {});
      }

      const existingVisa = await prisma.visaProcess.findFirst({ where: { fileId } });
      if (existingVisa) {
        await prisma.visaProcess.update({
          where: { id: existingVisa.id },
          data: {
            visaNumber: safeVisaNo,
            status: resolvedStatus,
            issueDate: parsedIssue,
            expiryDate: parsedExpiry,
          },
        }).catch(() => {});
      } else {
        await prisma.visaProcess.create({
          data: {
            fileId,
            visaNumber: safeVisaNo,
            status: resolvedStatus,
            issueDate: parsedIssue,
            expiryDate: parsedExpiry,
          },
        }).catch(() => {});
      }

      // Record WorkflowEvent
      await prisma.workflowEvent.create({
        data: {
          fileId,
          stage: "E-Visa Stamping",
          status: resolvedStatus,
          completedBy: session.user.name,
          completedAt: new Date(),
          data: {
            visaNumber: safeVisaNo,
            uidNumber: uidNumber || uidNo || "",
            sponsorName: sponsorName || "",
            issueDate: parsedIssue.toISOString(),
            expiryDate: parsedExpiry.toISOString(),
          },
        },
      }).catch(() => {});

      await prisma.processingFile.update({
        where: { id: fileId },
        data: { currentStage: "Manpower", status: "ACTIVE" },
      });

      return NextResponse.json({ ok: true, message: "Visa & Entry Permit updated and moved to Manpower Clearance stage!" });
    }

    // 6. Update BMET Manpower Clearance
    if (action === "update-manpower") {
      const { reference, status, company, profession, remarks, documentId } = z.object({
        reference: z.string().nullish(),
        status: z.string().nullish(),
        company: z.string().nullish(),
        profession: z.string().nullish(),
        remarks: z.string().nullish(),
        documentId: z.string().nullish(),
      }).parse(body);

      const resolvedStatus = status || "Approved";
      const existingMp = await prisma.manpowerProcess.findFirst({ where: { fileId } });
      if (existingMp) {
        await prisma.manpowerProcess.update({
          where: { id: existingMp.id },
          data: {
            reference: reference || existingMp.reference || `BMET-KSA-${file.fileNo.slice(-6)}`,
            status: resolvedStatus,
            company: company || file.company || "Saudi Binladen Group",
            profession: profession || file.profession || "Electrician / Plumber",
            approvedAt: new Date(),
          },
        }).catch(() => {});
      } else {
        await prisma.manpowerProcess.create({
          data: {
            fileId,
            reference: reference || `BMET-KSA-${file.fileNo.slice(-6)}`,
            company: company || file.company || "Saudi Binladen Group",
            profession: profession || file.profession || "Electrician / Plumber",
            status: resolvedStatus,
            submittedAt: new Date(),
            approvedAt: new Date(),
          },
        }).catch(() => {});
      }

      await prisma.processingFile.update({
        where: { id: fileId },
        data: { currentStage: "Flight", status: "ACTIVE" },
      });

      return NextResponse.json({ ok: true, message: "BMET Manpower clearance approved and moved to Flight stage!" });
    }

    // 7. Update Flight
    if (action === "update-flight" || action === "book-flight") {
      const { airline, flightNumber, departureDate, pnr } = z.object({
        airline: z.string().nullish(),
        flightNumber: z.string().nullish(),
        departureDate: z.string().nullish(),
        pnr: z.string().nullish(),
      }).parse(body);

      const parsedDep = parseSafeDate(departureDate) || new Date(Date.now() + 5 * 24 * 60 * 60 * 1000);

      const flight = await prisma.flight.create({
        data: {
          flightNo: flightNumber || "SV-803",
          airline: airline || "Saudia Airlines",
          departureAt: parsedDep,
          departureAirport: "DAC",
          destination: file.country || "Destination",
          status: "Scheduled",
          pnr: pnr || `PNR-${Date.now().toString().slice(-6)}`,
        },
      });

      await prisma.flightPassenger.create({
        data: {
          fileId,
          flightId: flight.id,
          ticketNo: `TKT-${Date.now().toString().slice(-8)}`,
        },
      });

      await prisma.processingFile.update({
        where: { id: fileId },
        data: { currentStage: "Flight", status: "COMPLETED" },
      });

      return NextResponse.json({ ok: true, message: "Flight scheduled and candidate dossier completed!" });
    }

    // 13. Create Candidate Note / Price Remark
    if (action === "create-note") {
      const { title, description, price, docName, docSize, fileData } = z.object({
        title: z.string().min(1, "Note title is required"),
        description: z.string().nullish(),
        price: z.union([z.string(), z.number()]).nullish(),
        docName: z.string().nullish(),
        docSize: z.string().nullish(),
        fileData: z.string().nullish(),
      }).parse(body);

      const parsedPrice = typeof price === "string" ? parseFloat(price.replace(/[^0-9.]/g, "")) : Number(price) || 0;

      const event = await prisma.workflowEvent.create({
        data: {
          fileId,
          stage: "CANDIDATE_NOTE",
          status: title.trim(),
          completedBy: session.user.name,
          data: {
            title: title.trim(),
            description: description?.trim() || "",
            price: parsedPrice,
            fileName: docName || null,
            fileSize: docSize || null,
            fileData: fileData || null,
            authorRole: (session.user as any).role || "Officer Desk",
            createdAt: new Date().toISOString(),
          },
        },
      });

      return NextResponse.json({ ok: true, message: `Note "${title}" saved successfully!`, data: event });
    }

    // 14. Delete Candidate Note
    if (action === "delete-note") {
      const { noteId } = z.object({ noteId: z.string() }).parse(body);
      await prisma.workflowEvent.delete({ where: { id: noteId } }).catch(() => {});
      return NextResponse.json({ ok: true, message: "Note removed successfully." });
    }

    // 15. Update Custom Pipeline Stage
    if (action === "update-custom-stage") {
      const { stageCode, stageName, verificationStatus, formData } = z.object({
        stageCode: z.string().min(1),
        stageName: z.string().nullish(),
        verificationStatus: z.string().nullish(),
        formData: z.record(z.string(), z.any()).nullish(),
      }).parse(body);

      const statusVal = verificationStatus?.trim() || "Completed / Verified";
      const customData = (formData || {}) as any;

      const existingEvent = await prisma.workflowEvent.findFirst({
        where: {
          fileId,
          stage: stageCode,
        },
        orderBy: { createdAt: "desc" },
      });

      if (existingEvent) {
        await prisma.workflowEvent.update({
          where: { id: existingEvent.id },
          data: {
            status: statusVal,
            completedBy: session.user.name,
            completedAt: new Date(),
            data: customData,
          },
        });
      } else {
        await prisma.workflowEvent.create({
          data: {
            fileId,
            stage: stageCode,
            status: statusVal,
            completedBy: session.user.name,
            completedAt: new Date(),
            data: customData,
          },
        });
      }

      return NextResponse.json({
        ok: true,
        message: `${stageName || "Custom stage"} details saved successfully!`,
      });
    }

    return NextResponse.json({ ok: false, error: "Unknown action" }, { status: 400 });
  } catch (error) {
    return errorResponse(error);
  }
}
