export function normalizeHeader(h: string): string {
  const clean = h.trim().toLowerCase().replace(/[^a-z0-9]/g, "");
  if (["fullname", "name", "candidatename", "candidate"].includes(clean)) return "fullName";
  if (["givenname", "firstname"].includes(clean)) return "givenName";
  if (["surname", "lastname"].includes(clean)) return "surname";
  if (["phone", "phonenumber", "mobile", "mobilenumber", "contact", "contactnumber", "primaryphone", "primarymobile"].includes(clean)) return "phone";
  if (["additionalphone", "additionalphones", "alternatephone", "alternatephones", "secondaryphone"].includes(clean)) return "alternatePhones";
  if (["passportno", "passportnumber", "passport", "ppno", "passportnum"].includes(clean)) return "passportNo";
  if (["passportissuedate", "issuedate", "dateofissue", "ppissuedate"].includes(clean)) return "issueDate";
  if (["passportexpirydate", "expirydate", "dateofexpiry", "ppexpirydate", "expiry"].includes(clean)) return "expiryDate";
  if (["passportstatus", "statusofpassport"].includes(clean)) return "passportStatus";
  if (["nationalid", "nid", "nidnumber", "nationalidnumber", "nidno"].includes(clean)) return "nationalId";
  if (["profession", "trade", "skill", "job", "workcategory", "tradeorprofession", "tradeprofession", "expertin"].includes(clean)) return "profession";
  if (["preferredcountry", "targetcountry", "country", "destination", "destinationcountry"].includes(clean)) return "preferredCountry";
  if (["agent", "agentpartner", "agency", "source", "agentsource", "channelpartner", "agentagency", "agencypartner"].includes(clean)) return "source";
  if (["dateofbirth", "dob", "birthdate", "birth"].includes(clean)) return "dob";
  if (["gender", "sex"].includes(clean)) return "gender";
  if (["district", "city", "location", "presentdistrict"].includes(clean)) return "district";
  if (["address", "presentaddress"].includes(clean)) return "address";
  if (["permanentaddress", "passportaddress"].includes(clean)) return "permanentAddress";
  if (["fathername", "fathersname", "father"].includes(clean)) return "fatherName";
  if (["mothername", "mothersname", "mother"].includes(clean)) return "motherName";
  if (["placeofbirth", "birthplace", "issueplace"].includes(clean)) return "placeOfBirth";
  if (["nationality", "countryoforigin"].includes(clean)) return "nationality";
  if (["maritalstatus", "marital"].includes(clean)) return "maritalStatus";
  if (["education", "lasteducation", "highesteducation"].includes(clean)) return "education";
  if (["passingyear", "yearofpassing"].includes(clean)) return "passingYear";
  if (["experience", "yearsofexperience", "experienceyears"].includes(clean)) return "experience";
  if (["email", "emailaddress"].includes(clean)) return "email";
  if (["notes", "note", "remarks", "remark", "remarksnote", "remarknote", "comments", "comment", "workercomments"].includes(clean)) return "notes";
  return clean;
}

export function parseDateCell(val: unknown): string | undefined {
  if (!val) return undefined;
  if (val instanceof Date) {
    if (!isNaN(val.getTime())) {
      return val.toISOString().split("T")[0];
    }
    return undefined;
  }
  if (typeof val === "number") {
    // Excel serial date to JS Date
    const excelEpoch = new Date(Date.UTC(1899, 11, 30));
    const jsDate = new Date(excelEpoch.getTime() + val * 86400000);
    if (!isNaN(jsDate.getTime())) {
      return jsDate.toISOString().split("T")[0];
    }
    return undefined;
  }
  const str = String(val).trim();
  if (!str) return undefined;

  // YYYY-MM-DD
  if (/^\d{4}-\d{1,2}-\d{1,2}$/.test(str)) {
    const [y, m, d] = str.split("-");
    return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }
  // DD/MM/YYYY or DD-MM-YYYY
  const dmy = str.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (dmy) {
    const [, d, m, y] = dmy;
    return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }
  // Fallback ISO parse
  const parsed = new Date(str);
  if (!isNaN(parsed.getTime()) && parsed.getFullYear() > 1920 && parsed.getFullYear() < 2100) {
    return parsed.toISOString().split("T")[0];
  }
  return undefined;
}

export function parsePhoneCell(val: unknown): string {
  if (!val) return "";
  let clean = String(val).trim().replace(/[^0-9+]/g, "");
  // If Excel dropped leading 0 on Bangladeshi number (e.g. 1712448821)
  if (/^1[3-9]\d{8}$/.test(clean)) {
    clean = "0" + clean;
  }
  return clean;
}

export function normalizeCountry(val: string): string {
  const s = (val || "").trim();
  if (!s) return "Saudi Arabia";
  const low = s.toLowerCase();
  if (low.includes("saudi") || low === "sa" || low === "ksa") return "Saudi Arabia";
  if (low.includes("dubai") || low.includes("uae") || low.includes("emirates") || low === "ae") return "Dubai";
  if (low.includes("qatar") || low === "qa") return "Qatar";
  if (low.includes("oman") || low === "om") return "Oman";
  if (low.includes("kuwait") || low === "kw") return "Kuwait";
  if (low.includes("bahrain") || low === "bh") return "Bahrain";
  if (low.includes("malaysia") || low === "my") return "Malaysia";
  if (low.includes("singapore") || low === "sg") return "Singapore";
  if (low.includes("romania") || low === "ro") return "Romania";
  if (low.includes("malta") || low === "mt") return "Malta";
  return s;
}

export function normalizeGender(val: string): string | undefined {
  const s = (val || "").trim().toLowerCase();
  if (!s) return undefined;
  if (s.startsWith("m") || s === "male") return "Male";
  if (s.startsWith("f") || s === "female") return "Female";
  if (s.startsWith("o") || s === "other") return "Other";
  return val.trim();
}
