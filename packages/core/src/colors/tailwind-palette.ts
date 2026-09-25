import type { ScaleStep } from "../theme/types.ts";

// Official Tailwind CSS palette (v3/v4 identical values), hex per family/step.
// Source of truth for human-facing colour selection ("blue-600", not raw OKLCH).
const P = (s50: string, s100: string, s200: string, s300: string, s400: string, s500: string, s600: string, s700: string, s800: string, s900: string, s950: string): Record<ScaleStep, string> => ({
  "50": s50, "100": s100, "200": s200, "300": s300, "400": s400,
  "500": s500, "600": s600, "700": s700, "800": s800, "900": s900, "950": s950,
});

export const TAILWIND_PALETTE: Record<string, Record<ScaleStep, string>> = {
  red: P("#fef2f2","#fee2e2","#fecaca","#fca5a5","#f87171","#ef4444","#dc2626","#b91c1c","#991b1b","#7f1d1d","#450a0a"),
  orange: P("#fff7ed","#ffedd5","#fed7aa","#fdba74","#fb923c","#f97316","#ea580c","#c2410c","#9a3412","#7c2d12","#431407"),
  amber: P("#fffbeb","#fef3c7","#fde68a","#fcd34d","#fbbf24","#f59e0b","#d97706","#b45309","#92400e","#78350f","#451a03"),
  yellow: P("#fefce8","#fef9c3","#fef08a","#fde047","#facc15","#eab308","#ca8a04","#a16207","#854d0e","#713f12","#422006"),
  lime: P("#f7fee7","#ecfccb","#d9f99d","#bef264","#a3e635","#84cc16","#65a30d","#4d7c0f","#3f6212","#365314","#1a2e05"),
  green: P("#f0fdf4","#dcfce7","#bbf7d0","#86efac","#4ade80","#22c55e","#16a34a","#15803d","#166534","#14532d","#052e16"),
  teal: P("#f0fdfa","#ccfbf1","#99f6e4","#5eead4","#2dd4bf","#14b8a6","#0d9488","#0f766e","#115e59","#134e4a","#042f2e"),
  cyan: P("#ecfeff","#cffafe","#a5f3fc","#67e8f9","#22d3ee","#06b6d4","#0891b2","#0e7490","#155e75","#164e63","#083344"),
  blue: P("#eff6ff","#dbeafe","#bfdbfe","#93c5fd","#60a5fa","#3b82f6","#2563eb","#1d4ed8","#1e40af","#1e3a8a","#172554"),
  indigo: P("#eef2ff","#e0e7ff","#c7d2fe","#a5b4fc","#818cf8","#6366f1","#4f46e5","#4338ca","#3730a3","#312e81","#1e1b4b"),
  purple: P("#faf5ff","#f3e8ff","#e9d5ff","#d8b4fe","#c084fc","#a855f7","#9333ea","#7e22ce","#6b21a8","#581c87","#3b0764"),
  fuchsia: P("#fdf4ff","#fae8ff","#f5d0fe","#f0abfc","#e879f9","#d946ef","#c026d3","#a21caf","#86198f","#701a75","#4a044e"),
  pink: P("#fdf2f8","#fce7f3","#fbcfe8","#f9a8d4","#f472b6","#ec4899","#db2777","#be185d","#9d174d","#831843","#500724"),
  rose: P("#fff1f2","#ffe4e6","#fecdd3","#fda4af","#fb7185","#f43f5e","#e11d48","#be123c","#9f1239","#881337","#4c0519"),
  zinc: P("#fafafa","#f4f4f5","#e4e4e7","#d4d4d8","#a1a1aa","#71717a","#52525b","#3f3f46","#27272a","#18181b","#09090b"),
  neutral: P("#fafafa","#f5f5f5","#e5e5e5","#d4d4d4","#a3a3a3","#737373","#525252","#404040","#262626","#171717","#0a0a0a"),
};

export const PALETTE_FAMILIES = Object.keys(TAILWIND_PALETTE);

const NAME_RE = /^([a-z]+)-(50|100|200|300|400|500|600|700|800|900|950)$/;

export function isValidTailwindName(name: string): boolean {
  const m = NAME_RE.exec(name);
  if (!m) return false;
  return m[1] in TAILWIND_PALETTE;
}

export function resolveTailwindHex(name: string): string {
  const m = NAME_RE.exec(name);
  if (!m) throw new Error(`Invalid Tailwind colour name: "${name}". Expected e.g. "blue-600".`);
  const family = m[1];
  const step = m[2] as ScaleStep;
  const fam = TAILWIND_PALETTE[family];
  if (!fam) throw new Error(`Unknown colour family: "${family}".`);
  return fam[step];
}

export function listColorOptions(): { name: string; hex: string }[] {
  const out: { name: string; hex: string }[] = [];
  for (const fam of PALETTE_FAMILIES) {
    for (const step of ["50","100","200","300","400","500","600","700","800","900","950"] as ScaleStep[]) {
      out.push({ name: `${fam}-${step}`, hex: TAILWIND_PALETTE[fam][step] });
    }
  }
  return out;
}
