import { TARGET_L } from "../colors/generate-scale.ts";
import { mixSrgb } from "../colors/oklch.ts";
import { contrastRatio, cssToHex, luminance } from "./contrast.ts";
import type { ColorScale, ScaleStep, SemanticName } from "./types.ts";
import { SCALE_STEPS } from "./types.ts";

export const MIN_READABLE_RATIO = 4.5;

/**
 * Surface tint weights. These are the single source of truth for how the
 * generated CSS shades surfaces, and are reused verbatim by the derivation
 * below so the preview and the shipped stylesheet can never disagree.
 *
 * A surface is `color-mix(in srgb, <other> W%, <sem>)` — i.e. W% of the
 * "ink" semantic (`other`) laid over the base semantic. Because the ink is
 * light on dark themes and dark on light themes, every surface keeps the
 * theme's polarity instead of assuming a light canvas.
 */
export const CANVAS_SHADE = 0.06;
export const RAISED_SHADE = 0.08;
export const EDGE_SHADE = 0.18;
export const TRAFFIC_TINT = 0.14;
export const TRAFFIC_EDGE = 0.34;

/** How a readable pair's background surface is built. Mirrors the CSS. */
export type SurfaceRef =
  | { kind: "anchor" }
  | { kind: "step"; step: ScaleStep }
  | { kind: "mix"; other: SemanticName; weight: number };

export interface ReadablePairSpec {
  /** Emitted variable, e.g. "--prose-on-base". */
  varName: string;
  textSem: SemanticName;
  /**
   * Preferred rung as an offset (in rungs) from the text semantic's own
   * anchor step. Negative walks lighter, positive darker. Expressing the
   * preference relative to the anchor — rather than as an absolute rung —
   * keeps the text on the same side of the scale the user chose it on, so a
   * light `prose` pick on a dark canvas prefers a light body colour.
   */
  textOffset: number;
  bgSem: SemanticName;
  bg: SurfaceRef;
}

/**
 * Every text-on-surface pair the generated CSS actually renders. The engine
 * picks the rung nearest the preferred one that meets WCAG AA against the
 * surface it will truly sit on (anchors and tints, not assumed rungs), so
 * defaults resolve identically and only failing picks move — minimally.
 */
export const READABLE_PAIRS: ReadablePairSpec[] = [
  { varName: "--prose-on-base", textSem: "prose", textOffset: -1, bgSem: "base", bg: { kind: "anchor" } },
  { varName: "--prose-on-alt", textSem: "prose", textOffset: 0, bgSem: "alt", bg: { kind: "mix", other: "prose", weight: RAISED_SHADE } },
  { varName: "--prose-on-quote", textSem: "prose", textOffset: -2, bgSem: "alt", bg: { kind: "anchor" } },
  { varName: "--prose-on-quote-soft", textSem: "prose", textOffset: -3, bgSem: "base", bg: { kind: "anchor" } },
  { varName: "--muted-on-base", textSem: "muted", textOffset: 1, bgSem: "base", bg: { kind: "anchor" } },
  { varName: "--accent-on-base", textSem: "accent", textOffset: 0, bgSem: "base", bg: { kind: "anchor" } },
  { varName: "--traffic-stop-on-callout", textSem: "traffic-stop", textOffset: 3, bgSem: "base", bg: { kind: "mix", other: "traffic-stop", weight: TRAFFIC_TINT } },
  { varName: "--traffic-warning-on-callout", textSem: "traffic-warning", textOffset: 3, bgSem: "base", bg: { kind: "mix", other: "traffic-warning", weight: TRAFFIC_TINT } },
  { varName: "--traffic-ok-on-callout", textSem: "traffic-ok", textOffset: 3, bgSem: "base", bg: { kind: "mix", other: "traffic-ok", weight: TRAFFIC_TINT } },
  { varName: "--traffic-stop-on-fill", textSem: "inverse", textOffset: 0, bgSem: "traffic-stop", bg: { kind: "anchor" } },
  { varName: "--traffic-warning-on-fill", textSem: "inverse", textOffset: 0, bgSem: "traffic-warning", bg: { kind: "anchor" } },
  { varName: "--traffic-ok-on-fill", textSem: "inverse", textOffset: 0, bgSem: "traffic-ok", bg: { kind: "anchor" } },
  { varName: "--inverse-on-accent", textSem: "inverse", textOffset: 0, bgSem: "accent", bg: { kind: "anchor" } },
  { varName: "--inverse-on-pop", textSem: "inverse", textOffset: 0, bgSem: "pop", bg: { kind: "anchor" } },
  { varName: "--pre-on-ink", textSem: "alt", textOffset: -1, bgSem: "alt", bg: { kind: "step", step: "950" } },
];

/** Rung whose generated value equals the semantic's exact anchor. */
export function anchorStepOf(scales: Record<SemanticName, ColorScale>, anchors: Record<SemanticName, string>, sem: SemanticName): ScaleStep {
  const found = SCALE_STEPS.find((step) => scales[sem][step] === anchors[sem]);
  return found ?? "500";
}

/** Shift a rung by `offset` steps (negative lighter), clamped to the scale. */
export function shiftRung(step: ScaleStep, offset: number): ScaleStep {
  const i = SCALE_STEPS.indexOf(step);
  const j = Math.min(SCALE_STEPS.length - 1, Math.max(0, i + offset));
  return SCALE_STEPS[j];
}

/** The generated data a surface reference resolves against. */
export interface SurfaceSource {
  scales: Record<SemanticName, ColorScale>;
  anchors: Record<SemanticName, string>;
}

/**
 * Resolve a pair's true background hex. For `mix` the result is
 * `weight` of `other` over `(1 - weight)` of `bgSem`, matching
 * `color-mix(in srgb, var(--{other}) W%, var(--{bgSem}))`.
 */
export function backgroundHex(spec: ReadablePairSpec, source: SurfaceSource): string | null {
  const { bg } = spec;
  if (bg.kind === "anchor") return source.anchors[spec.bgSem] ?? null;
  if (bg.kind === "step") return source.scales[spec.bgSem]?.[bg.step] ?? null;
  const top = source.anchors[bg.other];
  const base = source.anchors[spec.bgSem];
  if (!top || !base) return null;
  return mixSrgb(top, base, bg.weight);
}

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

/** Derive every readable pair value (varName → hex) from generated state. */
export function deriveReadablePairs(
  scales: Record<SemanticName, ColorScale>,
  anchors: Record<SemanticName, string>
): Record<string, string> {
  const source: SurfaceSource = { scales, anchors };
  const out: Record<string, string> = {};
  let accentLink: ScaleStep = "600";
  for (const spec of READABLE_PAIRS) {
    const bg = backgroundHex(spec, source);
    const bgHex = bg ? cssToHex(bg) : null;
    if (!bgHex) continue;
    const preferred = shiftRung(anchorStepOf(scales, anchors, spec.textSem), spec.textOffset);
    const step = pickReadableRung(scales[spec.textSem], bgHex, preferred);
    out[spec.varName] = ensureContrast(scales[spec.textSem][step], bgHex);
    if (spec.varName === "--accent-on-base") accentLink = step;
  }
  const baseBg = cssToHex(anchors["base"]);
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
