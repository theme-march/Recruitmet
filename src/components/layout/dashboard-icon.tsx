/* Original SVG exports from Figma node 5:3183. Keep their intrinsic geometry. */
const assets = {
  WindowControls: ["8b690.svg", 60, 12],
  Search: ["3cade.svg", 15, 15],
  LayoutDashboard: ["7066b.svg", 14, 14],
  Users: ["d16a3.svg", 12, 12],
  Handshake: ["d65d8.svg", 12, 12],
  Contact: ["8d3bf.svg", 12, 12],
  Wallet: ["e2dac.svg", 12, 12],
  Files: ["ffbf3.svg", 12, 12],
  Globe: ["a240f.svg", 12, 12],
  Database: ["1d875.svg", 12, 12],
  ShieldCheck: ["52b7d.svg", 12, 12],
  GraduationCap: ["7c5f8.svg", 12, 12],
  ChevronDown: ["f43d8.svg", 12, 12],
  ConnectionIndicator: ["8e6cf.svg", 7, 7],
  PanelLeft: ["84492.svg", 18, 18],
  Search1: ["9012c.svg", 18, 18],
  Settings: ["e7a86.svg", 18, 18],
  Bell: ["7d32c.svg", 18, 18],
  LogOut: ["5dcc7.svg", 18, 18],
  LiveIndicator: ["c999b.svg", 6, 6],
  CreditCard: ["b84f0.svg", 15, 15],
  FileCheck: ["dfa09.svg", 15, 15],
  Plus: ["2e715.svg", 15, 15],
  Users1: ["6ed65.svg", 18, 18],
  Wallet1: ["35d69.svg", 18, 18],
  FileCheck1: ["de4b6.svg", 18, 18],
  Plane: ["a5a6a.svg", 18, 18],
  PhoneIncoming: ["af448.svg", 14, 14],
  Layers: ["14630.svg", 14, 14],
  CalendarDays: ["6f619.svg", 14, 14],
  ChevronRight: ["ccbcc.svg", 12, 12],
  Phone: ["8293d.svg", 13, 13],
} as const;

export type DashboardIconName = keyof typeof assets;

export function DashboardIcon({ name, className }: { name: DashboardIconName; className?: string }) {
  const [file, width, height] = assets[name];
  return <img src={`/figma/dashboard/${file}`} alt="" aria-hidden="true" width={width} height={height} className={className} />;
}

export function DashboardBrandMark() {
  return <span className="dashboard-brand-tiles" aria-hidden="true">{Array.from({ length: 16 }, (_, index) => <i key={index} className={index < 12 && index % 4 < 3 - Math.floor(index / 4) ? "green" : "blue"} />)}</span>;
}

