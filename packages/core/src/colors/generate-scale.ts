import { resolveTailwindHex } from "./tailwind-palette.ts";
import { hexToOklch, oklchToHex, type Oklch } from "./oklch.ts";
import type { ColorScale, RelativeScale, ScaleStep } from "../theme/types.ts";
import { SCALE_STEPS } from "../theme/types.ts";

// Target lightness ramp per Tailwind-like step (perceptual, OKLCH L).
export const TARGET_L: Record<ScaleStep, number> = {
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

/** Fixed perceptual lightness delta for the relative (±2) scale. */
export const RELATIVE_DELTA = 0.1;

/**
 * Minimum chroma for relative-trio siblings, so near-grey anchors (slate,
 * stone…) keep a breath of family hue instead of collapsing to neutral
 * grey. The full rung scales keep the classic curve untouched.
 */
export const TRIO_CHROMA_FLOOR = 0.015;

/**
 * End-anchoring rotation: when the anchor sits too close to white (or black)
 * for a step to fit, the extreme slot takes the anchor hue-rotated instead
 * of collapsing onto it. Light turns one way, dark the other, so the trio
 * fans out from the anchor.
 */
export const END_HUE_ROTATE_LIGHT = 90;
export const END_HUE_ROTATE_DARK = -90;

/** Minimum chroma for a rotated extreme, so near-greys still read apart. */
export const END_CHROMA_FLOOR = 0.03;

/**
 * The step number embedded in a Tailwind source name ("yellow-100" → "100").
 * resolveTailwindHex must have accepted the name first.
 */
export function parseTailwindStep(sourceName: string): ScaleStep {
  const step = sourceName.split("-").at(-1) as ScaleStep;
  if (!(SCALE_STEPS as string[]).includes(step)) {
    throw new Error(`Invalid Tailwind colour name: "${sourceName}". Expected e.g. "blue-600".`);
  }
  return step;
}

/**
 * Render the source hue at a target lightness, decaying chroma with distance
 * from the source so near steps keep character and extremes stay sane.
 * The rung scale uses the classic slope; the relative scale steepens it for
 * pale anchors (see relativeSlope) so pastel families stay pastel instead of
 * snapping back to full-strength siblings one step down.
 */
function decayedHex(src: Oklch, targetL: number, slope = 2.1, chromaFloor = 0): string {
  const achromatic = src.c < 0.012 && chromaFloor <= 0;
  const hue = achromatic ? 0 : src.h;
  const dist = Math.abs(targetL - src.l);
  // Base retention curve + extra taming at the very light/dark ends.
  let retention = Math.max(0, 1 - dist * slope);
  if (targetL > 0.93) retention *= 0.45;
  else if (targetL > 0.86) retention *= 0.72;
  else if (targetL < 0.33) retention *= 0.62;
  else if (targetL < 0.4) retention *= 0.82;
  // Very light/dark sources already have low chroma; don't invent any.
  const C = achromatic ? 0 : Math.min(src.c, 0.32) * retention + (achromatic ? 0 : Math.min(src.c * 0.12, 0.015));
  // Clamp chroma to a sane gamut-safe range, never below the floor.
  const Cc = Math.min(0.37, Math.max(chromaFloor, C));
  // Nudge extreme lightness slightly toward neutral to avoid tint blowout.
  const L = Math.min(0.99, Math.max(0.12, targetL));
  return oklchToHex(L, achromatic ? 0 : Cc, hue);
}

/**
 * Generate a full 50..950 semantic scale from a Tailwind anchor name
 * (e.g. "blue-600"). The anchor is pinned to the *named* step, so the rung
 * number you pick is where your exact colour lands; other rungs interpolate
 * lightness in OKLCH while retaining hue and decaying chroma toward the
 * extremes to avoid neon/pastel artefacts.
 */
export function generateScale(sourceName: string): ColorScale {
  const sourceHex = resolveTailwindHex(sourceName).toLowerCase();
  return generateScaleFromHex(sourceHex, parseTailwindStep(sourceName));
}

/** Hex-based core: fixed anchors (chromatics) pin to an explicit step. */
export function generateScaleFromHex(sourceHex: string, anchor: ScaleStep): ColorScale {
  const src = hexToOklch(sourceHex.toLowerCase());
  const out = {} as ColorScale;
  for (const step of SCALE_STEPS) {
    if (step === anchor) {
      out[step] = sourceHex.toLowerCase();
      continue;
    }
    out[step] = decayedHex(src, TARGET_L[step]);
  }
  return out;
}

/**
 * Light/dark siblings for an arbitrary hex: one fixed step either side using
 * the classic ramp, so derived accents (e.g. pop-twist) follow the same
 * rulings as every other relative state.
 */
export function deriveLightDark(sourceHex: string, delta = RELATIVE_DELTA): { light: string; dark: string } {
  const src = hexToOklch(sourceHex.toLowerCase());
  const at = (l: number) => decayedHex(src, Math.min(0.99, Math.max(0.12, l)));
  return { light: at(src.l + delta), dark: at(src.l - delta) };
}

/** Name-based relative scale with end-anchoring (see generateRelativeScaleFromHex). */
export function generateRelativeScale(sourceName: string, delta = RELATIVE_DELTA): RelativeScale {
  const sourceHex = resolveTailwindHex(sourceName).toLowerCase();
  return generateRelativeScaleFromHex(sourceHex, delta);
}

/** Hex-based core for fixed anchors (chromatics). */
export function generateRelativeScaleFromHex(sourceHex: string, delta = RELATIVE_DELTA): RelativeScale {
  const src = hexToOklch(sourceHex.toLowerCase());
  const hex = sourceHex.toLowerCase();
  // Anchors at/below mid keep the classic ramp (byte-identical to before);
  // paler anchors shed chroma faster when darkened so the trio reads as one
  // pastel family instead of snapping to full strength a step down.
  const slope = 2.1 + 4 * Math.max(0, src.l - 0.65);
  // Clamp first so chroma decay sees the lightness actually rendered.
  const at = (l: number) => decayedHex(src, Math.min(0.99, Math.max(0.12, l)), slope, TRIO_CHROMA_FLOOR);
  // End-anchoring: the extreme slot takes the anchor hue-rotated (never the
  // raw anchor, so light/dark always read apart from it); the rest derive
  // backwards. Otherwise the anchor is `base` with one step either side.
  // The dark rail sits one notch below the render floor so the slot stays
  // strictly darker than base even for pure-black anchors.
  const rotated = (l: number, rail: number, dir: 1 | -1) => {
    const h = (((src.h + (dir === 1 ? END_HUE_ROTATE_LIGHT : END_HUE_ROTATE_DARK)) % 360) + 360) % 360;
    const c = Math.min(0.32, Math.max(src.c, END_CHROMA_FLOOR));
    return oklchToHex(rail, c, h);
  };
  // Hue-turn any hex by degrees, preserving lightness and chroma.
  const spin = (hex: string, deg: number): string => {
    const o = hexToOklch(hex);
    return oklchToHex(o.l, o.c, o.h + deg);
  };
  if (src.l + delta > 0.99) {
    return { base: at(src.l - delta), light: rotated(src.l + delta, Math.min(0.99, src.l + delta), 1), dark: spin(at(src.l - 2 * delta), END_HUE_ROTATE_DARK) };
  }
  if (src.l - delta < 0.12) {
    return { base: at(src.l + delta), light: at(src.l + 2 * delta), dark: rotated(src.l - delta, Math.max(0.1, src.l - delta), -1) };
  }
  return { base: hex, light: at(src.l + delta), dark: at(src.l - delta) };
}
