import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { AppError, errorResponse } from "@/lib/errors";
import { z } from "zod";

const createDemandSchema = z.object({
  title: z.string().min(2),
  profession: z.string().min(2),
  country: z.string().min(2),
  quantity: z.number().int().min(1),
  companyName: z.string().min(2),
  salary: z.number().optional(),
});

export async function GET() {
  try {
    const session = await getSession();
    if (!session) throw new AppError("UNAUTHORIZED", "Sign in is required.", 401);

    const [demands, companies, interviewSchedules, categories] = await Promise.all([
      prisma.demand.findMany({ orderBy: { createdAt: "desc" }, include: { company: true } }),
      prisma.company.findMany({ orderBy: { name: "asc" } }),
      prisma.interviewSchedule.findMany({ orderBy: { scheduledAt: "desc" } }),
      prisma.professionCategory.findMany({ orderBy: { name: "asc" } }),
    ]);

    return Response.json({
      data: {
        demands,
        companies,
        interviewSchedules,
        categories,
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

    const input = createDemandSchema.parse(await request.json());

    // Ensure company exists or create
    let company = await prisma.company.findFirst({ where: { name: input.companyName } });
    if (!company) {
      company = await prisma.company.create({
        data: {
          code: `CMP-${Date.now().toString().slice(-4)}`,
          name: input.companyName,
          country: input.country,
        },
      });
    }

    const demandNo = `DEM-${Date.now().toString().slice(-6)}`;
    const demand = await prisma.demand.create({
      data: {
        demandNo,
        companyId: company.id,
        title: input.title,
        profession: input.profession,
        country: input.country,
        quantity: input.quantity,
        status: "ACTIVE",
      },
      include: { company: true },
    });

    await prisma.auditLog.create({
      data: {
        userId: session.userId,
        role: session.user.role.name,
        module: "MasterData",
        recordId: demand.id,
        action: "CREATE_DEMAND",
        newValue: input,
        correlationId: crypto.randomUUID(),
      },
    });

    return Response.json({ data: demand }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}

