import "server-only";
import { parse } from "csv-parse/sync";
import * as XLSX from "xlsx";
import { candidateCreateSchema } from "@/features/candidates/schemas";
import { prisma } from "@/lib/prisma";
import { privateStorage } from "@/server/storage";
import { AppError } from "@/lib/errors";
import { can } from "@/lib/authorization";
import type { AwaitedSession } from "@/lib/types";
import {
  normalizeHeader,
  parseDateCell,
  normalizeCountry,
  normalizeGender,
} from "@/lib/candidate-import-format";

export async function previewCandidateCsv(file: File, session: NonNullable<AwaitedSession>) {
  if (
    !(await can(session, "call-center", "import")) &&
    !(await can(session, "call-center", "create")) &&
    !(await can(session, "call-center", "Import"))
  ) {
    throw new AppError("FORBIDDEN", "Import or Create candidate permission is required.", 403);
  }
  if (file.size > 10 * 1024 * 1024) {
    throw new AppError("FILE_SIZE_INVALID", "File must not exceed 10 MB.", 422);
  }

  const isExcel = /\.(xlsx|xls)$/i.test(file.name) || file.type.includes("spreadsheetml") || file.type.includes("excel");
  let rawRecords: Record<string, unknown>[] = [];
  let fileBuffer: Buffer;

  if (isExcel) {
    const arrayBuffer = await file.arrayBuffer();
    fileBuffer = Buffer.from(arrayBuffer);
    try {
      const wb = XLSX.read(fileBuffer, { type: "buffer", cellDates: true });
      const firstSheetName = wb.SheetNames[0];
      if (!firstSheetName) throw new Error("No sheet found");
      const ws = wb.Sheets[firstSheetName];
      rawRecords = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: "" });
    } catch {
      throw new AppError("EXCEL_INVALID", "Could not parse Excel spreadsheet. Please ensure it is a valid .xlsx or .csv file.", 422);
    }
  } else {
    const text = await file.text();
    fileBuffer = Buffer.from(text, "utf-8");
    try {
      rawRecords = parse(text, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
        bom: true,
      });
    } catch {
      try {
        const wb = XLSX.read(fileBuffer, { type: "buffer" });
        const ws = wb.Sheets[wb.SheetNames[0]];
        rawRecords = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: "" });
      } catch {
        throw new AppError("CSV_INVALID", "File could not be parsed. Please check the CSV or Excel format.", 422);
      }
    }
  }

  if (!rawRecords.length) {
    throw new AppError("FILE_EMPTY", "Uploaded file contains no candidate data rows.", 422);
  }

  // Normalize record keys
  const records: Record<string, string>[] = rawRecords.map((raw) => {
    const record: Record<string, string> = {};
    for (const [key, value] of Object.entries(raw)) {
      const normKey = normalizeHeader(key);
      let valStr = "";
      if (value instanceof Date) {
        valStr = value.toISOString().split("T")[0];
      } else if (value !== null && value !== undefined) {
        valStr = String(value).trim();
      }
      record[normKey] = valStr;
    }
    return record;
  });

  // Verify at least fullName (or givenName) and phone exist in the headers
  const sample = records[0];
  const hasName = "fullName" in sample || "givenName" in sample || "name" in sample;
  const hasPhone = "phone" in sample || "mobile" in sample;
  if (!hasName || !hasPhone) {
    throw new AppError(
      "CSV_HEADERS_INVALID",
      "Uploaded file must contain 'Full Name' and 'Phone' columns. Please download the sample template.",
      422
    );
  }

  // Save uploaded file into storage
  let storedKey = `imports/candidates/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, "_")}`;
  try {
    const stored = await privateStorage().put({
      bytes: fileBuffer,
      originalName: file.name,
      mimeType: isExcel ? "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" : "text/csv",
    });
    storedKey = stored.objectKey;
  } catch {}

  // Gather existing identifiers to detect duplicates
  const phones = records
    .map((x) => {
      let p = (x.phone || "").replace(/[^0-9+]/g, "");
      if (/^1[3-9]\d{8}$/.test(p)) p = "0" + p;
      return p;
    })
    .filter(Boolean);
  const passports = records.map((x) => x.passportNo?.replace(/\s+/g, "").toUpperCase()).filter(Boolean);
  const nationalIds = records.map((x) => x.nationalId?.trim()).filter(Boolean);

  const existing = await prisma.candidate.findMany({
    where: {
      OR: [
        phones.length ? { phone: { in: phones } } : {},
        passports.length ? { passportNo: { in: passports } } : {},
        nationalIds.length ? { nationalId: { in: nationalIds } } : {},
      ].filter((clause) => Object.keys(clause).length > 0),
    },
    select: { fullName: true, phone: true, passportNo: true, nationalId: true },
  });

  const seenInFile = new Set<string>();

  const rows = records.map((row, index) => {
    let cleanPhone = (row.phone || "").replace(/[^0-9+]/g, "");
    if (/^1[3-9]\d{8}$/.test(cleanPhone)) {
      cleanPhone = "0" + cleanPhone;
    }
    const cleanPassport = (row.passportNo || "").replace(/\s+/g, "").toUpperCase();
    const cleanNid = (row.nationalId || "").trim();

    let fullName = (row.fullName || "").trim();
    if (!fullName && (row.givenName || row.surname)) {
      fullName = `${row.givenName || ""} ${row.surname || ""}`.trim();
    }

    const dobStr = parseDateCell(row.dob);
    const issueDateStr = parseDateCell(row.issueDate);
    const expiryDateStr = parseDateCell(row.expiryDate);

    const normalized = {
      fullName,
      phone: cleanPhone,
      passportNo: cleanPassport || undefined,
      nationalId: cleanNid || undefined,
      profession: (row.profession || "").trim() || "General Worker",
      preferredCountry: normalizeCountry(row.preferredCountry || "Saudi Arabia"),
      source: (row.source || "").trim() || "Direct Office",
      district: (row.district || "").trim() || undefined,
      address: (row.address || row.permanentAddress || "").trim() || undefined,
      gender: normalizeGender(row.gender || "") || undefined,
      dob: dobStr ? new Date(dobStr) : undefined,
      issueDate: issueDateStr || undefined,
      expiryDate: expiryDateStr || undefined,
      fatherName: (row.fatherName || "").trim() || undefined,
      motherName: (row.motherName || "").trim() || undefined,
      placeOfBirth: (row.placeOfBirth || "").trim() || undefined,
      maritalStatus: (row.maritalStatus || "").trim() || undefined,
      education: (row.education || "").trim() || undefined,
      experience: (row.experience || "").trim() || undefined,
      email: (row.email || "").trim() || undefined,
      notes: (row.notes || "").trim() || undefined,
      alternatePhones: [],
    };

    const result = candidateCreateSchema.safeParse(normalized);

    // Duplicate check
    const dupErrors: string[] = [];
    const keysToCheck = [cleanPhone, cleanPassport, cleanNid].filter(Boolean);

    for (const key of keysToCheck) {
      if (seenInFile.has(key)) {
        dupErrors.push(`Duplicate in file (${key})`);
      }
      seenInFile.add(key);

      const dbMatch = existing.find(
        (x) => x.phone === key || x.passportNo === key || x.nationalId === key
      );
      if (dbMatch) {
        dupErrors.push(`Already registered in system (${key}: ${dbMatch.fullName})`);
      }
    }

    const isDuplicate = dupErrors.length > 0;
    const isValid = result.success && !isDuplicate;

    const validationErrors = result.success
      ? []
      : result.error.issues.map((x) => `${x.path.join(".")}: ${x.message}`);

    const allErrors = [...dupErrors, ...validationErrors];

    return {
      rowNumber: index + 2,
      data: normalized,
      valid: isValid,
      duplicate: isDuplicate,
      errors: allErrors,
    };
  });

  return prisma.$transaction(async (tx) => {
    const job = await tx.importJob.create({
      data: {
        module: "candidates",
        templateVersion: "1.0",
        objectKey: storedKey,
        duplicateRule: "SKIP",
        status: "READY",
        totalRows: rows.length,
        validRows: rows.filter((x) => x.valid).length,
        invalidRows: rows.filter((x) => !x.valid && !x.duplicate).length,
        duplicateRows: rows.filter((x) => x.duplicate).length,
        createdBy: session.userId,
        rows: {
          create: rows.map((x) => ({
            rowNumber: x.rowNumber,
            data: x.data,
            valid: x.valid,
            duplicate: x.duplicate,
            errors: x.errors,
          })),
        },
      },
    });

    await tx.auditLog.create({
      data: {
        userId: session.userId,
        role: session.user.role.name,
        module: "Candidate Bulk Import",
        recordId: job.id,
        action: "PREVIEW",
        newValue: {
          total: job.totalRows,
          valid: job.validRows,
          invalid: job.invalidRows,
          duplicates: job.duplicateRows,
        },
        correlationId: crypto.randomUUID(),
      },
    });

    return { job, rows: rows.slice(0, 100) };
  });
}

export async function commitCandidateImport(jobId: string, session: NonNullable<AwaitedSession>) {
  if (
    !(await can(session, "call-center", "import")) &&
    !(await can(session, "call-center", "create")) &&
    !(await can(session, "call-center", "Import"))
  ) {
    throw new AppError("FORBIDDEN", "Import or Create candidate permission is required.", 403);
  }

  const job = await prisma.importJob.findUnique({
    where: { id: jobId },
    include: {
      rows: {
        where: { valid: true, duplicate: false },
        orderBy: { rowNumber: "asc" },
      },
    },
  });

  if (!job || job.module !== "candidates") {
    throw new AppError("NOT_FOUND", "Import job not found.", 404);
  }
  if (job.status !== "READY") {
    throw new AppError("IMPORT_STATE_INVALID", "This import job has already been processed or is not ready.", 409);
  }

  await prisma.importJob.update({
    where: { id: job.id },
    data: { status: "PROCESSING" },
  });

  let inserted = 0;
  try {
    for (let offset = 0; offset < job.rows.length; offset += 50) {
      const batch = job.rows.slice(offset, offset + 50);
      await prisma.$transaction(async (tx) => {
        for (const row of batch) {
          const data = row.data as Record<string, any>;
          const suffix = `${Date.now().toString().slice(-5)}${row.rowNumber.toString().padStart(3, "0")}`;

          // Create Candidate
          const candidate = await tx.candidate.create({
            data: {
              candidateNo: `CAN-${suffix}`,
              registrationNo: `REG-${suffix}`,
              fullName: data.fullName,
              phone: data.phone,
              passportNo: data.passportNo || null,
              nationalId: data.nationalId || null,
              profession: data.profession || "General Worker",
              preferredCountry: data.preferredCountry || "Saudi Arabia",
              district: data.district || null,
              address: data.address || null,
              dob: data.dob ? new Date(data.dob) : null,
              gender: data.gender || null,
              maritalStatus: data.maritalStatus || null,
              education: data.education || null,
              experience: data.experience || null,
              email: data.email || null,
              source: data.source || "Direct Office",
              officeId: session.user.officeId || null,
              status: "ACTIVE",
              phones: { create: { phone: data.phone, isPrimary: true } },
            },
          });

          // Create Processing File
          const countryNorm = String(data.preferredCountry || "Saudi Arabia").trim();
          const fileCountry = countryNorm.toLowerCase().includes("saudi")
            ? "Saudi Arabia"
            : countryNorm.toLowerCase().includes("dubai") || countryNorm.toLowerCase().includes("uae")
            ? "Dubai"
            : countryNorm;

          const fileNo = `FILE-${fileCountry.slice(0, 3).toUpperCase()}-${Math.floor(100000 + Math.random() * 900000)}`;

          const companyDefault = fileCountry === "Saudi Arabia"
            ? "Saudi Binladen Group"
            : fileCountry === "Dubai"
            ? "Dubai Workforce Co."
            : `${fileCountry} Overseas Partner Co.`;

          const processingFile = await tx.processingFile.create({
            data: {
              fileNo,
              candidateId: candidate.id,
              country: fileCountry,
              currentStage: "Passport Entry",
              status: "ACTIVE",
              profession: data.profession || "General Worker",
              company: companyDefault,
              agent: data.source || "Direct Office",
              assignedToId: session.userId,
              officeId: session.user.officeId || null,
            },
          });

          // If passport exists, create initial PassportProcess with real dates and place of birth
          if (data.passportNo) {
            const ppIssue = data.issueDate ? new Date(data.issueDate) : new Date("2023-01-01");
            const ppExpiry = data.expiryDate ? new Date(data.expiryDate) : new Date("2033-01-01");
            await tx.passportProcess.create({
              data: {
                fileId: processingFile.id,
                passportNumber: data.passportNo,
                passportType: "Ordinary",
                issueDate: !isNaN(ppIssue.getTime()) ? ppIssue : new Date("2023-01-01"),
                expiryDate: !isNaN(ppExpiry.getTime()) ? ppExpiry : new Date("2033-01-01"),
                issuePlace: data.placeOfBirth || data.district || null,
                nationality: "BANGLADESHI",
                verificationStatus: "Verified",
                remarks: data.notes || `Bulk imported on ${new Date().toLocaleDateString()}`,
              },
            }).catch(() => {});
          }

          // Create WorkCall (Lead) so candidate appears across Call Center and Registration & Interviews
          const leadNo = `LEAD-${Date.now().toString().slice(-4)}${Math.floor(100 + Math.random() * 900)}`;
          await tx.workCall.create({
            data: {
              leadNo,
              candidateId: candidate.id,
              fullName: candidate.fullName,
              phone: candidate.phone,
              country: fileCountry,
              callSource: data.source && data.source !== "Direct Office" ? "Agent Partner" : "Direct",
              agent: data.source || "Direct Office",
              priority: 3,
              callStatus: "New",
              fileStatus: "Processing File Created",
              workCategory: data.profession || "General Worker",
              district: data.district || null,
              notes: data.notes || "Bulk imported candidate",
              assignedToId: session.userId,
              officeId: session.user.officeId || null,
            },
          }).catch(() => {});

          await tx.importRow.update({
            where: { id: row.id },
            data: { importedId: candidate.id },
          });

          inserted++;
        }
      });
    }

    await prisma.importJob.update({
      where: { id: job.id },
      data: {
        status: "COMPLETED",
        insertedRows: inserted,
        completedAt: new Date(),
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: session.userId,
        role: session.user.role.name,
        module: "Candidate Bulk Import",
        recordId: job.id,
        action: "IMPORT",
        newValue: { inserted },
        correlationId: crypto.randomUUID(),
      },
    });

    return { inserted };
  } catch (error) {
    await prisma.importJob.update({
      where: { id: job.id },
      data: {
        status: "FAILED",
        insertedRows: inserted,
        completedAt: new Date(),
      },
    });
    throw error;
  }
}
