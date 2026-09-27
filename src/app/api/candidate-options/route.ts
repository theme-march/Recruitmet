import { withApiAccess } from "@/lib/api-access";
import { AppError, errorResponse } from "@/lib/errors";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

const directStatusType = "DIRECT_FILE_STATUS";

function companyCountryFilter(country: string) {
  if (/saudi|ksa/i.test(country)) {
    return { OR: [{ country: { contains: "Saudi" } }, { country: { contains: "KSA" } }] };
  }
  if (/dubai|uae|emirates/i.test(country)) {
    return {
      OR: [
        { country: { contains: "Dubai" } },
        { country: { contains: "UAE" } },
        { country: { contains: "Emirates" } },
      ],
    };
  }
  return { country: { contains: country } };
}

async function GETHandler(request: Request) {
  try {
    const session = await getSession();
    if (!session) throw new AppError("UNAUTHORIZED", "Sign in is required.", 401);
    const country = new URL(request.url).searchParams.get("country")?.trim() ?? "";
    const [categories, companies, fileStatuses] = await Promise.all([
      prisma.professionCategory.findMany({
        where: { active: true },
        orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
        select: {
          id: true,
          code: true,
          name: true,
          professions: {
            where: { active: true },
            orderBy: { name: "asc" },
            select: { id: true, code: true, name: true, categoryId: true },
          },
        },
      }),
      prisma.company.findMany({
        where: {
          status: { in: ["Active", "ACTIVE"] },
          ...(country ? companyCountryFilter(country) : {}),
        },
        orderBy: { name: "asc" },
        select: { id: true, code: true, name: true, country: true },
      }),
      prisma.masterData.findMany({
        where: { type: directStatusType, active: true },
        orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
        select: { id: true, code: true, name: true, sortOrder: true },
      }),
    ]);

    return Response.json({ data: { categories, companies, fileStatuses } });
  } catch (error) {
    return errorResponse(error);
  }
}

export const GET = withApiAccess("candidate-options", GETHandler);
