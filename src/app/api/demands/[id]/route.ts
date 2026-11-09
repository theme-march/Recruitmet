import { withApiAccess } from "@/lib/api-access";
export const GET = withApiAccess("demands/[id]", GETHandler);
export const PATCH = withApiAccess("demands/[id]", PATCHHandler);
export const DELETE = withApiAccess("demands/[id]", DELETEHandler);
import { can } from "@/lib/authorization";
import { AppError, errorResponse } from "@/lib/errors";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { toAppRole } from "@/lib/roles";
import { syncDemandToCountryPackage, removeDemandCountryPackage } from "@/lib/country-package-sync";

async function GETHandler(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession();
    if (!session) throw new AppError("UNAUTHORIZED", "Sign in is required.", 401);

    const { id } = await params;
    const demand = await prisma.demand.findUnique({
      where: { id },
      include: {
        company: { include: { office: true } },
        processingFiles: { include: { candidate: true }, take: 10 },
      },
    });

    if (!demand) throw new AppError("NOT_FOUND", "Demand record not found.", 404);
    return Response.json({ data: demand });
  } catch (error) {
    return errorResponse(error);
  }
}

async function PATCHHandler(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession();
    if (!session) throw new AppError("UNAUTHORIZED", "Sign in is required.", 401);
    if (!(await can(session, "office-vendor", "Update"))) {
      throw new AppError("FORBIDDEN", "Permission required to edit Works & Demands. Please contact a Super Administrator.", 403);
    }

    const { id } = await params;
    const body = await request.json();

    const existing = await prisma.demand.findUnique({ where: { id } });
    if (!existing) throw new AppError("NOT_FOUND", "Demand not found.", 404);

    const prevReq = (existing.requirements ?? {}) as Record<string, unknown>;
    const updatedSaleQty = body.saleVisaQuantity !== undefined ? Number(body.saleVisaQuantity) : Number(prevReq.saleVisaQuantity ?? 0);
    const updatedVisaQty = body.visaQuantity !== undefined ? Number(body.visaQuantity) : (existing.visaQuantity ?? existing.quantity);

    let calculatedStatus = "Approved";
    if (body.deadline && new Date(body.deadline) < new Date()) {
      calculatedStatus = "Expired";
    } else if (updatedSaleQty >= updatedVisaQty && updatedVisaQty > 0) {
      calculatedStatus = "Completed";
    } else if (updatedSaleQty > 0) {
      calculatedStatus = "Active";
    }
    const finalStatus = body.status ? String(body.status) : calculatedStatus;

    let companyIdToUpdate: string | undefined = undefined;
    if (body.companyName && typeof body.companyName === "string" && body.companyName.trim()) {
      const cName = body.companyName.trim();
      let matchedComp = await prisma.company.findFirst({
        where: { name: cName },
      });
      if (!matchedComp) {
        matchedComp = await prisma.company.create({
          data: {
            code: `CMP-${Date.now().toString().slice(-4)}`,
            name: cName,
            country: body.country ? String(body.country).trim() : existing.country,
          },
        });
      }
      companyIdToUpdate = matchedComp.id;
    }

    const updated = await prisma.demand.update({
      where: { id },
      data: {
        companyId: companyIdToUpdate,
        country: body.country !== undefined ? String(body.country).trim() : undefined,
        profession: body.profession !== undefined ? body.profession : undefined,
        visaQuantity: body.visaQuantity !== undefined ? Number(body.visaQuantity) : undefined,
        assignedQuantity: updatedSaleQty,
        salary: body.salary !== undefined ? Number(body.salary) : undefined,
        visaRate: body.visaRate !== undefined ? Number(body.visaRate) : undefined,
        commissionPerFile: body.commissionPerFile !== undefined ? Number(body.commissionPerFile) : undefined,
        deadline: body.deadline !== undefined ? (body.deadline ? new Date(body.deadline) : null) : undefined,
        status: finalStatus,
        requirements: {
          ...prevReq,
          workHour: body.workHour !== undefined ? body.workHour : prevReq.workHour,
          workLocation: body.workLocation !== undefined ? body.workLocation : prevReq.workLocation,
          saleVisaQuantity: updatedSaleQty,
          note: body.note !== undefined ? body.note : prevReq.note,
        },
      },
    });

    // Auto-sync updated demand to its specific country's packages & pricing
    await syncDemandToCountryPackage(id);

    return Response.json({ ok: true, data: updated, message: "Demand updated successfully!" });
  } catch (error) {
    return errorResponse(error);
  }
}

async function DELETEHandler(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession();
    if (!session) throw new AppError("UNAUTHORIZED", "Sign in is required.", 401);
    if (!(await can(session, "office-vendor", "Delete"))) {
      throw new AppError("FORBIDDEN", "Permission required to delete Works & Demands. Please contact a Super Administrator.", 403);
    }

    const { id } = await params;
    const existing = await prisma.demand.findUnique({ where: { id } });
    if (existing) {
      await removeDemandCountryPackage(existing.demandNo);
    }
    await prisma.demand.delete({ where: { id } });

    return Response.json({ ok: true, message: "Demand deleted successfully!" });
  } catch (error) {
    return errorResponse(error);
  }
}
