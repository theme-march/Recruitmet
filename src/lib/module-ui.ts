export type ModuleField = {
  name: string;
  label: string;
  type?: "text" | "date" | "datetime-local" | "number" | "url" | "textarea" | "select";
  required?: boolean;
  placeholder?: string;
  options?: string[];
  wide?: boolean;
};

export type Resource = "lead" | "candidate" | "interviewSchedule" | "file" | "payment" | "document" | "flight" | "exception" | "notification" | "master" | "demand" | "tutorial";

const leadFields: ModuleField[] = [
  { name: "fullName", label: "Full name", required: true },
  { name: "phone", label: "Primary phone", required: true },
  { name: "alternatePhone", label: "Alternate phone" },
  { name: "country", label: "Interested country" },
  { name: "profession", label: "Work category / profession" },
  { name: "subCategory", label: "Work sub-category" },
  { name: "company", label: "Interested company" },
  { name: "source", label: "Call source", type: "select", options: ["Direct", "Facebook", "WhatsApp", "Referral", "Walk-in", "Website"] },
  { name: "purpose", label: "Call purpose", type: "select", options: ["Overseas Employment", "Interview", "Document Follow-up", "Payment Follow-up", "General Query"] },
  { name: "interviewOption", label: "Interview option", type: "select", options: ["Interested", "Not Interested", "Schedule Interview", "Call Back"] },
  { name: "date", label: "Follow-up / interview date", type: "datetime-local" },
  { name: "priority", label: "Priority", type: "select", options: ["1", "2", "3", "4", "5"] },
  { name: "notes", label: "Call notes", type: "textarea", wide: true },
];

const candidateFields: ModuleField[] = [
  { name: "fullName", label: "Full name", required: true }, { name: "phone", label: "Primary phone", required: true },
  { name: "alternatePhone", label: "Alternate phone" }, { name: "passportNo", label: "Passport number" },
  { name: "nationalId", label: "National ID / birth registration" }, { name: "dateOfBirth", label: "Date of birth", type: "date" },
  { name: "country", label: "Destination country" }, { name: "profession", label: "Profession / category" },
  { name: "company", label: "Company / demand" }, { name: "source", label: "Registration source" },
  { name: "address", label: "Present address", type: "textarea", wide: true },
];

const scheduleFields: ModuleField[] = [
  { name: "title", label: "Interview title", required: true }, { name: "scheduledAt", label: "Schedule date & time", type: "datetime-local", required: true },
  { name: "company", label: "Company" }, { name: "profession", label: "Profession / category" },
  { name: "interviewer", label: "Interviewer / officer" }, { name: "capacity", label: "Candidate capacity", type: "number", required: true },
  { name: "venue", label: "Venue" }, { name: "meetingUrl", label: "Online meeting URL", type: "url" },
  { name: "instructions", label: "Instructions", type: "textarea", wide: true },
];

export const resourceFields: Record<Resource, ModuleField[]> = {
  lead: leadFields,
  candidate: candidateFields,
  interviewSchedule: scheduleFields,
  file: [{ name: "candidate", label: "Candidate ID / passport / phone", required: true }, { name: "country", label: "Destination country", required: true }, { name: "stage", label: "Opening stage" }, { name: "profession", label: "Profession" }, { name: "company", label: "Company" }],
  payment: [{ name: "fileNo", label: "File number", required: true }, { name: "type", label: "Payment type", type: "select", options: ["First Payment", "Second Payment", "Service Charge", "Document Fee", "Ticket Fee", "Refund"] }, { name: "invoiceNo", label: "Invoice number" }, { name: "amount", label: "Amount", type: "number", required: true }, { name: "currency", label: "Currency", placeholder: "BDT" }, { name: "method", label: "Method", type: "select", options: ["Cash", "Bank Transfer", "Mobile Banking", "Card"] }, { name: "reference", label: "Transaction / receipt reference" }, { name: "dueDate", label: "Due date", type: "date" }, { name: "collectedAt", label: "Collection date", type: "date" }, { name: "note", label: "Payment remarks", type: "textarea", wide: true }],
  document: [{ name: "fileNo", label: "File number", required: true }, { name: "type", label: "Document type", type: "select", required: true, options: ["Passport", "Medical", "MOFA", "Takamul", "Police Clearance", "Visa", "Flight Ticket", "NID", "Photo", "Contract"] }, { name: "number", label: "Document number" }, { name: "fileName", label: "File name / storage URL" }, { name: "issueDate", label: "Issue date", type: "date" }, { name: "date", label: "Expiry date", type: "date" }, { name: "remarks", label: "Collection / verification remarks", type: "textarea", wide: true }],
  flight: [{ name: "flightNo", label: "Flight number", required: true }, { name: "airline", label: "Airline", required: true }, { name: "pnr", label: "PNR" }, { name: "date", label: "Departure", type: "datetime-local", required: true }, { name: "arrivalAt", label: "Arrival", type: "datetime-local" }, { name: "from", label: "Departure airport", placeholder: "DAC" }, { name: "country", label: "Destination", required: true }],
  exception: [{ name: "fileNo", label: "File number", required: true }, { name: "type", label: "Action", type: "select", options: ["Hold", "Return"] }, { name: "reason", label: "Reason", required: true }, { name: "expectedRelease", label: "Expected release / resolution", type: "date" }, { name: "financialImpact", label: "Financial impact", type: "number" }, { name: "note", label: "Mandatory comment", type: "textarea", required: true, wide: true }],
  notification: [{ name: "recipient", label: "Recipient user / role / group", required: true }, { name: "title", label: "Title", required: true }, { name: "message", label: "Message", type: "textarea", required: true, wide: true }, { name: "type", label: "Type" }, { name: "priority", label: "Priority", type: "select", options: ["Low", "Normal", "High", "Urgent"] }, { name: "channel", label: "Channel", type: "select", options: ["In-app", "Email", "SMS", "WhatsApp"] }],
  master: [{ name: "type", label: "Master data type", required: true }, { name: "code", label: "Code", required: true }, { name: "name", label: "Name", required: true }, { name: "country", label: "Country" }, { name: "description", label: "Description", type: "textarea", wide: true }],
  demand: [{ name: "companyCode", label: "Company code", required: true }, { name: "title", label: "Work / demand title", required: true }, { name: "country", label: "Country", required: true }, { name: "profession", label: "Profession", required: true }, { name: "quantity", label: "Required quantity", type: "number", required: true }, { name: "salary", label: "Salary", type: "number" }, { name: "currency", label: "Currency", placeholder: "SAR" }, { name: "visaQuantity", label: "Visa quantity", type: "number" }, { name: "commissionPerFile", label: "Commission per file", type: "number" }, { name: "deadline", label: "Deadline", type: "date" }],
  tutorial: [{ name: "categoryCode", label: "Category code", required: true }, { name: "title", label: "Tutorial title", required: true }, { name: "description", label: "Description", type: "textarea", wide: true }, { name: "type", label: "Resource type", type: "select", options: ["Video", "PDF", "Article", "Link"] }, { name: "resourceUrl", label: "Resource URL", type: "url", required: true }, { name: "audience", label: "Audience" }, { name: "language", label: "Language", placeholder: "Bangla" }, { name: "durationMin", label: "Duration (minutes)", type: "number" }],
};

export function resourceForModule(moduleId: string, tab: string): Resource {
  if (moduleId === "call-center") return "lead";
  if (moduleId === "registration") return /Interview/.test(tab) && !/History|People/.test(tab) ? "interviewSchedule" : "candidate";
  if (moduleId === "files" || ["ksa", "dubai", "other-country"].includes(moduleId)) return "file";
  if (moduleId === "accounts") return "payment";
  if (moduleId === "documents") return "document";
  if (moduleId === "flights") return "flight";
  if (moduleId === "exceptions") return "exception";
  if (moduleId === "notifications") return "notification";
  if (moduleId === "partners" && tab === "Works & Demands") return "demand";
  if (moduleId === "tutorials") return "tutorial";
  return "master";
}

export const moduleFilterFields: Record<string, ModuleField[]> = {
  "call-center": [{ name: "identity", label: "Name / phone / lead no." }, { name: "callStatus", label: "Call status", type: "select", options: ["New", "Interested", "Not Interested", "Follow-up", "Converted", "Closed"] }, { name: "priority", label: "Priority", type: "select", options: ["1", "2", "3", "4", "5"] }, { name: "officer", label: "Officer" }, { name: "followUpFrom", label: "Follow-up from", type: "date" }, { name: "followUpTo", label: "Follow-up to", type: "date" }],
  registration: [{ name: "identity", label: "Name / phone / passport" }, { name: "country", label: "Destination country" }, { name: "profession", label: "Profession / category" }, { name: "interviewResult", label: "Interview status", type: "select", options: ["Scheduled", "Selected", "Rejected", "Absent", "Waiting"] }, { name: "entryFrom", label: "Registration from", type: "date" }, { name: "entryTo", label: "Registration to", type: "date" }],
  accounts: [{ name: "identity", label: "File / candidate / payment no." }, { name: "paymentStatus", label: "Payment status", type: "select", options: ["PENDING", "DUE", "PARTIAL", "PAID", "OVERDUE", "FAILED", "REFUNDED"] }, { name: "paymentMethod", label: "Payment method", type: "select", options: ["Cash", "Bank Transfer", "Mobile Banking", "Card"] }, { name: "amountFrom", label: "Amount from" }, { name: "amountTo", label: "Amount to" }, { name: "entryFrom", label: "Collection from", type: "date" }, { name: "entryTo", label: "Collection to", type: "date" }],
  documents: [{ name: "identity", label: "File / candidate / document no." }, { name: "documentType", label: "Document type" }, { name: "documentStatus", label: "Verification status", type: "select", options: ["PENDING", "UPLOADED", "VERIFIED", "REJECTED", "EXPIRED"] }, { name: "expiryFrom", label: "Expiry from", type: "date" }, { name: "expiryTo", label: "Expiry to", type: "date" }],
  flights: [{ name: "identity", label: "Flight / airline / PNR" }, { name: "flightStatus", label: "Flight status", type: "select", options: ["Scheduled", "Boarding", "Flown", "Cancelled"] }, { name: "departureFrom", label: "Departure from", type: "date" }, { name: "departureTo", label: "Departure to", type: "date" }, { name: "country", label: "Destination" }],
  partners: [{ name: "identity", label: "Company / demand / profession" }, { name: "country", label: "Country" }, { name: "entryFrom", label: "Deadline from", type: "date" }, { name: "entryTo", label: "Deadline to", type: "date" }],
  tutorials: [{ name: "identity", label: "Tutorial / category" }, { name: "tutorialType", label: "Resource type", type: "select", options: ["Video", "PDF", "Article", "Link"] }, { name: "language", label: "Language" }, { name: "tutorialStatus", label: "Status", type: "select", options: ["Draft", "Published", "Archived"] }],
};
