import { TARGET_L } from "../colors/generate-scale.ts";
import { contrastRatio, cssToHex, luminance } from "./contrast.ts";
import type { ColorScale, ScaleStep, SemanticName } from "./types.ts";
import { SCALE_STEPS } from "./types.ts";

export const MIN_READABLE_RATIO = 4.5;

export interface ReadablePairSpec {
  /** Emitted variable, e.g. "--prose-on-base". */
  varName: string;
  textSem: SemanticName;
  /** Preferred rung — today's hardcoded choice, preserved when it passes. */
  textPreferred: ScaleStep;
  bgSem: SemanticName;
  bgStep: ScaleStep;
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
  { varName: "--muted-on-base", textSem: "muted", textPreferred: "600", bgSem: "base", bgStep: "50" },
  { varName: "--accent-on-base", textSem: "accent", textPreferred: "600", bgSem: "base", bgStep: "50" },
  { varName: "--inverse-on-accent", textSem: "inverse", textPreferred: "50", bgSem: "accent", bgStep: "600" },
  { varName: "--inverse-on-pop", textSem: "inverse", textPreferred: "50", bgSem: "pop", bgStep: "600" },
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

/** Derive every readable pair value (varName → hex) from generated scales. */
export function deriveReadablePairs(
  scales: Record<SemanticName, ColorScale>
): Record<string, string> {
  const out: Record<string, string> = {};
  let accentLink: ScaleStep = "600";
  for (const spec of READABLE_PAIRS) {
    const bg = cssToHex(scales[spec.bgSem][spec.bgStep]);
    if (!bg) continue;
    const step = pickReadableRung(scales[spec.textSem], bg, spec.textPreferred);
    out[spec.varName] = ensureContrast(scales[spec.textSem][step], bg);
    if (spec.varName === "--accent-on-base") accentLink = step;
  }
  const baseBg = cssToHex(scales["base"]["50"]);
  if (baseBg) {
    const hover = pickHoverRung(scales["accent"], baseBg, accentLink);
    out["--accent-hover-on-base"] = ensureContrast(scales["accent"][hover], baseBg);
  }
  return out;
}

/**
 * Guarantee readability: if the picked value fails, fall back to black then
 * white. For any background exactly one of the two always passes, so the
 * AA guarantee holds even for fills no scale rung can pair with.
 */
export function ensureContrast(textHex: string, bgHex: string, minRatio = MIN_READABLE_RATIO): string {
  if (contrastRatio(textHex, bgHex) >= minRatio) return textHex;
  if (contrastRatio("#000000", bgHex) >= minRatio) return "#000000";
  return "#ffffff";
}
