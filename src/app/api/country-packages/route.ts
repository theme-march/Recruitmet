import { withApiAccess } from "@/lib/api-access";
export const GET = withApiAccess("country-packages", GETHandler);
export const POST = withApiAccess("country-packages", POSTHandler);
export const PATCH = withApiAccess("country-packages", PATCHHandler);
export const DELETE = withApiAccess("country-packages", DELETEHandler);

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { AppError, errorResponse } from "@/lib/errors";
import { matchesCountry, syncDemandToCountryPackage } from "@/lib/country-package-sync";

async function GETHandler(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const countryId = searchParams.get("countryId")?.trim();
    const countryName = searchParams.get("country")?.trim();

    let targetCountry: any = null;
    let whereClause: any = { active: true };

    if (countryId) {
      targetCountry = await prisma.country.findUnique({ where: { id: countryId } });
      if (targetCountry) {
        whereClause.countryId = targetCountry.id;
      } else {
        whereClause.countryId = countryId;
      }
    } else if (countryName) {
      const allCountries = await prisma.country.findMany();
      targetCountry = allCountries.find((c) => matchesCountry(c.name, c.code, countryName)) || null;
      if (targetCountry) {
        whereClause.countryId = targetCountry.id;
      }
    }

    // If a specific country is requested, fetch and sync its active demands
    let matchedDemands: any[] = [];
    if (targetCountry) {
      const allDemands = await prisma.demand.findMany({
        where: {
          status: { notIn: ["Expired", "Cancelled"] },
        },
        include: { company: true },
        orderBy: { createdAt: "desc" },
      });

      matchedDemands = allDemands.filter((d) =>
        matchesCountry(targetCountry.name, targetCountry.code, d.country)
      );

      // Auto-sync active demands of this country to ensure packages exist
      for (const dm of matchedDemands) {
        if (dm.visaRate && Number(dm.visaRate) > 0) {
          await syncDemandToCountryPackage(dm.id);
        }
      }
    }

    const packages = await prisma.countryPackage.findMany({
      where: whereClause,
      include: {
        country: {
          select: { id: true, name: true, code: true, flag: true, currency: true },
        },
      },
      orderBy: [{ isDefault: "desc" }, { price: "asc" }],
    });

    return NextResponse.json({
      success: true,
      data: packages.map((p) => ({
        id: p.id,
        countryId: p.countryId,
        countryName: p.country?.name,
        countryCode: p.country?.code,
        name: p.name,
        price: Number(p.price),
        description: p.description,
        isDefault: p.isDefault,
        active: p.active,
        createdAt: p.createdAt.toISOString(),
      })),
      demands: matchedDemands.map((d) => ({
        id: d.id,
        demandNo: d.demandNo,
        title: d.title || `${d.company?.name || "Company"} ${d.profession || "Work Demand"}`,
        profession: d.profession,
        company: d.company?.name || "Company",
        country: d.country,
        visaRate: Number(d.visaRate || 0),
        status: d.status,
      })),
    });
  } catch (error) {
    return errorResponse(error);
  }
}

async function POSTHandler(request: Request) {
  try {
    const session = await getSession();
    if (!session) throw new AppError("UNAUTHORIZED", "Sign in is required.", 401);

    const body = await request.json();
    const { countryId, name, price, description, isDefault } = body;

    if (!countryId || !name || price === undefined) {
      throw new AppError("VALIDATION_ERROR", "Country, Package Name and Price are required.", 422);
    }

    const numPrice = Number(price);
    if (isNaN(numPrice) || numPrice < 0) {
      throw new AppError("VALIDATION_ERROR", "Price must be a valid non-negative number.", 422);
    }

    // If marked as default, unset other defaults for this country
    if (isDefault) {
      await prisma.countryPackage.updateMany({
        where: { countryId },
        data: { isDefault: false },
      });
    }

    const newPkg = await prisma.countryPackage.create({
      data: {
        countryId,
        name: name.trim(),
        price: numPrice,
        description: description?.trim() || null,
        isDefault: Boolean(isDefault),
        active: true,
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        ...newPkg,
        price: Number(newPkg.price),
      },
    });
  } catch (error) {
    return errorResponse(error);
  }
}

async function PATCHHandler(request: Request) {
  try {
    const session = await getSession();
    if (!session) throw new AppError("UNAUTHORIZED", "Sign in is required.", 401);

    const body = await request.json();
    const { id, name, price, description, isDefault, active } = body;

    if (!id) throw new AppError("VALIDATION_ERROR", "Package ID is required.", 422);

    const existing = await prisma.countryPackage.findUnique({ where: { id } });
    if (!existing) throw new AppError("NOT_FOUND", "Package not found.", 404);

    if (isDefault) {
      await prisma.countryPackage.updateMany({
        where: { countryId: existing.countryId },
        data: { isDefault: false },
      });
    }

    const updated = await prisma.countryPackage.update({
      where: { id },
      data: {
        ...(name !== undefined ? { name: String(name).trim() } : {}),
        ...(price !== undefined ? { price: Number(price) } : {}),
        ...(description !== undefined ? { description: description?.trim() || null } : {}),
        ...(isDefault !== undefined ? { isDefault: Boolean(isDefault) } : {}),
        ...(active !== undefined ? { active: Boolean(active) } : {}),
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        ...updated,
        price: Number(updated.price),
      },
    });
  } catch (error) {
    return errorResponse(error);
  }
}

async function DELETEHandler(request: Request) {
  try {
    const session = await getSession();
    if (!session) throw new AppError("UNAUTHORIZED", "Sign in is required.", 401);

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) throw new AppError("VALIDATION_ERROR", "Package ID is required.", 422);

    await prisma.countryPackage.delete({ where: { id } });

    return NextResponse.json({ success: true, message: "Package deleted successfully." });
  } catch (error) {
    return errorResponse(error);
  }
}
