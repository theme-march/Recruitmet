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
};

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
