import type { ThemeColors } from "./types.ts";
import { isValidTailwindName } from "../colors/tailwind-palette.ts";

export interface PresetTheme {
  name: string;
  label: string;
  blurb: string;
  colors: ThemeColors;
}

const traffic = {
  trafficStop: "red-600",
  trafficWarning: "amber-500",
  trafficOk: "green-600",
} as const;

export const PRESET_THEMES: PresetTheme[] = [
  {
    name: "ocean",
    label: "Ocean",
    blurb: "Deep sea blues with a cyan current",
    colors: {
      base: "cyan-50",
      alt: "blue-100",
      prose: "slate-900",
      accent: "cyan-600",
      brandPrimary: "blue-600",
      brandSecondary: "teal-500",
      ...traffic,
    },
  },
  {
    name: "sand",
    label: "Sand",
    blurb: "Warm dunes, baked amber brand",
    colors: {
      base: "amber-50",
      alt: "amber-100",
      prose: "neutral-900",
      accent: "orange-600",
      brandPrimary: "amber-600",
      brandSecondary: "orange-500",
      ...traffic,
    },
  },
  {
    name: "night",
    label: "Night",
    blurb: "Dark canvas, indigo glow",
    colors: {
      base: "slate-950",
      alt: "slate-900",
      prose: "slate-100",
      accent: "indigo-400",
      brandPrimary: "indigo-500",
      brandSecondary: "fuchsia-400",
      trafficStop: "red-400",
      trafficWarning: "amber-400",
      trafficOk: "green-400",
    },
  },
  {
    name: "cyber",
    label: "Cyber",
    blurb: "Black glass, neon signals",
    colors: {
      base: "neutral-950",
      alt: "neutral-900",
      prose: "neutral-100",
      accent: "fuchsia-500",
      brandPrimary: "fuchsia-500",
      brandSecondary: "cyan-400",
      trafficStop: "red-500",
      trafficWarning: "amber-400",
      trafficOk: "lime-400",
    },
  },
  {
    name: "jungle",
    label: "Jungle",
    blurb: "Canopy greens, lime light",
    colors: {
      base: "lime-50",
      alt: "green-100",
      prose: "green-950",
      accent: "green-600",
      brandPrimary: "green-700",
      brandSecondary: "lime-500",
      ...traffic,
    },
  },
];

/** Name of the preset whose colors match, or null when customized. */
export function matchPreset(colors: ThemeColors): string | null {
  for (const p of PRESET_THEMES) {
    if (
      (Object.keys(p.colors) as (keyof ThemeColors)[]).every((k) => p.colors[k] === colors[k])
    ) {
      return p.name;
    }
  }
  return null;
}

/** Throw if any preset ships an invalid Tailwind name (self-test guard). */
export function assertPresetsValid(): void {
  for (const p of PRESET_THEMES) {
    for (const c of Object.values(p.colors)) {
      if (!isValidTailwindName(c)) throw new Error(`Preset "${p.name}" has invalid colour "${c}".`);
    }
  }
}
