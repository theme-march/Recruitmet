import { withApiAccess } from "@/lib/api-access";
import { getSession } from "@/lib/session";
import { AppError, errorResponse } from "@/lib/errors";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { DEFAULT_SETTINGS, type GeneralSettings } from "@/lib/queries/settings";

const settingsSchema = z.object({
  action: z.enum(["update", "reset"]).optional().default("update"),
  softwareName: z.string().trim().max(100).optional().default(DEFAULT_SETTINGS.softwareName),
  softwareSubtitle: z.string().trim().max(150).optional().default(DEFAULT_SETTINGS.softwareSubtitle),
  companyName: z.string().trim().max(150).optional().default(DEFAULT_SETTINGS.companyName),
  companyEmail: z.string().trim().email().or(z.string().trim().max(100)).optional().default(DEFAULT_SETTINGS.companyEmail),
  companyPhone: z.string().trim().max(50).optional().default(DEFAULT_SETTINGS.companyPhone),
  companyAddress: z.string().trim().max(500).optional().default(DEFAULT_SETTINGS.companyAddress),
  logoUrl: z.string().max(2_000_000).optional().default(""), // Supports base64 data URLs & URLs
  primaryColor: z.string().trim().max(30).optional().default(DEFAULT_SETTINGS.primaryColor),
  softwareVersion: z.string().trim().max(30).optional().default(DEFAULT_SETTINGS.softwareVersion),
});

async function loadSettingsFromDb(): Promise<GeneralSettings> {
  const rows = await prisma.systemSetting.findMany({
    where: { group: "GENERAL" },
  });

  const map = new Map<string, string>();
  for (const r of rows) {
    if (typeof r.value === "string") {
      map.set(r.key, r.value);
    } else if (r.value !== null && r.value !== undefined) {
      map.set(r.key, String(r.value));
    }
  }

  return {
    softwareName: map.get("SOFTWARE_NAME") || DEFAULT_SETTINGS.softwareName,
    softwareSubtitle: map.get("SOFTWARE_SUBTITLE") || DEFAULT_SETTINGS.softwareSubtitle,
    companyName: map.get("COMPANY_NAME") || DEFAULT_SETTINGS.companyName,
    companyEmail: map.get("COMPANY_EMAIL") || DEFAULT_SETTINGS.companyEmail,
    companyPhone: map.get("COMPANY_PHONE") || DEFAULT_SETTINGS.companyPhone,
    companyAddress: map.get("COMPANY_ADDRESS") || DEFAULT_SETTINGS.companyAddress,
    logoUrl: map.get("LOGO_URL") || DEFAULT_SETTINGS.logoUrl,
    primaryColor: map.get("PRIMARY_COLOR") || DEFAULT_SETTINGS.primaryColor,
    softwareVersion: map.get("SOFTWARE_VERSION") || DEFAULT_SETTINGS.softwareVersion,
  };
}

async function GETHandler() {
  try {
    const session = await getSession();
    if (!session) throw new AppError("UNAUTHORIZED", "Sign in is required.", 401);

    const data = await loadSettingsFromDb();
    return Response.json({ data });
  } catch (error) {
    return errorResponse(error);
  }
}

async function POSTHandler(request: Request) {
  try {
    const session = await getSession();
    if (!session) throw new AppError("UNAUTHORIZED", "Sign in is required.", 401);

    const json = await request.json();
    const parsed = settingsSchema.safeParse(json);
    if (!parsed.success) {
      throw new AppError("VALIDATION_ERROR", parsed.error.issues[0]?.message || "Invalid settings data.", 422);
    }

    const { action, ...fields } = parsed.data;

    // Reset action: restore all settings to system defaults
    if (action === "reset") {
      await prisma.systemSetting.deleteMany({
        where: {
          group: "GENERAL",
          key: {
            in: [
              "SOFTWARE_NAME",
              "SOFTWARE_SUBTITLE",
              "COMPANY_NAME",
              "COMPANY_EMAIL",
              "COMPANY_PHONE",
              "COMPANY_ADDRESS",
              "LOGO_URL",
              "PRIMARY_COLOR",
              "SOFTWARE_VERSION",
            ],
          },
        },
      });

      return Response.json({
        ok: true,
        message: "Settings reset to defaults successfully.",
        data: DEFAULT_SETTINGS,
      });
    }

    // Save individual settings
    const entries: Array<[string, string]> = [
      ["SOFTWARE_NAME", fields.softwareName],
      ["SOFTWARE_SUBTITLE", fields.softwareSubtitle],
      ["COMPANY_NAME", fields.companyName],
      ["COMPANY_EMAIL", fields.companyEmail],
      ["COMPANY_PHONE", fields.companyPhone],
      ["COMPANY_ADDRESS", fields.companyAddress],
      ["LOGO_URL", fields.logoUrl],
      ["PRIMARY_COLOR", fields.primaryColor],
      ["SOFTWARE_VERSION", fields.softwareVersion],
    ];

    await prisma.$transaction(
      entries.map(([key, val]) =>
        prisma.systemSetting.upsert({
          where: { group_key: { group: "GENERAL", key } },
          create: {
            group: "GENERAL",
            key,
            value: val,
            sensitive: false,
            updatedBy: session.userId,
          },
          update: {
            value: val,
            updatedBy: session.userId,
          },
        })
      )
    );

    const updated = await loadSettingsFromDb();
    return Response.json({
      ok: true,
      message: "Settings updated successfully.",
      data: updated,
    });
  } catch (error) {
    return errorResponse(error);
  }
}

export const GET = withApiAccess("settings", GETHandler);
export const POST = withApiAccess("settings", POSTHandler);
