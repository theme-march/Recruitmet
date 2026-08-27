import {
  AlertOctagon,
  BellRing,
  Building2,
  Database,
  FolderGit2,
  Globe,
  GraduationCap,
  Handshake,
  Headphones,
  LayoutDashboard,
  Luggage,
  Plane,
  Receipt,
  SearchCheck,
  UserRoundCheck,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export type ModuleItem = { id: string; label: string };
export type AppModule = { id: string; label: string; icon: LucideIcon; items: ModuleItem[]; hidden?: boolean };

const list = (s: string) => s.split("|").map((label, i) => ({ id: `${i + 1}`, label }));

export const modules: AppModule[] = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard, items: list("Dashboard") },
  { id: "call-center", label: "Call Center", icon: Headphones, items: list("Create Work Call|Work Call List|Officer Dashboard|Registration & interviews") },
  { id: "ksa", label: "Saudi Arabia", icon: Globe, items: list("Candidates List") },
  { id: "dubai", label: "Dubai", icon: Building2, items: list("Candidates List") },
  { id: "other-country", label: "Other Country", icon: Plane, items: list("Candidates List") },
  { id: "office-vendor", label: "Office & Vendor", icon: Handshake, items: list("Works & Demands") },
  { id: "payment-collection", label: "Payment Collection", icon: Receipt, items: list("Payment Collect") },
  { id: "document", label: "Document", icon: FolderGit2, items: list("Dubai Document") },
  { id: "tutorials", label: "Tutorials", icon: GraduationCap, items: list("Tutorial Categories|Tutorials") },

  // Secondary aliases for backwards-compatibility
  { id: "registration", label: "Registration & Interview", icon: UserRoundCheck, items: list("Registration|Registered People|Interview|Interview Schedule|Upcoming Interview|Interview History|People|Profession Category"), hidden: true },
  { id: "accounts", label: "Accounts & Finance", icon: Receipt, items: list("First Payment|Second Payment|Refund & Reversal|Expense & Balance|Payment Invoices"), hidden: true },
  { id: "documents", label: "Document Management", icon: FolderGit2, items: list("Pending Documents|Completed Documents|Document Verification|Document History|Collect Documents"), hidden: true },
  { id: "flights", label: "Flight & Travel", icon: Luggage, items: list("Flight Schedule|Flight Done|Flight Cancelled|Airline Management"), hidden: true },
  { id: "partners", label: "Partners & Demands", icon: Handshake, items: list("Company Management|Works & Demands|Demand Allocations"), hidden: true },
  { id: "exceptions", label: "Exception Handling", icon: AlertOctagon, items: list("Hold Management|Return File Management|Re-process Approvals"), hidden: true },
  { id: "notifications", label: "Notification Center", icon: BellRing, items: list("Notifications|Internal Notifications|Follow-up Reminder|Interview Reminder"), hidden: true },
  { id: "master-data", label: "Master Data", icon: Database, items: list("Country List|Profession List|Stage Config|Medical Centers|Banks & Payment Channels"), hidden: true },
  { id: "common", label: "Common Services", icon: SearchCheck, items: list("Global Search|Advanced Filters|Pagination|CSV Export|CSV Import"), hidden: true },
];


export const getModule = (id: string) => modules.find((m) => m.id === id);
export const moduleItemSlug = (label: string) => label.toLowerCase().replace(/&/g, " and ").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
export const getModuleItemBySlug = (moduleId: string, slug: string) => getModule(moduleId)?.items.find((item) => moduleItemSlug(item.label) === slug);
export const moduleItemPath = (moduleId: string, label: string) => `/module/${moduleId}/${moduleItemSlug(label)}`;


