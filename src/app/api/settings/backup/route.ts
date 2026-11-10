import { getSession } from "@/lib/session";
import { AppError, errorResponse } from "@/lib/errors";
import { withApiAccess } from "@/lib/api-access";
import {
  checkAndRunAutoBackup,
  deleteDatabaseBackup,
  generateDatabaseJsonBackup,
  generateDatabaseSqlBackup,
  getDatabaseStats,
  listDatabaseBackups,
} from "@/server/database-backup";

export const dynamic = "force-dynamic";
export const GET = withApiAccess("settings/backup", GETHandler);
export const POST = withApiAccess("settings/backup", POSTHandler);
export const DELETE = withApiAccess("settings/backup", DELETEHandler);

async function GETHandler() {
  try {
    const session = await getSession();
    if (!session) throw new AppError("UNAUTHORIZED", "Sign in is required.", 401);

    // Trigger auto backup check in background
    void checkAndRunAutoBackup();

    const [stats, backups] = await Promise.all([
      getDatabaseStats(),
      Promise.resolve(listDatabaseBackups()),
    ]);

    return Response.json({
      ok: true,
      stats,
      backups,
    });
  } catch (error) {
    return errorResponse(error);
  }
}

async function POSTHandler(request: Request) {
  try {
    const session = await getSession();
    if (!session) throw new AppError("UNAUTHORIZED", "Sign in is required.", 401);

    let format = "sql";
    let type: "manual" | "auto" = "manual";

    try {
      const body = await request.json();
      if (body.format === "json") format = "json";
      if (body.type === "auto") type = "auto";
    } catch {
      // Default to manual sql dump
    }

    const backup =
      format === "json"
        ? await generateDatabaseJsonBackup({ type })
        : await generateDatabaseSqlBackup({ type });

    return Response.json(
      {
        ok: true,
        message: "Database backup created successfully.",
        backup,
        downloadUrl: `/api/settings/backup/download?filename=${encodeURIComponent(backup.filename)}`,
      },
      { status: 201 }
    );
  } catch (error) {
    return errorResponse(error);
  }
}

async function DELETEHandler(request: Request) {
  try {
    const session = await getSession();
    if (!session) throw new AppError("UNAUTHORIZED", "Sign in is required.", 401);

    const url = new URL(request.url);
    const filename = url.searchParams.get("filename");
    if (!filename) throw new AppError("VALIDATION_ERROR", "Backup filename is required.", 422);

    const deleted = deleteDatabaseBackup(filename);
    if (!deleted) throw new AppError("NOT_FOUND", "Backup file not found or could not be deleted.", 404);

    return Response.json({
      ok: true,
      message: "Backup file deleted successfully.",
    });
  } catch (error) {
    return errorResponse(error);
  }
}
