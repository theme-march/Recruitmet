import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withApiAccess } from "@/lib/api-access";
import { processPassportOCR } from "@/lib/ocr/engine";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const POST = withApiAccess("work-calls", POSTHandler);

const MAX_FILE_SIZE = 15 * 1024 * 1024; // 15MB
const ALLOWED_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

async function POSTHandler(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");
    const secondaryFile = formData.get("secondaryFile");

    if (!file || !(file instanceof File)) {
      return NextResponse.json({ success: false, error: "No primary passport file uploaded" }, { status: 400 });
    }

    if (!ALLOWED_MIME_TYPES.has(file.type)) {
      return NextResponse.json(
        { success: false, error: "Invalid file format. Please upload JPEG, PNG, or WebP images." },
        { status: 400 }
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { success: false, error: "File exceeds 15MB size limit." },
        { status: 400 }
      );
    }

    const primaryBuffer = Buffer.from(await file.arrayBuffer());

    let secondaryBuffer: Buffer | undefined;
    if (secondaryFile && secondaryFile instanceof File && ALLOWED_MIME_TYPES.has(secondaryFile.type) && secondaryFile.size <= MAX_FILE_SIZE) {
      secondaryBuffer = Buffer.from(await secondaryFile.arrayBuffer());
    }

    // Process OCR with dedicated MRZ crop and VIZ extraction
    const ocrResult = await processPassportOCR(primaryBuffer, secondaryBuffer);

    // Duplicate passport check against database
    let alreadyExists = false;
    let existingCandidateName = "";
    if (ocrResult.passportNo) {
      try {
        const existing = await prisma.candidate.findFirst({
          where: {
            OR: [
              { passportNo: { equals: ocrResult.passportNo } },
              { files: { some: { passport: { passportNumber: { equals: ocrResult.passportNo } } } } },
            ],
          },
          select: { fullName: true, candidateNo: true },
        });
        if (existing) {
          alreadyExists = true;
          existingCandidateName = existing.fullName;
        }
      } catch (dbErr) {
        // Log error code without PII
        console.error("Duplicate passport check query failed");
      }
    }

    ocrResult.alreadyExists = alreadyExists;
    ocrResult.existingCandidateName = existingCandidateName;

    return NextResponse.json({
      success: true,
      data: ocrResult,
    });
  } catch (error: any) {
    // Log safe error without PII
    console.error("Passport OCR processing error:", error?.message || "Unknown error");
    return NextResponse.json(
      { success: false, error: error?.message || "Failed to scan passport" },
      { status: 500 }
    );
  }
}
