const assets = {
  Registered: ["d0f59", 16],
  Partners: ["a9c22", 16],
  Candidates: ["9a82b", 16],
  Pipeline: ["0172d", 16],
  Search: ["bfd64", 16],
  GrayDot: ["9e108", 8],
  BlueDot: ["4de0c", 8],
  OrangeDot: ["3097c", 8],
  GreenDot: ["ee1a8", 8],
  Trash: ["bb013", 16],
} as const;

export function AgentsDesignIcon({ name }: { name: keyof typeof assets }) {
  const [asset, size] = assets[name];
  // Preserve the geometry and colors of the original Figma SVG export.
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={`/figma/agents/${asset}.svg`} width={size} height={size} alt="" aria-hidden="true" />;
}
