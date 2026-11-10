export type GeneralSettings = {
  softwareName: string;
  softwareSubtitle: string;
  companyName: string;
  companyEmail: string;
  companyPhone: string;
  companyAddress: string;
  logoUrl: string;
  primaryColor: string;
  softwareVersion: string;
  // Database Backup Settings
  autoBackupEnabled: boolean;
  backupFrequency: "12hours" | "daily" | "weekly";
  backupTime: string;
  backupRetention: number;
  lastBackupAt: string | null;
};

export const DEFAULT_SETTINGS: GeneralSettings = {
  softwareName: "ORBIT",
  softwareSubtitle: "Requirements PANEL",
  companyName: "Orbit Overseas",
  companyEmail: "info@orbitoverseas.com",
  companyPhone: "+880 1711-000000",
  companyAddress: "Dhaka Head Office (Banani), Dhaka, Bangladesh",
  logoUrl: "",
  primaryColor: "#007aff",
  softwareVersion: "2.4.0",
  autoBackupEnabled: true,
  backupFrequency: "daily",
  backupTime: "02:00",
  backupRetention: 14,
  lastBackupAt: null,
};

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

export const settingsQueryKey = ["general-settings"] as const;

export const settingsQueryOptions = {
  queryKey: settingsQueryKey,
  queryFn: async (): Promise<GeneralSettings> => {
    const res = await fetch("/api/settings");
    if (!res.ok) return DEFAULT_SETTINGS;
    const json = await res.json();
    return { ...DEFAULT_SETTINGS, ...(json.data || {}) };
  },
  staleTime: 1000 * 60 * 5,
};
