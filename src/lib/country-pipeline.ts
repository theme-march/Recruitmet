import {
  CreditCard,
  FileCheck,
  FileText,
  Globe,
  GraduationCap,
  Plane,
  ShieldCheck,
  Building2,
  Sparkles,
  Calendar,
  MapPin,
  UserCheck,
  Receipt,
  Paperclip,
  FileSignature,
} from "lucide-react";

export type MasterStageCode =
  | "PASSPORT"
  | "MEDICAL"
  | "PCC"
  | "TAKAMUL"
  | "MOFA"
  | "LABOR_APPROVAL"
  | "VISA_STAMPING"
  | "PAYMENT"
  | "MANPOWER"
  | "FLIGHT";

export interface MasterStageDefinition {
  code: MasterStageCode;
  id: string; // Used in candidate file processing (e.g. "Passport Entry", "Medical", etc.)
  label: string;
  subtitle: string;
  description: string;
  iconName: string;
  required?: boolean; // Cannot be disabled (e.g. Passport & Flight)
  defaultActiveIn: string[]; // e.g. ["SAUDI", "DUBAI", "EUROPE", "GENERAL"]
}

export const MASTER_STAGES: MasterStageDefinition[] = [
  {
    code: "PASSPORT",
    id: "Passport Entry",
    label: "Passport",
    subtitle: "Entry & Expiry",
    description: "Passport number, issue/expiry dates, bio page scan & validity verification.",
    iconName: "FileText",
    required: true,
    defaultActiveIn: ["SAUDI", "DUBAI", "EUROPE", "GENERAL"],
  },
  {
    code: "MEDICAL",
    id: "Medical",
    label: "Medical",
    subtitle: "Fit Result & Bio",
    description: "GAMCA / General health check, chest X-Ray, blood test & fitness test verification.",
    iconName: "ShieldCheck",
    defaultActiveIn: ["SAUDI", "DUBAI", "EUROPE", "GENERAL"],
  },
  {
    code: "PCC",
    id: "Police Clearance",
    label: "Police PCC",
    subtitle: "Clearance Cert",
    description: "Police verification certificate (180 days validity) & criminal check clearance.",
    iconName: "ShieldCheck",
    defaultActiveIn: ["SAUDI", "EUROPE", "GENERAL"],
  },
  {
    code: "PAYMENT",
    id: "Payment",
    label: "Payment",
    subtitle: "Deposits & Fee",
    description: "First & second payment deposits, money receipts & candidate financial ledger.",
    iconName: "CreditCard",
    defaultActiveIn: ["SAUDI", "DUBAI", "EUROPE", "GENERAL"],
  },
  {
    code: "TAKAMUL",
    id: "Takamul",
    label: "Takamul",
    subtitle: "SVP Skill Test",
    description: "Skill verification program (SVP) test certification for technical professions in KSA.",
    iconName: "GraduationCap",
    defaultActiveIn: ["SAUDI"],
  },
  {
    code: "MOFA",
    id: "Mofa",
    label: "Visa / MOFA",
    subtitle: "Embassy Stamp",
    description: "MOFA number allocation, Enjaz authorization & Saudi Embassy electronic stamping.",
    iconName: "Globe",
    defaultActiveIn: ["SAUDI"],
  },
  {
    code: "LABOR_APPROVAL",
    id: "Approval Application",
    label: "Labor Approval",
    subtitle: "Offer & MOHRE",
    description: "MOHRE electronic work permit offer, quota verification & labor pre-approval letter.",
    iconName: "FileCheck",
    defaultActiveIn: ["DUBAI", "EUROPE"],
  },
  {
    code: "VISA_STAMPING",
    id: "E-Visa Stamping",
    label: "Visa Stamping",
    subtitle: "Entry & E-Visa",
    description: "Electronic entry visa issuance, VFS embassy submission & permit copy receipt.",
    iconName: "Globe",
    defaultActiveIn: ["DUBAI", "EUROPE", "GENERAL"],
  },
  {
    code: "MANPOWER",
    id: "Manpower",
    label: "Manpower",
    subtitle: "BMET Smart Card",
    description: "Bureau of Manpower, Employment and Training (BMET) government clearance smart card.",
    iconName: "FileCheck",
    defaultActiveIn: ["SAUDI", "DUBAI", "EUROPE", "GENERAL"],
  },
  {
    code: "FLIGHT",
    id: "Flight",
    label: "Flight",
    subtitle: "Ticket & Depart",
    description: "Flight itinerary booking, PNR ticket issuance, airport briefing & candidate departure.",
    iconName: "Plane",
    required: true,
    defaultActiveIn: ["SAUDI", "DUBAI", "EUROPE", "GENERAL"],
  },
];

export interface PipelineTemplate {
  id: string;
  name: string;
  badge: string;
  flag: string;
  description: string;
  stageCodes: MasterStageCode[];
}

export const PIPELINE_TEMPLATES: Record<string, PipelineTemplate> = {
  SAUDI: {
    id: "SAUDI",
    name: "Saudi Arabia (KSA Visa & MOFA)",
    badge: "8-Stage KSA",
    flag: "🇸🇦",
    description: "Full Saudi recruitment pipeline including Takamul SVP Skill Test & MOFA Embassy Stamping.",
    stageCodes: ["PASSPORT", "MEDICAL", "PCC", "PAYMENT", "TAKAMUL", "MOFA", "MANPOWER", "FLIGHT"],
  },
  DUBAI: {
    id: "DUBAI",
    name: "Dubai / UAE (Labor & Immigration)",
    badge: "7-Stage Dubai",
    flag: "🇦🇪",
    description: "UAE immigration flow with MOHRE Labor Approval & Electronic Entry Visa.",
    stageCodes: ["PASSPORT", "MEDICAL", "PAYMENT", "LABOR_APPROVAL", "VISA_STAMPING", "MANPOWER", "FLIGHT"],
  },
  EUROPE: {
    id: "EUROPE",
    name: "European Work Permit Pipeline",
    badge: "8-Stage Europe",
    flag: "🇪🇺",
    description: "European work permit letter (AJOFM/IGI), PCC & Embassy VFS processing for Romania, Italy, Poland.",
    stageCodes: ["PASSPORT", "MEDICAL", "PCC", "LABOR_APPROVAL", "PAYMENT", "VISA_STAMPING", "MANPOWER", "FLIGHT"],
  },
  GENERAL: {
    id: "GENERAL",
    name: "General Overseas Pipeline",
    badge: "7-Stage General",
    flag: "🇴🇲",
    description: "Standard 7-stage overseas recruitment workflow for Oman, Qatar, Kuwait, Malaysia, Singapore.",
    stageCodes: ["PASSPORT", "MEDICAL", "PCC", "PAYMENT", "VISA_STAMPING", "MANPOWER", "FLIGHT"],
  },
};

export function getStageIcon(iconName: string) {
  switch (iconName) {
    case "FileText":
      return FileText;
    case "ShieldCheck":
      return ShieldCheck;
    case "CreditCard":
      return CreditCard;
    case "GraduationCap":
      return GraduationCap;
    case "Globe":
      return Globe;
    case "FileCheck":
      return FileCheck;
    case "Plane":
      return Plane;
    case "Building2":
      return Building2;
    case "Sparkles":
      return Sparkles;
    case "Calendar":
      return Calendar;
    case "MapPin":
      return MapPin;
    case "UserCheck":
      return UserCheck;
    case "Receipt":
      return Receipt;
    case "Paperclip":
      return Paperclip;
    case "FileSignature":
      return FileSignature;
    default:
      return FileText;
  }
}

export function getDefaultStagesForCountry(countryName: string, workflowType?: string) {
  const norm = (countryName || "").toLowerCase();
  let templateKey = "GENERAL";

  if (workflowType && PIPELINE_TEMPLATES[workflowType]) {
    templateKey = workflowType;
  } else if (norm.includes("saudi") || norm.includes("ksa")) {
    templateKey = "SAUDI";
  } else if (norm.includes("dubai") || norm.includes("uae") || norm.includes("emirates")) {
    templateKey = "DUBAI";
  } else if (norm.includes("romania") || norm.includes("poland") || norm.includes("italy") || norm.includes("croatia")) {
    templateKey = "EUROPE";
  }

  const template = PIPELINE_TEMPLATES[templateKey] || PIPELINE_TEMPLATES.GENERAL;

  return template.stageCodes.map((code, idx) => {
    const def = MASTER_STAGES.find((s) => s.code === code)!;
    return {
      code: def.code,
      id: def.id,
      stepNo: idx + 1,
      label: def.label,
      subtitle: def.subtitle,
      description: def.description,
      iconName: def.iconName,
      icon: getStageIcon(def.iconName),
      active: true,
      required: Boolean(def.required),
    };
  });
}
