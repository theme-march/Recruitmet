import { can } from "@/lib/authorization";
import { AppError, errorResponse } from "@/lib/errors";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { toAppRole } from "@/lib/roles";
import { privateStorage } from "@/server/storage";

const text = (form: FormData, key: string) => String(form.get(key) ?? "").trim();
const numeric = (form: FormData, key: string, fallback = 0) => {
  const value = Number(text(form, key) || fallback);
  if (!Number.isFinite(value) || value < 0)
    throw new AppError("NUMBER_INVALID", `${key} must be a valid positive number.`, 422);
  return value;
};

const imageTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
async function storeImage(form: FormData, key: string, userId: string) {
  const file = form.get(key);
  if (!(file instanceof File) || !file.size) return null;
  if (!imageTypes.has(file.type))
    throw new AppError("FILE_TYPE_INVALID", "Only JPEG, PNG and WebP images are allowed.", 422);
  if (file.size > 5 * 1024 * 1024)
    throw new AppError("FILE_SIZE_INVALID", "Each image must be 5 MB or smaller.", 422);
  const stored = await privateStorage().put({
    bytes: new Uint8Array(await file.arrayBuffer()),
    originalName: file.name,
    mimeType: file.type,
  });
  try {
    return await prisma.storedObject.create({
      data: {
        ...stored,
        originalName: file.name,
        mimeType: file.type,
        scanStatus: "Pending",
        createdBy: userId,
      },
    });
  } catch (error) {
    await privateStorage().remove(stored.objectKey).catch(() => {});
    throw error;
  }
}

export async function GET(request: Request) {
  try {
    const session = await getSession();
    if (!session) throw new AppError("UNAUTHORIZED", "Sign in is required.", 401);
    if (!(await can(session, "partners", "View")))
      throw new AppError("FORBIDDEN", "Works and demands view permission is required.", 403);

    const url = new URL(request.url),
      q = url.searchParams.get("q")?.trim() ?? "",
      page = Math.max(1, Number(url.searchParams.get("page") || 1)),
      pageSize = Math.min(50, Math.max(10, Number(url.searchParams.get("pageSize") || 10)));

    const officeId =
      session.user.role.name === "System Administrator" ? undefined : session.user.officeId ?? undefined;

    const where = {
      ...(officeId ? { company: { officeId } } : {}),
      ...(q
        ? {
            OR: [
              { demandNo: { contains: q } },
              { title: { contains: q } },
              { profession: { contains: q } },
              { country: { contains: q } },
              { company: { name: { contains: q } } },
            ],
          }
        : {}),
    };

    const [rows, total, offices, companies, demandCountries] = await Promise.all([
      prisma.demand.findMany({
        where,
        include: {
          company: { include: { office: true } },
          _count: { select: { processingFiles: true } },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.demand.count({ where }),
      prisma.office.findMany({
        select: { id: true, code: true, name: true, country: true },
        orderBy: { name: "asc" },
      }),
      prisma.company.findMany({
        select: { id: true, code: true, name: true, country: true, officeId: true },
        orderBy: { name: "asc" },
      }),
      prisma.demand.findMany({
        select: { country: true },
        distinct: ["country"],
      }),
    ]);

    const allDistinctCountries = Array.from(
      new Set([
        "Saudi Arabia",
        "Dubai",
        "Other Country",
        "Qatar",
        "Kuwait",
        "Oman",
        "Malaysia",
        "Romania",
        "Italy",
        ...offices.map((o) => o.country),
        ...companies.map((c) => c.country),
        ...demandCountries.map((d) => d.country),
      ].filter(Boolean) as string[])
    ).sort();

    const mappedRows = rows.map((row) => {
      const requirements = (row.requirements ?? {}) as Record<string, unknown>;
      const reqSaleQty = Number(requirements.saleVisaQuantity ?? 0);
      const linkedFilesCount = row._count?.processingFiles ?? 0;
      const realSaleQty = Math.max(reqSaleQty, linkedFilesCount, row.assignedQuantity ?? 0);
      const totalVisaQty = row.visaQuantity ?? row.quantity ?? 1;
      const isExpired = row.deadline && new Date(row.deadline) < new Date();

      // Dynamic Real-time Status Calculation
      let dynamicStatus = "Approved";
      if (isExpired) {
        dynamicStatus = "Expired";
      } else if (realSaleQty >= totalVisaQty && totalVisaQty > 0) {
        dynamicStatus = "Completed";
      } else if (realSaleQty > 0) {
        dynamicStatus = "Active";
      } else {
        dynamicStatus = "Approved";
      }

      return {
        ...row,
        salary: Number(row.salary ?? 0),
        visaRate: Number(row.visaRate ?? 0),
        commissionPerFile: Number(row.commissionPerFile ?? 0),
        visaQuantity: totalVisaQty,
        saleVisaQuantity: realSaleQty,
        remainingQuantity: Math.max(0, totalVisaQty - realSaleQty),
        status: dynamicStatus,
        requirements: {
          ...requirements,
          saleVisaQuantity: realSaleQty,
        },
      };
    });

    return Response.json({
      data: mappedRows,
      filters: { offices, companies, countries: allDistinctCountries },
      meta: {
        page,
        pageSize,
        total,
        totalPages: Math.max(1, Math.ceil(total / pageSize)),
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
    if (!(await can(session, "office-vendor", "Add"))) {
      throw new AppError("FORBIDDEN", "Permission required to create Works & Demands. Please contact a Super Administrator.", 403);
    }

    const form = await request.formData();
    let companyId = text(form, "companyId");
    let officeId = text(form, "officeId");
    let country = text(form, "country");
    const customOfficeName = text(form, "customOfficeName");
    const customCountry = text(form, "customCountry");
    const customCompanyName = text(form, "customCompanyName");
    const profession = text(form, "profession");

    // Dynamic Country
    if (country === "new" && customCountry) {
      country = customCountry;
    } else if (!country && customCountry) {
      country = customCountry;
    }
    if (!country) country = "Saudi Arabia";

    // Dynamic Office
    if ((officeId === "new" || !officeId) && customOfficeName) {
      const code = `OFF-${Date.now().toString().slice(-4)}`;
      const newOffice = await prisma.office.create({
        data: {
          code,
          name: customOfficeName,
          country: country || "Bangladesh",
        },
      });
      officeId = newOffice.id;
    } else if (!officeId || officeId === "new") {
      const defaultOff = await prisma.office.findFirst({ where: { code: "DHK-HO" } }) || await prisma.office.findFirst();
      if (defaultOff) officeId = defaultOff.id;
    }

    // Dynamic Company
    let company: any = null;
    if ((companyId === "new" || !companyId) && customCompanyName) {
      const code = `CMP-${Date.now().toString().slice(-4)}`;
      company = await prisma.company.create({
        data: {
          code,
          name: customCompanyName,
          country: country || "Saudi Arabia",
          officeId: officeId || null,
        },
      });
      companyId = company.id;
    } else if (companyId && companyId !== "new") {
      company = await prisma.company.findFirst({ where: { id: companyId } });
    }

    if (!company) {
      const code = `CMP-${Date.now().toString().slice(-4)}`;
      company = await prisma.company.create({
        data: {
          code,
          name: customCompanyName || "Foreign Partner Co.",
          country: country || "Saudi Arabia",
          officeId: officeId || null,
        },
      });
      companyId = company.id;
    }

    const visaQuantity = Math.trunc(numeric(form, "visaQuantity", 1));
    const saleVisaQuantity = Math.trunc(numeric(form, "saleVisaQuantity", 0));

    if (visaQuantity < 1) throw new AppError("QUANTITY_INVALID", "Visa quantity must be at least 1.", 422);
    if (saleVisaQuantity > visaQuantity)
      throw new AppError("QUANTITY_INVALID", "Sale visa quantity cannot exceed visa quantity.", 422);

    const fileOne = await storeImage(form, "fileOne", session.userId);
    const fileTwo = await storeImage(form, "fileTwo", session.userId);

    const initialStatus = saleVisaQuantity > 0 ? "Active" : "Approved";

    const data = {
      title: text(form, "title") || `${company.name} ${profession || "Work Demand"}`,
      country,
      profession: profession || "General",
      quantity: visaQuantity || 1,
      salary: numeric(form, "salary") || undefined,
      currency: text(form, "currency") || "BDT",
      visaQuantity,
      assignedQuantity: saleVisaQuantity,
      visaRate: numeric(form, "visaRate") || undefined,
      commissionPerFile: numeric(form, "commissionPerFile") || undefined,
      deadline: text(form, "deadline") ? new Date(text(form, "deadline")) : undefined,
      requirements: {
        officeId,
        workHour: text(form, "workHour"),
        workLocation: text(form, "workLocation"),
        saleVisaQuantity,
        note: text(form, "note"),
        fileOneId: fileOne?.id ?? null,
        fileTwoId: fileTwo?.id ?? null,
      },
    };

    const demand = await prisma.$transaction(async (tx) => {
      const created = await tx.demand.create({
        data: {
          ...data,
          companyId: company.id,
          demandNo: `DEM-${new Date().getFullYear()}-${Date.now().toString().slice(-6)}`,
          status: initialStatus,
        },
      });

      await tx.auditLog.create({
        data: {
          userId: session.userId,
          role: session.user.role.name,
          module: "Works & Demands",
          recordId: created.id,
          action: "CREATE",
          newValue: { demandNo: created.demandNo, quantity: created.quantity },
          correlationId: crypto.randomUUID(),
        },
      });

      return created;
    });

    return Response.json({ data: demand }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
