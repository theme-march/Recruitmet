import fs from "node:fs";
import path from "node:path";
import { prisma } from "@/lib/prisma";

const BACKUP_DIR = path.join(process.cwd(), "storage", "backups");

export interface BackupItem {
  filename: string;
  sizeBytes: number;
  sizeFormatted: string;
  createdAt: string;
  type: "manual" | "auto";
  format: "sql" | "json";
}

export interface DatabaseStats {
  totalTables: number;
  totalRows: number;
  databaseName: string;
  engine: string;
  backupsCount: number;
  totalBackupSizeBytes: number;
  totalBackupSizeFormatted: string;
  lastBackupAt: string | null;
}

export function ensureBackupDir(): string {
  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
  }
  return BACKUP_DIR;
}

export function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
}

export function escapeSqlValue(val: any): string {
  if (val === null || val === undefined) return "NULL";
  if (typeof val === "boolean") return val ? "1" : "0";
  if (typeof val === "number") return isFinite(val) ? String(val) : "NULL";
  if (val instanceof Date) {
    return `'${val.toISOString().slice(0, 23).replace("T", " ")}'`;
  }
  if (Buffer.isBuffer(val)) {
    return `X'${val.toString("hex")}'`;
  }
  if (val !== null && typeof val === "object" && typeof val.toFixed === "function") {
    return String(val);
  }
  if (typeof val === "object") {
    val = JSON.stringify(val);
  }
  const str = String(val)
    .replace(/\\/g, "\\\\")
    .replace(/'/g, "\\'")
    .replace(/\0/g, "\\0")
    .replace(/\n/g, "\\n")
    .replace(/\r/g, "\\r");
  return `'${str}'`;
}

/**
 * Generate full SQL Dump of MySQL Database
 */
export async function generateDatabaseSqlBackup(options: { type?: "manual" | "auto" } = {}): Promise<BackupItem> {
  const type = options.type || "manual";
  ensureBackupDir();

  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10);
  const timeStr = now.toISOString().slice(11, 19).replace(/:/g, "-");
  const filename = `orbit_backup_${dateStr}_${timeStr}_${type}.sql`;
  const filePath = path.join(BACKUP_DIR, filename);

  const tablesRes: Array<Record<string, string>> = await prisma.$queryRawUnsafe("SHOW TABLES");
  const tableNames = tablesRes.map((t) => Object.values(t)[0]).filter(Boolean);

  let output = `-- =========================================================================\n`;
  output += `-- Orbit Recruitment OS MySQL Database Backup\n`;
  output += `-- Generated: ${now.toISOString()}\n`;
  output += `-- Type: ${type.toUpperCase()}\n`;
  output += `-- Total Tables: ${tableNames.length}\n`;
  output += `-- =========================================================================\n\n`;
  output += `SET NAMES utf8mb4;\n`;
  output += `SET FOREIGN_KEY_CHECKS = 0;\n\n`;

  let totalRows = 0;

  for (const table of tableNames) {
    try {
      const ddlRes: Array<Record<string, any>> = await prisma.$queryRawUnsafe(`SHOW CREATE TABLE \`${table}\``);
      if (ddlRes && ddlRes[0]) {
        const createTableSql = ddlRes[0]["Create Table"] || Object.values(ddlRes[0])[1];
        output += `-- Table structure for table \`${table}\`\n`;
        output += `DROP TABLE IF EXISTS \`${table}\`;\n`;
        output += `${createTableSql};\n\n`;
      }

      const rows: Array<Record<string, any>> = await prisma.$queryRawUnsafe(`SELECT * FROM \`${table}\``);
      if (rows && rows.length > 0) {
        totalRows += rows.length;
        output += `-- Dumping data for table \`${table}\` (${rows.length} rows)\n`;
        const columns = Object.keys(rows[0]);
        const colsSql = columns.map((c) => `\`${c}\``).join(", ");

        // Chunk inserts by 100 rows for efficiency & safety
        const chunkSize = 100;
        for (let i = 0; i < rows.length; i += chunkSize) {
          const chunk = rows.slice(i, i + chunkSize);
          output += `INSERT INTO \`${table}\` (${colsSql}) VALUES\n`;
          const rowLines = chunk.map((r) => {
            const vals = columns.map((c) => escapeSqlValue(r[c])).join(", ");
            return `  (${vals})`;
          });
          output += `${rowLines.join(",\n")};\n`;
        }
        output += `\n`;
      }
    } catch (err: any) {
      console.warn(`[database-backup] Warning dumping table ${table}:`, err?.message || err);
      output += `-- Error backing up table ${table}: ${err?.message || "Unknown error"}\n\n`;
    }
  }

  output += `SET FOREIGN_KEY_CHECKS = 1;\n`;
  output += `-- Backup successfully completed (${totalRows} records dumped) --\n`;

  fs.writeFileSync(filePath, output, "utf8");

  const stat = fs.statSync(filePath);
  const isoTime = now.toISOString();

  // Update LAST_BACKUP_AT in SystemSetting
  try {
    await prisma.systemSetting.upsert({
      where: { group_key: { group: "GENERAL", key: "LAST_BACKUP_AT" } },
      update: { value: isoTime, updatedAt: now },
      create: {
        group: "GENERAL",
        key: "LAST_BACKUP_AT",
        value: isoTime,
        updatedBy: "SYSTEM",
      },
    });
  } catch (err) {
    console.warn("[database-backup] Could not update LAST_BACKUP_AT:", err);
  }

  // Enforce Retention Policy
  await pruneOldBackups();

  return {
    filename,
    sizeBytes: stat.size,
    sizeFormatted: formatBytes(stat.size),
    createdAt: isoTime,
    type,
    format: "sql",
  };
}

/**
 * Generate full JSON Dump of all database tables and rows
 */
export async function generateDatabaseJsonBackup(options: { type?: "manual" | "auto" } = {}): Promise<BackupItem> {
  const type = options.type || "manual";
  ensureBackupDir();

  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10);
  const timeStr = now.toISOString().slice(11, 19).replace(/:/g, "-");
  const filename = `orbit_backup_${dateStr}_${timeStr}_${type}.json`;
  const filePath = path.join(BACKUP_DIR, filename);

  const tablesRes: Array<Record<string, string>> = await prisma.$queryRawUnsafe("SHOW TABLES");
  const tableNames = tablesRes.map((t) => Object.values(t)[0]).filter(Boolean);

  const dataDump: Record<string, any[]> = {};
  let totalRows = 0;

  for (const table of tableNames) {
    try {
      const rows: Array<Record<string, any>> = await prisma.$queryRawUnsafe(`SELECT * FROM \`${table}\``);
      dataDump[table] = rows;
      totalRows += rows.length;
    } catch {
      dataDump[table] = [];
    }
  }

  const payload = {
    metadata: {
      application: "Orbit Recruitment OS",
      exportedAt: now.toISOString(),
      type,
      totalTables: tableNames.length,
      totalRows,
      version: "2.4.0",
    },
    tables: dataDump,
  };

  fs.writeFileSync(filePath, JSON.stringify(payload, null, 2), "utf8");

  const stat = fs.statSync(filePath);
  const isoTime = now.toISOString();

  await pruneOldBackups();

  return {
    filename,
    sizeBytes: stat.size,
    sizeFormatted: formatBytes(stat.size),
    createdAt: isoTime,
    type,
    format: "json",
  };
}

/**
 * List all existing backup files
 */
export function listDatabaseBackups(): BackupItem[] {
  ensureBackupDir();
  const files = fs.readdirSync(BACKUP_DIR);
  const backups: BackupItem[] = [];

  for (const file of files) {
    if (!file.startsWith("orbit_backup_") || (!file.endsWith(".sql") && !file.endsWith(".json"))) {
      continue;
    }

    try {
      const filePath = path.join(BACKUP_DIR, file);
      const stat = fs.statSync(filePath);
      const isAuto = file.includes("_auto.");
      const isJson = file.endsWith(".json");

      backups.push({
        filename: file,
        sizeBytes: stat.size,
        sizeFormatted: formatBytes(stat.size),
        createdAt: stat.mtime.toISOString(),
        type: isAuto ? "auto" : "manual",
        format: isJson ? "json" : "sql",
      });
    } catch {
      // Ignore unreadable files
    }
  }

  // Sort descending by creation date
  return backups.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

/**
 * Resolve validated backup file path
 */
export function getDatabaseBackupFilePath(filename: string): string | null {
  ensureBackupDir();
  // Protect against directory traversal
  const clean = path.basename(filename);
  if (!clean.startsWith("orbit_backup_") || (!clean.endsWith(".sql") && !clean.endsWith(".json"))) {
    return null;
  }
  const fullPath = path.join(BACKUP_DIR, clean);
  if (!fs.existsSync(fullPath)) return null;
  return fullPath;
}

/**
 * Delete a backup file
 */
export function deleteDatabaseBackup(filename: string): boolean {
  const filePath = getDatabaseBackupFilePath(filename);
  if (!filePath) return false;
  try {
    fs.unlinkSync(filePath);
    return true;
  } catch {
    return false;
  }
}

/**
 * Get Database Statistics
 */
export async function getDatabaseStats(): Promise<DatabaseStats> {
  const tablesRes: Array<Record<string, string>> = await prisma.$queryRawUnsafe("SHOW TABLES");
  const tableNames = tablesRes.map((t) => Object.values(t)[0]).filter(Boolean);

  let totalRows = 0;
  for (const table of tableNames) {
    try {
      const countRes: Array<Record<string, any>> = await prisma.$queryRawUnsafe(`SELECT COUNT(*) as c FROM \`${table}\``);
      if (countRes && countRes[0]) {
        totalRows += Number(countRes[0].c || countRes[0].count || 0);
      }
    } catch {
      // Ignore table count errors
    }
  }

  const backups = listDatabaseBackups();
  const totalSizeBytes = backups.reduce((acc, b) => acc + b.sizeBytes, 0);

  const lastSetting = await prisma.systemSetting.findUnique({
    where: { group_key: { group: "GENERAL", key: "LAST_BACKUP_AT" } },
  });

  return {
    totalTables: tableNames.length,
    totalRows,
    databaseName: "recruitment_os",
    engine: "MySQL (Prisma ORM)",
    backupsCount: backups.length,
    totalBackupSizeBytes: totalSizeBytes,
    totalBackupSizeFormatted: formatBytes(totalSizeBytes),
    lastBackupAt: typeof lastSetting?.value === "string" ? lastSetting.value : backups[0]?.createdAt || null,
  };
}

/**
 * Remove old backups when exceeding retention policy
 */
export async function pruneOldBackups(): Promise<void> {
  try {
    const setting = await prisma.systemSetting.findUnique({
      where: { group_key: { group: "GENERAL", key: "BACKUP_RETENTION" } },
    });
    const retention = setting?.value ? Number(setting.value) : 14;
    const maxBackups = Math.max(5, retention || 14);

    const backups = listDatabaseBackups();
    if (backups.length > maxBackups) {
      const toDelete = backups.slice(maxBackups);
      for (const item of toDelete) {
        deleteDatabaseBackup(item.filename);
      }
    }
  } catch (err) {
    console.warn("[database-backup] Error pruning backups:", err);
  }
}

/**
 * Check if automated backup should run, and trigger if due
 */
export async function checkAndRunAutoBackup(): Promise<boolean> {
  try {
    const rows = await prisma.systemSetting.findMany({
      where: {
        group: "GENERAL",
        key: { in: ["AUTO_BACKUP_ENABLED", "BACKUP_FREQUENCY", "LAST_BACKUP_AT"] },
      },
    });

    const map = new Map<string, string>();
    for (const r of rows) {
      map.set(r.key, String(r.value));
    }

    const enabled = map.get("AUTO_BACKUP_ENABLED");
    if (enabled !== "true" && enabled !== "1") {
      return false; // Auto backup is disabled by user
    }

    const frequency = map.get("BACKUP_FREQUENCY") || "daily";
    const lastAtStr = map.get("LAST_BACKUP_AT");

    if (lastAtStr) {
      const lastAt = new Date(lastAtStr).getTime();
      const now = Date.now();
      const diffHours = (now - lastAt) / (1000 * 60 * 60);

      if (frequency === "12hours" && diffHours < 12) return false;
      if (frequency === "daily" && diffHours < 24) return false;
      if (frequency === "weekly" && diffHours < 24 * 7) return false;
    }

    // Run auto backup
    await generateDatabaseSqlBackup({ type: "auto" });
    return true;
  } catch (err) {
    console.warn("[database-backup] Auto backup check error:", err);
    return false;
  }
}
