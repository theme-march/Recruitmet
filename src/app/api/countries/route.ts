import { withApiAccess } from "@/lib/api-access";
export const GET = withApiAccess("countries", GETHandler);
export const POST = withApiAccess("countries", POSTHandler);
export const PATCH = withApiAccess("countries", PATCHHandler);
export const DELETE = withApiAccess("countries", DELETEHandler);
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getDefaultStagesForCountry } from "@/lib/country-pipeline";


async function GETHandler() {
  try {
    // 1. Fetch all countries with their workflow stages
    const countries = await prisma.country.findMany({
      include: {
        workflow: {
          orderBy: { sortOrder: "asc" },
        },
      },
      orderBy: { name: "asc" },
    });

    // Read endpoints never seed or recreate deleted configuration.
    // 3. Aggregate candidate and file counts for each country
    const fileGroups = await prisma.processingFile.groupBy({
      by: ["country"],
      _count: { _all: true },
    });

    const candidateGroups = await prisma.candidate.groupBy({
      by: ["preferredCountry"],
      _count: { _all: true },
    });

    const fileCounts: Record<string, number> = {};
    fileGroups.forEach((fg) => {
      const c = (fg.country || "").trim().toLowerCase();
      fileCounts[c] = (fileCounts[c] || 0) + fg._count._all;
    });

    const candidateCounts: Record<string, number> = {};
    candidateGroups.forEach((cg) => {
      const c = (cg.preferredCountry || "").trim().toLowerCase();
      candidateCounts[c] = (candidateCounts[c] || 0) + cg._count._all;
    });

function matchesCountryName(countryName: string, countryCode: string, targetName: string): boolean {
  const cn = countryName.trim().toLowerCase();
  const code = countryCode.trim().toLowerCase();
  const tn = targetName.trim().toLowerCase();

  if (cn === "saudi arabia" || code === "sa" || code === "ksa") {
    return tn.includes("saudi") || tn === "sa" || tn === "ksa";
  }
  if (cn === "dubai" || code === "ae" || code === "uae") {
    return tn.includes("dubai") || tn.includes("uae") || tn.includes("emirates") || tn === "ae";
  }
  if (cn === "other" || cn === "other country" || code === "other") {
    return tn === "other" || tn === "other country" || tn === "others";
  }
  return tn === cn || tn === code;
}

    // 4. Fetch all country workflow stages directly from DB
    const allWorkflowStages = (await prisma.countryWorkflowStage.findMany({
      orderBy: { sortOrder: "asc" },
    }).catch(() => [])) as any[];

    const enriched = countries.map((country) => {
      let matchedCount = 0;

      Object.entries(fileCounts).forEach(([cName, cnt]) => {
        if (matchesCountryName(country.name, country.code, cName)) {
          matchedCount += cnt;
        }
      });

      if (matchedCount === 0) {
        Object.entries(candidateCounts).forEach(([cName, cnt]) => {
          if (matchesCountryName(country.name, country.code, cName)) {
            matchedCount += cnt;
          }
        });
      }

      const defaultStages = getDefaultStagesForCountry(country.name, country.workflowType);
      const countryStages = allWorkflowStages.filter((w) => w.countryId === country.id);

      const workflowStages = countryStages.length > 0
        ? countryStages.map((w: any) => ({
            id: w.id,
            code: w.code,
            name: w.name,
            subtitle: w.subtitle || "",
            description: w.description || "",
            icon: w.icon || "FileText",
            isCustom: Boolean(w.isCustom),
            sortOrder: w.sortOrder,
            active: Boolean(w.active),
            terminal: Boolean(w.terminal),
          }))
        : defaultStages.map((s: any) => ({
            id: `def-${s.code}`,
            code: s.code,
            name: s.label,
            subtitle: s.subtitle,
            description: s.description,
            icon: s.iconName,
            isCustom: false,
            sortOrder: s.stepNo,
            active: s.active,
            terminal: s.code === "FLIGHT",
          }));

      return {
        id: country.id,
        name: country.name,
        code: country.code,
        currency: country.currency || "USD",
        timezone: country.timezone || "UTC",
        phoneCode: country.phoneCode || "",
        workflowType: country.workflowType || "GENERAL",
        active: country.active,
        candidateCount: matchedCount,
        workflow: workflowStages,
        createdAt: country.createdAt,
        updatedAt: country.updatedAt,
      };
    });

    return NextResponse.json(
      { success: true, data: enriched },
      {
        headers: {
          "Cache-Control": "public, max-age=60, stale-while-revalidate=300",
        },
      }
    );
  } catch (error: any) {
    console.error("GET /api/countries error:", error);
    return NextResponse.json({ success: false, error: error.message || "Failed to load countries" }, { status: 500 });
  }
}

async function POSTHandler(req: Request) {
  try {
    const body = await req.json();
    const { name, code, currency, timezone, phoneCode, workflowType, active } = body;

    if (!name || !name.trim()) {
      return NextResponse.json({ success: false, error: "Country name is required" }, { status: 400 });
    }

    const cleanName = name.trim();
    const cleanCode = (code || cleanName.slice(0, 2)).trim().toUpperCase();

    // Check duplicate name or code in memory/database
    const all = await prisma.country.findMany();
    const duplicate = all.find(
      (c) => c.name.toLowerCase() === cleanName.toLowerCase() || c.code.toLowerCase() === cleanCode.toLowerCase()
    );

    if (duplicate) {
      return NextResponse.json({ success: false, error: `Country "${cleanName}" or code "${cleanCode}" already exists` }, { status: 409 });
    }

    const newCountry = await prisma.country.create({
      data: {
        name: cleanName,
        code: cleanCode,
        currency: currency?.trim().toUpperCase() || "USD",
        timezone: timezone?.trim() || "UTC",
        phoneCode: phoneCode?.trim() || null,
        workflowType: workflowType?.trim() || "GENERAL",
        active: active !== undefined ? Boolean(active) : true,
      },
    });

    // Auto-populate default workflow stages
    const defaultStages = getDefaultStagesForCountry(newCountry.name, newCountry.workflowType);
    for (let idx = 0; idx < defaultStages.length; idx++) {
      const s = defaultStages[idx];
      await prisma.countryWorkflowStage.create({
        data: {
          countryId: newCountry.id,
          code: s.code,
          name: s.label,
          subtitle: s.subtitle || "",
          description: s.description || "",
          icon: s.iconName || "FileText",
          isCustom: false,
          sortOrder: idx + 1,
          active: Boolean(s.active),
          terminal: s.code === "FLIGHT",
        },
      }).catch(() => {});
    }

    return NextResponse.json({ success: true, data: newCountry, message: `Country "${newCountry.name}" created successfully` }, { status: 201 });
  } catch (error: any) {
    console.error("POST /api/countries error:", error);
    return NextResponse.json({ success: false, error: error.message || "Failed to create country" }, { status: 500 });
  }
}

async function PATCHHandler(req: Request) {
  try {
    const body = await req.json();
    const { id, name, code, currency, timezone, phoneCode, workflowType, active, stages } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: "Country ID is required" }, { status: 400 });
    }

    const existing = await prisma.country.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ success: false, error: "Country not found" }, { status: 404 });
    }

    const updateData: Record<string, any> = {};
    if (name !== undefined) updateData.name = name.trim();
    if (code !== undefined) updateData.code = code.trim().toUpperCase();
    if (currency !== undefined) updateData.currency = currency.trim().toUpperCase();
    if (timezone !== undefined) updateData.timezone = timezone.trim();
    if (phoneCode !== undefined) updateData.phoneCode = phoneCode?.trim() || null;
    if (workflowType !== undefined) updateData.workflowType = workflowType.trim();
    if (active !== undefined) updateData.active = Boolean(active);

    // If updating name or code, ensure uniqueness
    if (updateData.name || updateData.code) {
      const all = await prisma.country.findMany({ where: { id: { not: id } } });
      const duplicate = all.find(
        (c) =>
          (updateData.name && c.name.toLowerCase() === updateData.name.toLowerCase()) ||
          (updateData.code && c.code.toLowerCase() === updateData.code.toLowerCase())
      );

      if (duplicate) {
        return NextResponse.json({ success: false, error: "A country with this name or code already exists" }, { status: 409 });
      }
    }

    const updated = await prisma.country.update({
      where: { id },
      data: updateData,
    });

    // If stages provided, replace countryWorkflowStage records
    if (Array.isArray(stages)) {
      await prisma.countryWorkflowStage.deleteMany({ where: { countryId: id } });
      for (let idx = 0; idx < stages.length; idx++) {
        const st = stages[idx];
        const code = String(st.code || `STAGE_${idx + 1}`);
        const stageName = String(st.name || st.label || "Stage");
        const subtitle = String(st.subtitle || "");
        const description = typeof st.description === "object"
          ? JSON.stringify(st.description)
          : String(st.description || "");
        const icon = String(st.icon || st.iconName || "FileText");
        const isCustom = Boolean(st.isCustom);
        const sortOrder = idx + 1;
        const activeVal = Boolean(st.active);
        const terminal = code === "FLIGHT";

        await prisma.countryWorkflowStage.create({
          data: {
            countryId: id,
            code,
            name: stageName,
            subtitle,
            description,
            icon,
            isCustom,
            sortOrder,
            active: activeVal,
            terminal,
          },
        }).catch((err) => console.warn("Stage create error:", err));
      }
    }

    // If country name changed, update processing files and candidates
    if (updateData.name && updateData.name !== existing.name) {
      await prisma.processingFile.updateMany({
        where: { country: existing.name },
        data: { country: updateData.name },
      }).catch(() => {});

      await prisma.candidate.updateMany({
        where: { preferredCountry: existing.name },
        data: { preferredCountry: updateData.name },
      }).catch(() => {});
    }

    return NextResponse.json({ success: true, data: updated, message: `Country "${updated.name}" updated successfully` });
  } catch (error: any) {
    console.error("PATCH /api/countries error:", error);
    return NextResponse.json({ success: false, error: error.message || "Failed to update country" }, { status: 500 });
  }
}

async function DELETEHandler(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ success: false, error: "Country ID is required" }, { status: 400 });
    }

    const country = await prisma.country.findUnique({ where: { id } });
    if (!country) {
      return NextResponse.json({ success: false, error: "Country not found" }, { status: 404 });
    }

    // Check if candidates or files are linked
    const linkedFilesCount = await prisma.processingFile.count({
      where: {
        OR: [
          { country: country.name },
          { country: { contains: country.name } },
        ],
      },
    });

    if (linkedFilesCount > 0) {
      // Rather than hard delete breaking relations, deactivate it
      const deactivated = await prisma.country.update({
        where: { id },
        data: { active: false },
      });
      return NextResponse.json({
        success: true,
        data: deactivated,
        message: `Country "${country.name}" has ${linkedFilesCount} active candidate file(s). It has been deactivated instead of deleted to protect financial ledgers.`,
      });
    }

    await prisma.country.delete({ where: { id } });

    return NextResponse.json({
      success: true,
      message: `Country "${country.name}" deleted successfully`,
    });
  } catch (error: any) {
    console.error("DELETE /api/countries error:", error);
    return NextResponse.json({ success: false, error: error.message || "Failed to delete country" }, { status: 500 });
  }
}
