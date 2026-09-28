import type { ThemeColors } from "./types.ts";
import { isValidTailwindName } from "../colors/tailwind-palette.ts";

export interface PresetTheme {
  name: string;
  label: string;
  blurb: string;
  colors: ThemeColors;
}

export const PRESET_THEMES: PresetTheme[] = [
  {
    name: "ocean",
    label: "Ocean",
    blurb: "Deep sea blues with a coral pop",
    colors: {
      base: "cyan-50",
      alt: "blue-100",
      prose: "slate-900",
      muted: "slate-500",
      accent: "cyan-600",
      pop: "orange-400",
      inverse: "slate-50",
      trafficStop: "red-600",
      trafficWarning: "amber-500",
      trafficOk: "green-600",
    },
  },
  {
    name: "sand",
    label: "Sand",
    blurb: "Warm dunes with a rose signal",
    colors: {
      base: "amber-50",
      alt: "orange-100",
      prose: "neutral-900",
      muted: "amber-700",
      accent: "orange-600",
      pop: "rose-500",
      inverse: "neutral-50",
      trafficStop: "red-600",
      trafficWarning: "amber-500",
      trafficOk: "green-600",
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
      muted: "slate-400",
      accent: "indigo-400",
      pop: "fuchsia-400",
      inverse: "slate-50",
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
      muted: "neutral-400",
      accent: "fuchsia-500",
      pop: "lime-400",
      inverse: "neutral-50",
      trafficStop: "red-500",
      trafficWarning: "amber-400",
      trafficOk: "lime-400",
    },
  },
  {
    name: "jungle",
    label: "Jungle",
    blurb: "Canopy greens, amber light",
    colors: {
      base: "lime-50",
      alt: "green-100",
      prose: "green-950",
      muted: "green-700",
      accent: "green-600",
      pop: "amber-400",
      inverse: "green-50",
      trafficStop: "red-600",
      trafficWarning: "amber-500",
      trafficOk: "green-600",
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
