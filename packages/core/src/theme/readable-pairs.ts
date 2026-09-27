import { TARGET_L } from "../colors/generate-scale.ts";
import { hexToOklch, oklchToHex } from "../colors/oklch.ts";
import { contrastRatio, cssToHex, luminance } from "./contrast.ts";
import type { ColorScale, ScaleStep, SemanticName } from "./types.ts";
import { SCALE_STEPS } from "./types.ts";

export const MIN_READABLE_RATIO = 4.5;

// Hue-bounce experiment: when a chromatic family's readable pick collapses
// to grey, rotate to the complementary hue and strengthen until it reads.
export const BOUNCE_MIN_ANCHOR_C = 0.03;
export const BOUNCE_MAX_PICK_C = 0.03;
export const BOUNCE_HUE_SHIFT = 180;
export const BOUNCE_SWEEP_C = [0.06, 0.09, 0.12, 0.15, 0.18];
export const BOUNCE_MIN_RENDER_C = 0.05;
export const BOUNCE_MAX_HUE_DRIFT = 40;

export interface ReadablePairSpec {
  /** Emitted variable, e.g. "--prose-on-base". */
  varName: string;
  textSem: SemanticName;
  /** Preferred rung — today's hardcoded choice, preserved when it passes. */
  textPreferred: ScaleStep;
  bgSem: SemanticName;
  bgStep: ScaleStep;
  /** Allow the hue-bounce experiment when the pick goes grey. */
  bounce?: boolean;
}

/**
 * Every text-on-surface pair the generated CSS actually renders, derived
 * from the hardcoded consumers in css.ts. The engine picks the rung nearest
 * the preferred one that meets WCAG AA, so defaults resolve identically and
 * only failing picks move — and then only minimally.
 */
export const READABLE_PAIRS: ReadablePairSpec[] = [
  { varName: "--prose-on-base", textSem: "prose", textPreferred: "800", bgSem: "base", bgStep: "50" },
  { varName: "--prose-on-alt", textSem: "prose", textPreferred: "900", bgSem: "alt", bgStep: "200" },
  { varName: "--prose-on-quote", textSem: "prose", textPreferred: "700", bgSem: "alt", bgStep: "100" },
  { varName: "--prose-on-quote-soft", textSem: "prose", textPreferred: "600", bgSem: "base", bgStep: "50" },
  { varName: "--accent-on-base", textSem: "accent", textPreferred: "600", bgSem: "base", bgStep: "50", bounce: true },
  { varName: "--traffic-stop-on-callout", textSem: "traffic-stop", textPreferred: "900", bgSem: "traffic-stop", bgStep: "100" },
  { varName: "--traffic-warning-on-callout", textSem: "traffic-warning", textPreferred: "900", bgSem: "traffic-warning", bgStep: "100" },
  { varName: "--traffic-ok-on-callout", textSem: "traffic-ok", textPreferred: "900", bgSem: "traffic-ok", bgStep: "100" },
  { varName: "--pre-on-ink", textSem: "alt", textPreferred: "50", bgSem: "alt", bgStep: "950" },
];

/** Rungs ordered by lightness distance from the preferred rung. */
function orderedCandidates(preferred: ScaleStep): ScaleStep[] {
  return [...SCALE_STEPS].sort(
    (a, b) => Math.abs(TARGET_L[a] - TARGET_L[preferred]) - Math.abs(TARGET_L[b] - TARGET_L[preferred])
  );
}

/**
 * Nearest rung to `preferred` meeting the ratio against the background.
 * Falls back to the max-contrast rung (always exists: extremes oppose).
 */
export function pickReadableRung(
  scale: ColorScale,
  bgHex: string,
  preferred: ScaleStep,
  minRatio = MIN_READABLE_RATIO
): ScaleStep {
  let fallback: ScaleStep = preferred;
  let fallbackRatio = -1;
  for (const step of orderedCandidates(preferred)) {
    const fg = cssToHex(scale[step]);
    if (!fg) continue;
    const ratio = contrastRatio(fg, bgHex);
    if (ratio > fallbackRatio) {
      fallbackRatio = ratio;
      fallback = step;
    }
    if (ratio >= minRatio) return step;
  }
  return fallback;
}

/**
 * Hover rung: first passing rung strictly beyond the link rung, away from
 * the background (darker on light surfaces, lighter on dark ones).
 * Falls back to the link rung itself.
 */
export function pickHoverRung(
  scale: ColorScale,
  bgHex: string,
  linkStep: ScaleStep,
  minRatio = MIN_READABLE_RATIO
): ScaleStep {
  const linkHex = cssToHex(scale[linkStep]);
  const bgLum = luminance(bgHex);
  if (!linkHex) return linkStep;
  const linkLum = luminance(linkHex);
  const darkerBg = bgLum > linkLum; // light surface → hover darker, and vice versa
  const linkL = TARGET_L[linkStep];
  const beyond = SCALE_STEPS.filter((s) =>
    darkerBg ? TARGET_L[s] < linkL : TARGET_L[s] > linkL
  ).sort(
    (a, b) => Math.abs(TARGET_L[a] - linkL) - Math.abs(TARGET_L[b] - linkL)
  );
  for (const step of beyond) {
    const fg = cssToHex(scale[step]);
    if (fg && contrastRatio(fg, bgHex) >= minRatio) return step;
  }
  return linkStep;
}

/**
 * Hue bounce: if the anchor family is chromatic but the picked rung went
 * grey, rotate to the complementary hue at the same lightness and sweep
 * chroma up until the render is both colorful and readable. Anything that
 * fails (achromatic family, gamut drift, no passing candidate) keeps the
 * original pick — the bounce can only ever preserve the contrast guarantee.
 */
export function bounceHex(
  pickedHex: string,
  anchorHex: string,
  bgHex: string,
  minRatio = MIN_READABLE_RATIO
): string {
  let anchor: { l: number; c: number; h: number };
  let picked: { l: number; c: number; h: number };
  try {
    anchor = hexToOklch(anchorHex);
    picked = hexToOklch(pickedHex);
  } catch {
    return pickedHex;
  }
  if (anchor.c < BOUNCE_MIN_ANCHOR_C) return pickedHex;
  if (picked.c >= BOUNCE_MAX_PICK_C) return pickedHex;
  const targetH = (anchor.h + BOUNCE_HUE_SHIFT) % 360;
  for (const c of BOUNCE_SWEEP_C) {
    const hex = oklchToHex(picked.l, c, targetH);
    let back: { l: number; c: number; h: number };
    try {
      back = hexToOklch(hex);
    } catch {
      continue;
    }
    let drift = Math.abs(back.h - targetH);
    if (drift > 180) drift = 360 - drift;
    if (back.c >= BOUNCE_MIN_RENDER_C && drift <= BOUNCE_MAX_HUE_DRIFT && contrastRatio(hex, bgHex) >= minRatio) {
      return hex;
    }
  }
  return pickedHex;
}

/** Derive every readable pair value (varName → hex) from generated scales. */
export function deriveReadablePairs(
  scales: Record<SemanticName, ColorScale>,
  anchors: Record<SemanticName, string>
): Record<string, string> {
  const out: Record<string, string> = {};
  let accentLink: ScaleStep = "600";
  for (const spec of READABLE_PAIRS) {
    const bg = cssToHex(scales[spec.bgSem][spec.bgStep]);
    if (!bg) continue;
    const step = pickReadableRung(scales[spec.textSem], bg, spec.textPreferred);
    let hex = scales[spec.textSem][step];
    if (spec.bounce) {
      hex = bounceHex(hex, anchors[spec.textSem], bg);
    }
    out[spec.varName] = hex;
    if (spec.varName === "--accent-on-base") accentLink = step;
  }
  const baseBg = cssToHex(scales["base"]["50"]);
  if (baseBg) {
    const hover = pickHoverRung(scales["accent"], baseBg, accentLink);
    let hex = scales["accent"][hover];
    hex = bounceHex(hex, anchors["accent"], baseBg);
    out["--accent-hover-on-base"] = hex;
  }
  return out;
}
