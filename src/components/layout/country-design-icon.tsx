/* Original Figma exports for the country candidates workspace (5:3303). */
const assets = {
  Refresh: ["06d4e.svg", 13, 13], Download: ["dd3e6.svg", 13, 13],
  Folder: ["7202f.svg", 16, 16], Medical: ["41c4c.svg", 16, 16],
  Visa: ["86934.svg", 16, 16], Manpower: ["2ecac.svg", 16, 16],
  Flight: ["5f30e.svg", 16, 16], Wallet: ["88cdd.svg", 16, 16],
  Search: ["ea4e6.svg", 13, 13], ChevronDown: ["223d4.svg", 10, 10],
  AgentOrange: ["4ff4e.svg", 6, 6], AgentPurple: ["9e6e7.svg", 6, 6], AgentGreen: ["c999b.svg", 6, 6],
} as const;
export function CountryDesignIcon({ name, className }: { name: keyof typeof assets; className?: string }) {
  const [file, width, height] = assets[name];
  return <img src={`/figma/country/${file}`} width={width} height={height} alt="" aria-hidden="true" className={className} />;
}
