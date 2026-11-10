import { prisma } from "@/lib/prisma";
import type { HandoverType, HandoverMode, HandoverStatus, HandoverItemStatus } from "@prisma/client";

export type CreateHandoverItemInput = {
  candidateId: string;
  passportNumber: string;
  candidateName?: string;
  fileId?: string;
  expectedReturn?: string | Date | null;
  takenReason?: string | null;
  returnDate?: string | Date | null;
};

export type CreateHandoverInput = {
  handoverType: HandoverType;
  handoverMode: HandoverMode;
  takerName: string;
  takerPhone: string;
  takerDesignation?: string | null;
  takerNid?: string | null;
  takenAt: string | Date;
  expectedReturn?: string | Date | null;
  takenReason?: string | null;
  returnDate?: string | Date | null;
  remarks?: string | null;
  items: CreateHandoverItemInput[];
};

export type ListHandoversParams = {
  search?: string;
  passportNo?: string;
  status?: string;
  page?: number;
  pageSize?: number;
};

/**
 * Generates sequential Handover Number like PH-008/26
 */
export async function generateHandoverNo(): Promise<string> {
  const currentYear = new Date().getFullYear();
  const yearSuffix = String(currentYear).slice(-2); // e.g. "26"

  const count = await prisma.passportHandover.count({
    where: {
      handoverNo: {
        endsWith: `/${yearSuffix}`,
      },
    },
  });

  const nextSeq = count + 1;
  const seqStr = String(nextSeq).padStart(3, "0"); // e.g. "001", "008"
  return `PH-${seqStr}/${yearSuffix}`;
}

/**
 * Searches candidates by passport or name, reporting availability
 */
export async function searchAvailablePassports(q: string) {
  const trimmed = q.trim();
  if (!trimmed || trimmed.length < 2) return [];

  const candidates = await prisma.candidate.findMany({
    where: {
      OR: [
        { passportNo: { contains: trimmed } },
        { fullName: { contains: trimmed } },
        { candidateNo: { contains: trimmed } },
        { phone: { contains: trimmed } },
      ],
    },
    take: 12,
    select: {
      id: true,
      candidateNo: true,
      fullName: true,
      phone: true,
      passportNo: true,
      preferredCountry: true,
      files: {
        take: 1,
        select: { id: true, fileNo: true, country: true },
      },
      passportHandovers: {
        where: { status: "PENDING" },
        take: 1,
        include: {
          handover: {
            select: { handoverNo: true, takerName: true, takerPhone: true, takenAt: true },
          },
        },
      },
    },
  });

  return candidates.map((cand) => {
    const activeHandover = cand.passportHandovers[0];
    return {
      candidateId: cand.id,
      candidateNo: cand.candidateNo,
      fullName: cand.fullName,
      phone: cand.phone,
      passportNumber: cand.passportNo || "N/A",
      country: cand.preferredCountry || cand.files[0]?.country || "General",
      fileId: cand.files[0]?.id || null,
      fileNo: cand.files[0]?.fileNo || null,
      isHandedOut: Boolean(activeHandover),
      activeHandover: activeHandover
        ? {
            handoverNo: activeHandover.handover.handoverNo,
            takerName: activeHandover.handover.takerName,
            takerPhone: activeHandover.handover.takerPhone,
            takenAt: activeHandover.handover.takenAt,
          }
        : null,
    };
  });
}

/**
 * List all passport handovers with filters & pagination
 */
export async function listPassportHandovers(params: ListHandoversParams = {}) {
  const page = Math.max(1, Number(params.page) || 1);
  const pageSize = Math.max(1, Math.min(100, Number(params.pageSize) || 10));
  const skip = (page - 1) * pageSize;

  const whereClause: any = {};

  // Status Filter
  if (params.status && params.status !== "ALL" && params.status !== "All Status") {
    whereClause.status = params.status;
  }

  // Taker or Handover No Search
  if (params.search && params.search.trim()) {
    const term = params.search.trim();
    whereClause.OR = [
      { handoverNo: { contains: term } },
      { takerName: { contains: term } },
      { takerPhone: { contains: term } },
      { takerDesignation: { contains: term } },
    ];
  }

  // Passport Number Search
  if (params.passportNo && params.passportNo.trim()) {
    const pTerm = params.passportNo.trim();
    whereClause.items = {
      some: {
        OR: [
          { passportNumber: { contains: pTerm } },
          { candidateName: { contains: pTerm } },
        ],
      },
    };
  }

  const [total, records, allCounts] = await Promise.all([
    prisma.passportHandover.count({ where: whereClause }),
    prisma.passportHandover.findMany({
      where: whereClause,
      skip,
      take: pageSize,
      orderBy: { createdAt: "desc" },
      include: {
        items: {
          include: {
            candidate: {
              select: { id: true, candidateNo: true, fullName: true, phone: true, passportNo: true },
            },
          },
        },
      },
    }),
    prisma.passportHandover.groupBy({
      by: ["status"],
      _count: { id: true },
    }),
  ]);

  const metrics = {
    total: 0,
    handedOver: 0,
    partiallyCollected: 0,
    collected: 0,
    permanent: 0,
  };

  for (const group of allCounts) {
    metrics.total += group._count.id;
    if (group.status === "HANDED_OVER") metrics.handedOver = group._count.id;
    if (group.status === "PARTIALLY_COLLECTED") metrics.partiallyCollected = group._count.id;
    if (group.status === "COLLECTED") metrics.collected = group._count.id;
    if (group.status === "PERMANENT") metrics.permanent = group._count.id;
  }

  // Format list items with counts as shown in screenshot
  const data = records.map((record) => {
    const collectedCount = record.items.filter((i) => i.status === "COLLECTED").length;
    const rejectedCount = record.items.filter((i) => i.status === "REJECTED_OR_LOST").length;
    const pendingCount = record.items.filter((i) => i.status === "PENDING").length;
    const permanentCount = record.items.filter((i) => i.status === "PERMANENT").length;

    // Type display label
    let typeLabel = "Single";
    if (record.handoverType === "GROUP") {
      typeLabel = record.handoverMode === "PERMANENT" ? "Permanent Group" : "Group";
    } else {
      typeLabel = record.handoverMode === "PERMANENT" ? "Permanent Single" : "Single";
    }

    // Passports summary text: e.g. "0 collected · 0 rejected · 3 pending" or "1 permanent"
    let passportsSummary = "";
    if (record.handoverMode === "PERMANENT") {
      passportsSummary = `${permanentCount} permanent`;
    } else {
      passportsSummary = `${collectedCount} collected · ${rejectedCount} rejected · ${pendingCount} pending`;
    }

    return {
      id: record.id,
      handoverNo: record.handoverNo,
      handoverType: record.handoverType,
      handoverMode: record.handoverMode,
      typeLabel,
      takerName: record.takerName,
      takerPhone: record.takerPhone,
      takerDesignation: record.takerDesignation,
      takenAt: record.takenAt,
      expectedReturn: record.expectedReturn,
      takenReason: record.takenReason,
      returnDate: record.returnDate,
      status: record.status,
      passportsSummary,
      counts: {
        total: record.items.length,
        collected: collectedCount,
        rejected: rejectedCount,
        pending: pendingCount,
        permanent: permanentCount,
      },
      items: record.items.map((it) => ({
        id: it.id,
        candidateId: it.candidateId,
        candidateNo: it.candidate?.candidateNo || "",
        candidateName: it.candidateName || it.candidate?.fullName || "Unknown",
        passportNumber: it.passportNumber,
        expectedReturn: it.expectedReturn || record.expectedReturn,
        takenReason: it.takenReason || record.takenReason,
        returnDate: it.returnDate || record.returnDate,
        status: it.status,
        returnedAt: it.returnedAt,
        returnRemarks: it.returnRemarks,
      })),
      createdAt: record.createdAt,
    };
  });

  return {
    data,
    meta: {
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize) || 1,
    },
    metrics,
  };
}

/**
 * Create a new Passport Handover
 */
export async function createPassportHandover(input: CreateHandoverInput, createdById?: string) {
  if (!input.takerName || !input.takerPhone) {
    throw new Error("Taker Name and Taker Phone are required.");
  }
  if (!input.items || input.items.length === 0) {
    throw new Error("At least one candidate passport must be selected.");
  }

  // Safety Check: Check for active PENDING handovers
  const passportNumbers = input.items.map((i) => i.passportNumber.trim()).filter(Boolean);
  const alreadyOut = await prisma.passportHandoverItem.findFirst({
    where: {
      passportNumber: { in: passportNumbers },
      status: "PENDING",
    },
    include: {
      handover: {
        select: { handoverNo: true, takerName: true },
      },
    },
  });

  if (alreadyOut) {
    throw new Error(
      `Passport "${alreadyOut.passportNumber}" is already handed out under ${alreadyOut.handover.handoverNo} to "${alreadyOut.handover.takerName}". Please collect it before handing over again.`
    );
  }

  const handoverNo = await generateHandoverNo();

  // Overall status
  const initialStatus: HandoverStatus =
    input.handoverMode === "PERMANENT" ? "PERMANENT" : "HANDED_OVER";

  const initialItemStatus: HandoverItemStatus =
    input.handoverMode === "PERMANENT" ? "PERMANENT" : "PENDING";

  const handover = await prisma.passportHandover.create({
    data: {
      handoverNo,
      handoverType: input.handoverType,
      handoverMode: input.handoverMode,
      takerName: input.takerName.trim(),
      takerPhone: input.takerPhone.trim(),
      takerDesignation: input.takerDesignation?.trim() || null,
      takerNid: input.takerNid?.trim() || null,
      takenAt: input.takenAt ? new Date(input.takenAt) : new Date(),
      expectedReturn: input.expectedReturn ? new Date(input.expectedReturn) : null,
      takenReason: input.takenReason?.trim() || null,
      returnDate: input.returnDate ? new Date(input.returnDate) : null,
      status: initialStatus,
      remarks: input.remarks?.trim() || null,
      createdById: createdById || null,
      items: {
        create: input.items.map((item) => ({
          candidateId: item.candidateId,
          fileId: item.fileId || null,
          passportNumber: item.passportNumber.trim(),
          candidateName: item.candidateName?.trim() || null,
          expectedReturn: item.expectedReturn ? new Date(item.expectedReturn) : null,
          takenReason: item.takenReason?.trim() || null,
          returnDate: item.returnDate ? new Date(item.returnDate) : null,
          status: initialItemStatus,
        })),
      },
    },
    include: {
      items: true,
    },
  });

  return handover;
}

/**
 * Collect / Return items from a handover
 */
export async function collectPassportItems(
  handoverId: string,
  collections: {
    itemId: string;
    status?: HandoverItemStatus;
    returnRemarks?: string;
    returnedAt?: string | Date;
  }[],
  returnedById?: string
) {
  const handover = await prisma.passportHandover.findUnique({
    where: { id: handoverId },
    include: { items: true },
  });

  if (!handover) {
    throw new Error("Handover record not found.");
  }

  const now = new Date();

  // Update specified items
  for (const c of collections) {
    await prisma.passportHandoverItem.update({
      where: { id: c.itemId },
      data: {
        status: c.status || "COLLECTED",
        returnedAt: c.returnedAt ? new Date(c.returnedAt) : now,
        returnRemarks: c.returnRemarks || null,
        returnedById: returnedById || null,
      },
    });
  }

  // Refresh items to calculate new overall handover status
  const updatedItems = await prisma.passportHandoverItem.findMany({
    where: { handoverId },
  });

  const total = updatedItems.length;
  const collected = updatedItems.filter((i) => i.status === "COLLECTED").length;
  const pending = updatedItems.filter((i) => i.status === "PENDING").length;

  let newOverallStatus: HandoverStatus = handover.status;
  if (handover.handoverMode === "PERMANENT") {
    newOverallStatus = "PERMANENT";
  } else if (pending === 0 && collected > 0) {
    newOverallStatus = "COLLECTED";
  } else if (collected > 0 && pending > 0) {
    newOverallStatus = "PARTIALLY_COLLECTED";
  } else if (pending === total) {
    newOverallStatus = "HANDED_OVER";
  }

  const updatedHandover = await prisma.passportHandover.update({
    where: { id: handoverId },
    data: {
      status: newOverallStatus,
      returnDate: pending === 0 ? now : handover.returnDate,
    },
    include: { items: true },
  });

  return updatedHandover;
}

/**
 * Delete a handover
 */
export async function deletePassportHandover(handoverId: string) {
  return await prisma.passportHandover.delete({
    where: { id: handoverId },
  });
}
