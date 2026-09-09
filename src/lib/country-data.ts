/**
 * Comprehensive country data, flag emoji generation, and alpha-3 to alpha-2 ISO lookup.
 */

// Mapping of 3-letter ISO alpha-3 / common agency codes to ISO 3166-1 alpha-2 codes
export const ALPHA3_TO_ALPHA2: Record<string, string> = {
  // Common Agency / Regional Abbreviations
  KSA: "SA",
  UAE: "AE",
  DXB: "AE",
  OTHER: "OTHER",

  // Official ISO 3166-1 Alpha-3
  AFG: "AF", ALB: "AL", DZA: "DZ", AND: "AD", AGO: "AO", ARG: "AR", ARM: "AM", AUS: "AU",
  AUT: "AT", AZE: "AZ", BHR: "BH", BGD: "BD", BLR: "BY", BEL: "BE", BLZ: "BZ", BEN: "BJ",
  BTN: "BT", BOL: "BO", BIH: "BA", BWA: "BW", BRA: "BR", BRN: "BN", BGR: "BG", BFA: "BF",
  BDI: "BI", KHM: "KH", CMR: "CM", CAN: "CA", CPV: "CV", CAF: "CF", TCD: "TD", CHL: "CL",
  CHN: "CN", COL: "CO", COM: "KM", COG: "CG", COD: "CD", CRI: "CR", CIV: "CI", HRV: "HR",
  CUB: "CU", CYP: "CY", CZE: "CZ", DNK: "DK", DJI: "DJ", DMA: "DM", DOM: "DO", ECU: "EC",
  EGY: "EG", SLV: "SV", GNQ: "GQ", ERI: "ER", EST: "EE", SWZ: "SZ", ETH: "ET", FJI: "FJ",
  FIN: "FI", FRA: "FR", GAB: "GA", GMB: "GM", GEO: "GE", DEU: "DE", GHA: "GH", GRC: "GR",
  GRD: "GD", GTM: "GT", GIN: "GN", GNB: "GW", GUY: "GY", HTI: "HT", HND: "HN", HUN: "HU",
  ISL: "IS", IND: "IN", IDN: "ID", IRN: "IR", IRQ: "IQ", IRL: "IE", ISR: "IL", ITA: "IT",
  JAM: "JM", JPN: "JP", JOR: "JO", KAZ: "KZ", KEN: "KE", KWT: "KW", KGZ: "KG", LAO: "LA",
  LVA: "LV", LBN: "LB", LSO: "LS", LBR: "LR", LBY: "LY", LIE: "LI", LTU: "LT", LUX: "LU",
  MDG: "MG", MWI: "MW", MYS: "MY", MDV: "MV", MLI: "ML", MLT: "MT", MRT: "MR", MUS: "MU",
  MEX: "MX", MDA: "MD", MCO: "MC", MNG: "MN", MNE: "ME", MAR: "MA", MOZ: "MZ", MMR: "MM",
  NAM: "NA", NPL: "NP", NLD: "NL", NZL: "NZ", NIC: "NI", NER: "NE", NGA: "NG", MKD: "MK",
  NOR: "NO", OMN: "OM", PAK: "PK", PSE: "PS", PAN: "PA", PNG: "PG", PRY: "PY", PER: "PE",
  PHL: "PH", POL: "PL", PRT: "PT", QAT: "QA", ROU: "RO", RUS: "RU", RWA: "RW", SAU: "SA",
  SEN: "SN", SRB: "RS", SYC: "SC", SLE: "SL", SGP: "SG", SVK: "SK", SVN: "SI", SOM: "SO",
  ZAF: "ZA", SSD: "SS", ESP: "ES", LKA: "LK", SDN: "SD", SUR: "SR", SWE: "SE", CHE: "CH",
  SYR: "SY", TWN: "TW", TJK: "TJ", TZA: "TZ", THA: "TH", TLS: "TL", TGO: "TG", TON: "TO",
  TTO: "TT", TUN: "TN", TUR: "TR", TKM: "TM", UGA: "UG", UKR: "UA", ARE: "AE", GBR: "GB",
  USA: "US", URY: "UY", UZB: "UZ", VEN: "VE", VNM: "VN", YEM: "YE", ZMB: "ZM", ZWE: "ZW",
};

export type PresetCountry = {
  name: string;
  code: string; // ISO 2-letter
  code3: string; // ISO 3-letter
  flag: string;
  currency: string;
  timezone: string;
  phoneCode: string;
  workflowType: "GENERAL" | "KSA" | "DUBAI" | "EUROPE";
  aliases?: string[];
};

export const PRESET_COUNTRIES: PresetCountry[] = [
  // Gulf / Middle East
  { name: "Saudi Arabia", code: "SA", code3: "KSA", flag: "🇸🇦", currency: "SAR", timezone: "Asia/Riyadh", phoneCode: "+966", workflowType: "KSA", aliases: ["ksa", "saudi", "riyadh"] },
  { name: "Dubai", code: "AE", code3: "UAE", flag: "🇦🇪", currency: "AED", timezone: "Asia/Dubai", phoneCode: "+971", workflowType: "DUBAI", aliases: ["uae", "united arab emirates", "abu dhabi"] },
  { name: "Qatar", code: "QA", code3: "QAT", flag: "🇶🇦", currency: "QAR", timezone: "Asia/Qatar", phoneCode: "+974", workflowType: "GENERAL", aliases: ["doha"] },
  { name: "Kuwait", code: "KW", code3: "KWT", flag: "🇰🇼", currency: "KWD", timezone: "Asia/Kuwait", phoneCode: "+965", workflowType: "GENERAL" },
  { name: "Oman", code: "OM", code3: "OMN", flag: "🇴🇲", currency: "OMR", timezone: "Asia/Muscat", phoneCode: "+968", workflowType: "KSA" },
  { name: "Bahrain", code: "BH", code3: "BHR", flag: "🇧🇭", currency: "BHD", timezone: "Asia/Bahrain", phoneCode: "+973", workflowType: "GENERAL", aliases: ["manama"] },
  { name: "Jordan", code: "JO", code3: "JOR", flag: "🇯🇴", currency: "JOD", timezone: "Asia/Amman", phoneCode: "+962", workflowType: "GENERAL" },
  { name: "Egypt", code: "EG", code3: "EGY", flag: "🇪🇬", currency: "EGP", timezone: "Africa/Cairo", phoneCode: "+20", workflowType: "GENERAL" },

  // Asia / Southeast Asia
  { name: "Singapore", code: "SG", code3: "SGP", flag: "🇸🇬", currency: "SGD", timezone: "Asia/Singapore", phoneCode: "+65", workflowType: "GENERAL" },
  { name: "Malaysia", code: "MY", code3: "MYS", flag: "🇲🇾", currency: "MYR", timezone: "Asia/Kuala_Lumpur", phoneCode: "+60", workflowType: "GENERAL" },
  { name: "Japan", code: "JP", code3: "JPN", flag: "🇯🇵", currency: "JPY", timezone: "Asia/Tokyo", phoneCode: "+81", workflowType: "GENERAL" },
  { name: "South Korea", code: "KR", code3: "KOR", flag: "🇰🇷", currency: "KRW", timezone: "Asia/Seoul", phoneCode: "+82", workflowType: "GENERAL", aliases: ["korea"] },
  { name: "Maldives", code: "MV", code3: "MDV", flag: "🇲🇻", currency: "MVR", timezone: "Indian/Maldives", phoneCode: "+960", workflowType: "GENERAL" },
  { name: "Bangladesh", code: "BD", code3: "BGD", flag: "🇧🇩", currency: "BDT", timezone: "Asia/Dhaka", phoneCode: "+880", workflowType: "GENERAL" },
  { name: "India", code: "IN", code3: "IND", flag: "🇮🇳", currency: "INR", timezone: "Asia/Kolkata", phoneCode: "+91", workflowType: "GENERAL" },
  { name: "Pakistan", code: "PK", code3: "PAK", flag: "🇵🇰", currency: "PKR", timezone: "Asia/Karachi", phoneCode: "+92", workflowType: "GENERAL" },
  { name: "Sri Lanka", code: "LK", code3: "LKA", flag: "🇱🇰", currency: "LKR", timezone: "Asia/Colombo", phoneCode: "+94", workflowType: "GENERAL" },
  { name: "Nepal", code: "NP", code3: "NPL", flag: "🇳🇵", currency: "NPR", timezone: "Asia/Kathmandu", phoneCode: "+977", workflowType: "GENERAL" },
  { name: "Philippines", code: "PH", code3: "PHL", flag: "🇵🇭", currency: "PHP", timezone: "Asia/Manila", phoneCode: "+63", workflowType: "GENERAL" },
  { name: "Indonesia", code: "ID", code3: "IDN", flag: "🇮🇩", currency: "IDR", timezone: "Asia/Jakarta", phoneCode: "+62", workflowType: "GENERAL" },
  { name: "Thailand", code: "TH", code3: "THA", flag: "🇹🇭", currency: "THB", timezone: "Asia/Bangkok", phoneCode: "+66", workflowType: "GENERAL" },
  { name: "Vietnam", code: "VN", code3: "VNM", flag: "🇻🇳", currency: "VND", timezone: "Asia/Ho_Chi_Minh", phoneCode: "+84", workflowType: "GENERAL" },
  { name: "China", code: "CN", code3: "CHN", flag: "🇨🇳", currency: "CNY", timezone: "Asia/Shanghai", phoneCode: "+86", workflowType: "GENERAL" },
  { name: "Hong Kong", code: "HK", code3: "HKG", flag: "🇭🇰", currency: "HKD", timezone: "Asia/Hong_Kong", phoneCode: "+852", workflowType: "GENERAL" },

  // Europe
  { name: "Russia", code: "RU", code3: "RUS", flag: "🇷🇺", currency: "RUB", timezone: "Europe/Moscow", phoneCode: "+7", workflowType: "EUROPE", aliases: ["russian federation", "moscow"] },
  { name: "Romania", code: "RO", code3: "ROU", flag: "🇷🇴", currency: "RON", timezone: "Europe/Bucharest", phoneCode: "+40", workflowType: "EUROPE" },
  { name: "Poland", code: "PL", code3: "POL", flag: "🇵🇱", currency: "PLN", timezone: "Europe/Warsaw", phoneCode: "+48", workflowType: "EUROPE" },
  { name: "Croatia", code: "HR", code3: "HRV", flag: "🇭🇷", currency: "EUR", timezone: "Europe/Zagreb", phoneCode: "+385", workflowType: "EUROPE" },
  { name: "Italy", code: "IT", code3: "ITA", flag: "🇮🇹", currency: "EUR", timezone: "Europe/Rome", phoneCode: "+39", workflowType: "EUROPE" },
  { name: "Portugal", code: "PT", code3: "PRT", flag: "🇵🇹", currency: "EUR", timezone: "Europe/Lisbon", phoneCode: "+351", workflowType: "EUROPE" },
  { name: "Germany", code: "DE", code3: "DEU", flag: "🇩🇪", currency: "EUR", timezone: "Europe/Berlin", phoneCode: "+49", workflowType: "EUROPE" },
  { name: "United Kingdom", code: "GB", code3: "GBR", flag: "🇬🇧", currency: "GBP", timezone: "Europe/London", phoneCode: "+44", workflowType: "EUROPE", aliases: ["uk", "england", "britain"] },
  { name: "France", code: "FR", code3: "FRA", flag: "🇫🇷", currency: "EUR", timezone: "Europe/Paris", phoneCode: "+33", workflowType: "EUROPE" },
  { name: "Spain", code: "ES", code3: "ESP", flag: "🇪🇸", currency: "EUR", timezone: "Europe/Madrid", phoneCode: "+34", workflowType: "EUROPE" },
  { name: "Greece", code: "GR", code3: "GRC", flag: "🇬🇷", currency: "EUR", timezone: "Europe/Athens", phoneCode: "+30", workflowType: "EUROPE" },
  { name: "Cyprus", code: "CY", code3: "CYP", flag: "🇨🇾", currency: "EUR", timezone: "Asia/Nicosia", phoneCode: "+357", workflowType: "EUROPE" },
  { name: "Malta", code: "MT", code3: "MLT", flag: "🇲🇹", currency: "EUR", timezone: "Europe/Malta", phoneCode: "+356", workflowType: "EUROPE" },
  { name: "Bulgaria", code: "BG", code3: "BGR", flag: "🇧🇬", currency: "BGN", timezone: "Europe/Sofia", phoneCode: "+359", workflowType: "EUROPE" },
  { name: "Hungary", code: "HU", code3: "HUN", flag: "🇭🇺", currency: "HUF", timezone: "Europe/Budapest", phoneCode: "+36", workflowType: "EUROPE" },
  { name: "Czech Republic", code: "CZ", code3: "CZE", flag: "🇨🇿", currency: "CZK", timezone: "Europe/Prague", phoneCode: "+420", workflowType: "EUROPE", aliases: ["czechia"] },
  { name: "Slovakia", code: "SK", code3: "SVK", flag: "🇸🇰", currency: "EUR", timezone: "Europe/Bratislava", phoneCode: "+421", workflowType: "EUROPE" },
  { name: "Serbia", code: "RS", code3: "SRB", flag: "🇷🇸", currency: "RSD", timezone: "Europe/Belgrade", phoneCode: "+381", workflowType: "EUROPE" },
  { name: "Lithuania", code: "LT", code3: "LTU", flag: "🇱🇹", currency: "EUR", timezone: "Europe/Vilnius", phoneCode: "+370", workflowType: "EUROPE" },
  { name: "Latvia", code: "LV", code3: "LVA", flag: "🇱🇻", currency: "EUR", timezone: "Europe/Riga", phoneCode: "+371", workflowType: "EUROPE" },
  { name: "Estonia", code: "EE", code3: "EST", flag: "🇪🇪", currency: "EUR", timezone: "Europe/Tallinn", phoneCode: "+372", workflowType: "EUROPE" },
  { name: "Albania", code: "AL", code3: "ALB", flag: "🇦🇱", currency: "ALL", timezone: "Europe/Tirane", phoneCode: "+355", workflowType: "EUROPE" },
  { name: "Netherlands", code: "NL", code3: "NLD", flag: "🇳🇱", currency: "EUR", timezone: "Europe/Amsterdam", phoneCode: "+31", workflowType: "EUROPE", aliases: ["holland"] },
  { name: "Belgium", code: "BE", code3: "BEL", flag: "🇧🇪", currency: "EUR", timezone: "Europe/Brussels", phoneCode: "+32", workflowType: "EUROPE" },
  { name: "Sweden", code: "SE", code3: "SWE", flag: "🇸🇪", currency: "SEK", timezone: "Europe/Stockholm", phoneCode: "+46", workflowType: "EUROPE" },
  { name: "Norway", code: "NO", code3: "NOR", flag: "🇳🇴", currency: "NOK", timezone: "Europe/Oslo", phoneCode: "+47", workflowType: "EUROPE" },
  { name: "Finland", code: "FI", code3: "FIN", flag: "🇫🇮", currency: "EUR", timezone: "Europe/Helsinki", phoneCode: "+358", workflowType: "EUROPE" },
  { name: "Denmark", code: "DK", code3: "DNK", flag: "🇩🇰", currency: "DKK", timezone: "Europe/Copenhagen", phoneCode: "+45", workflowType: "EUROPE" },
  { name: "Ireland", code: "IE", code3: "IRL", flag: "🇮🇪", currency: "EUR", timezone: "Europe/Dublin", phoneCode: "+353", workflowType: "EUROPE" },
  { name: "Switzerland", code: "CH", code3: "CHE", flag: "🇨🇭", currency: "CHF", timezone: "Europe/Zurich", phoneCode: "+41", workflowType: "EUROPE" },
  { name: "Austria", code: "AT", code3: "AUT", flag: "🇦🇹", currency: "EUR", timezone: "Europe/Vienna", phoneCode: "+43", workflowType: "EUROPE" },
  { name: "Turkey", code: "TR", code3: "TUR", flag: "🇹🇷", currency: "TRY", timezone: "Europe/Istanbul", phoneCode: "+90", workflowType: "EUROPE", aliases: ["turkiye"] },

  // Americas & Oceania
  { name: "United States", code: "US", code3: "USA", flag: "🇺🇸", currency: "USD", timezone: "America/New_York", phoneCode: "+1", workflowType: "GENERAL", aliases: ["usa", "america"] },
  { name: "Canada", code: "CA", code3: "CAN", flag: "🇨🇦", currency: "CAD", timezone: "America/Toronto", phoneCode: "+1", workflowType: "GENERAL" },
  { name: "Australia", code: "AU", code3: "AUS", flag: "🇦🇺", currency: "AUD", timezone: "Australia/Sydney", phoneCode: "+61", workflowType: "GENERAL" },
  { name: "New Zealand", code: "NZ", code3: "NZL", flag: "🇳🇿", currency: "NZD", timezone: "Pacific/Auckland", phoneCode: "+64", workflowType: "GENERAL" },
  { name: "Brazil", code: "BR", code3: "BRA", flag: "🇧🇷", currency: "BRL", timezone: "America/Sao_Paulo", phoneCode: "+55", workflowType: "GENERAL" },

  // Other / Global
  { name: "Other", code: "OTHER", code3: "OTHER", flag: "🌐", currency: "USD", timezone: "Asia/Dhaka", phoneCode: "", workflowType: "GENERAL", aliases: ["other country", "others", "global"] },
];

import { countries as npmCountries } from "countries-list";

// Popular flags for quick 1-click selection
export const POPULAR_FLAGS = [
  { flag: "🇸🇦", label: "Saudi Arabia", code: "SA" },
  { flag: "🇦🇪", label: "Dubai / UAE", code: "AE" },
  { flag: "🇶🇦", label: "Qatar", code: "QA" },
  { flag: "🇰🇼", label: "Kuwait", code: "KW" },
  { flag: "🇴🇲", label: "Oman", code: "OM" },
  { flag: "🇧🇭", label: "Bahrain", code: "BH" },
  { flag: "🇲🇾", label: "Malaysia", code: "MY" },
  { flag: "🇸🇬", label: "Singapore", code: "SG" },
  { flag: "🇷🇺", label: "Russia", code: "RU" },
  { flag: "🇷🇴", label: "Romania", code: "RO" },
  { flag: "🇮🇹", label: "Italy", code: "IT" },
  { flag: "🇵🇱", label: "Poland", code: "PL" },
  { flag: "🇭🇷", label: "Croatia", code: "HR" },
  { flag: "🇯🇵", label: "Japan", code: "JP" },
  { flag: "🇩🇪", label: "Germany", code: "DE" },
  { flag: "🇬🇧", label: "UK", code: "GB" },
  { flag: "🇺🇸", label: "USA", code: "US" },
  { flag: "🇨🇦", label: "Canada", code: "CA" },
  { flag: "🇲🇻", label: "Maldives", code: "MV" },
  { flag: "🌐", label: "Other / Global", code: "OTHER" },
];

/**
 * Converts a 2-letter ISO country code (e.g. 'RU', 'SA') to its corresponding emoji flag.
 */
export function iso2ToEmojiFlag(alpha2: string): string | null {
  const code = (alpha2 || "").trim().toUpperCase();
  if (code.length === 2 && /^[A-Z]{2}$/.test(code)) {
    return String.fromCodePoint(...[...code].map((char) => 127397 + char.charCodeAt(0)));
  }
  return null;
}

/**
 * Complete database of 250+ world countries combining recruitment presets and npm countries-list.
 */
export const ALL_WORLD_COUNTRIES: PresetCountry[] = (() => {
  const list: PresetCountry[] = [...PRESET_COUNTRIES];
  const seenNames = new Set(list.map((c) => c.name.toLowerCase()));
  const seenCodes = new Set(list.map((c) => c.code.toUpperCase()));

  Object.entries(npmCountries).forEach(([alpha2, data]: [string, any]) => {
    const code = alpha2.toUpperCase();
    if (seenCodes.has(code) || seenNames.has(data.name.toLowerCase())) return;
    seenCodes.add(code);
    seenNames.add(data.name.toLowerCase());

    const flag = iso2ToEmojiFlag(code) || "🌐";
    const currency = Array.isArray(data.currency) ? (data.currency[0] || "USD") : (data.currency || "USD");
    const phone = data.phone ? (Array.isArray(data.phone) ? "+" + data.phone[0] : "+" + data.phone) : "";
    const workflowType =
      code === "SA" ? "KSA" :
      code === "AE" ? "DUBAI" :
      data.continent === "EU" ? "EUROPE" : "GENERAL";

    list.push({
      name: data.name,
      code,
      code3: code,
      flag,
      currency,
      timezone: "UTC",
      phoneCode: phone,
      workflowType,
      aliases: Array.isArray(data.alias) ? data.alias : [],
    });
  });

  return list;
})();

/**
 * Universal flag resolver: handles explicit flags, 2-letter codes, 3-letter codes, and country names.
 */
export function resolveCountryFlagEmoji(code?: string | null, name?: string | null, explicitFlag?: string | null): string {
  if (explicitFlag && explicitFlag.trim()) {
    return explicitFlag.trim();
  }

  const cClean = (code || "").trim().toUpperCase();
  const nClean = (name || "").trim().toLowerCase();

  // 1. Direct 2-letter code
  const fromIso2 = iso2ToEmojiFlag(cClean);
  if (fromIso2) return fromIso2;

  // 2. 3-letter code lookup
  if (ALPHA3_TO_ALPHA2[cClean]) {
    const a2 = ALPHA3_TO_ALPHA2[cClean];
    if (a2 === "OTHER") return "🌐";
    const converted = iso2ToEmojiFlag(a2);
    if (converted) return converted;
  }

  // 3. Name lookup in ALL_WORLD_COUNTRIES
  if (nClean) {
    const foundPreset = ALL_WORLD_COUNTRIES.find((p) => {
      if (p.name.toLowerCase() === nClean) return true;
      if (p.code.toLowerCase() === nClean) return true;
      if (p.code3.toLowerCase() === nClean) return true;
      if (p.aliases?.some((a) => a.toLowerCase() === nClean || nClean.includes(a.toLowerCase()))) return true;
      return false;
    });

    if (foundPreset) return foundPreset.flag;

    // Fuzzy contains checks for common names
    if (nClean.includes("russia")) return "🇷🇺";
    if (nClean.includes("saudi")) return "🇸🇦";
    if (nClean.includes("dubai") || nClean.includes("emirates")) return "🇦🇪";
    if (nClean.includes("qatar")) return "🇶🇦";
    if (nClean.includes("kuwait")) return "🇰🇼";
    if (nClean.includes("oman")) return "🇴🇲";
    if (nClean.includes("bahrain")) return "🇧🇭";
    if (nClean.includes("singapore")) return "🇸🇬";
    if (nClean.includes("malaysia")) return "🇲🇾";
    if (nClean.includes("romania")) return "🇷🇴";
    if (nClean.includes("italy")) return "🇮🇹";
    if (nClean.includes("poland")) return "🇵🇱";
    if (nClean.includes("croatia")) return "🇭🇷";
    if (nClean.includes("japan")) return "🇯🇵";
    if (nClean.includes("korea")) return "🇰🇷";
    if (nClean.includes("china")) return "🇨🇳";
    if (nClean.includes("germany")) return "🇩🇪";
    if (nClean.includes("france")) return "🇫🇷";
    if (nClean.includes("spain")) return "🇪🇸";
    if (nClean.includes("portugal")) return "🇵🇹";
    if (nClean.includes("canada")) return "🇨🇦";
    if (nClean.includes("maldives")) return "🇲🇻";
    if (nClean.includes("turkey") || nClean.includes("turkiye")) return "🇹🇷";
    if (nClean.includes("egypt")) return "🇪🇬";
    if (nClean.includes("jordan")) return "🇯🇴";
    if (nClean.includes("bangladesh")) return "🇧🇩";
    if (nClean.includes("india")) return "🇮🇳";
    if (nClean.includes("pakistan")) return "🇵🇰";
    if (nClean.includes("philippines")) return "🇵🇭";
    if (nClean.includes("vietnam")) return "🇻🇳";
    if (nClean.includes("thailand")) return "🇹🇭";
    if (nClean.includes("other")) return "🌐";
  }

  return "🌐";
}
