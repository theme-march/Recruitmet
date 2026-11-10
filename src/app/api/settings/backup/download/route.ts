import fs from "node:fs";
import { getSession } from "@/lib/session";
import { AppError, errorResponse } from "@/lib/errors";
import { withApiAccess } from "@/lib/api-access";
import { getDatabaseBackupFilePath } from "@/server/database-backup";

export const dynamic = "force-dynamic";
export const GET = withApiAccess("settings/backup/download", GETHandler);

async function GETHandler(request: Request) {
  try {
    const session = await getSession();
    if (!session) throw new AppError("UNAUTHORIZED", "Sign in is required.", 401);

    const url = new URL(request.url);
    const filename = url.searchParams.get("filename");
    if (!filename) throw new AppError("VALIDATION_ERROR", "Filename is required.", 422);

    const filePath = getDatabaseBackupFilePath(filename);
    if (!filePath || !fs.existsSync(filePath)) {
      throw new AppError("NOT_FOUND", "Backup file not found.", 404);
    }

    const stat = fs.statSync(filePath);
    const stream = fs.createReadStream(filePath);
    const isJson = filename.endsWith(".json");

    return new Response(stream as any, {
      headers: {
        "Content-Type": isJson ? "application/json" : "application/sql",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Content-Length": String(stat.size),
        "Cache-Control": "private, no-cache, no-store",
      },
    });
  } catch (error) {
    return errorResponse(error);
  }
}
