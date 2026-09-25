import { resolveTailwindHex } from "./tailwind-palette.ts";
import { hexToOklch, oklchToHex } from "./oklch.ts";
import type { ColorScale, ScaleStep } from "../theme/types.ts";
import { SCALE_STEPS } from "../theme/types.ts";

// Target lightness ramp per Tailwind-like step (perceptual, OKLCH L).
const TARGET_L: Record<ScaleStep, number> = {
  "50": 0.975,
  "100": 0.935,
  "200": 0.875,
  "300": 0.795,
  "400": 0.705,
  "500": 0.62,
  "600": 0.545,
  "700": 0.475,
  "800": 0.41,
  "900": 0.355,
  "950": 0.285,
};

/**
 * Generate a full 50..950 semantic scale from a Tailwind anchor name
 * (e.g. "blue-600"). The anchor step is pinned to the exact source hex so
 * web preview and CLI can never diverge; other steps interpolate lightness
 * in OKLCH while retaining hue and decaying chroma toward the extremes to
 * avoid neon/pastel artefacts.
 */
export function generateScale(sourceName: string): ColorScale {
  const sourceHex = resolveTailwindHex(sourceName).toLowerCase();
  const src = hexToOklch(sourceHex);

  // Find anchor: step whose target L is closest to source L.
  let anchor: ScaleStep = "500";
  let best = Infinity;
  for (const step of SCALE_STEPS) {
    const d = Math.abs(TARGET_L[step] - src.l);
    if (d < best) {
      best = d;
      anchor = step;
    }
  }

  const achromatic = src.c < 0.012;
  const hue = achromatic ? 0 : src.h;
  const out = {} as ColorScale;

  for (const step of SCALE_STEPS) {
    if (step === anchor) {
      out[step] = sourceHex;
      continue;
    }
    const Lt = TARGET_L[step];
    // Chroma decay: retain source chroma near anchor, fade toward extremes.
    // Distance in lightness from the source drives the decay.
    const dist = Math.abs(Lt - src.l);
    // Base retention curve + extra taming at the very light/dark ends.
    let retention = Math.max(0, 1 - dist * 2.1);
    if (Lt > 0.93) retention *= 0.45;
    else if (Lt > 0.86) retention *= 0.72;
    else if (Lt < 0.33) retention *= 0.62;
    else if (Lt < 0.4) retention *= 0.82;
    // Very light/dark sources already have low chroma; don't invent any.
    const C = achromatic ? 0 : Math.min(src.c, 0.32) * retention + (achromatic ? 0 : Math.min(src.c * 0.12, 0.015));
    // Clamp chroma to a sane gamut-safe range.
    const Cc = Math.min(0.37, Math.max(0, C));
    // Nudge extremely light steps slightly toward neutral to avoid tint blowout.
    const L = Math.min(0.99, Math.max(0.12, Lt));
    out[step] = oklchToHex(L, achromatic ? 0 : Cc, hue);
  }

  return out;
}
