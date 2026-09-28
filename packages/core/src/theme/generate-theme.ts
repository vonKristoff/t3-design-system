import { generateRelativeScale, generateRelativeScaleFromHex, generateScale, generateScaleFromHex, deriveLightDark } from "../colors/generate-scale.ts";
import { hexToOklch, oklchToHex } from "../colors/oklch.ts";
import { resolveTailwindHex } from "../colors/tailwind-palette.ts";
import type { ChromaticName, ColorScale, RelativeScale, SemanticName, ThemeOptions } from "./types.ts";
import { CHROMATIC_ANCHOR_STEP, CHROMATIC_HEX, CHROMATIC_NAMES, GLASS_ALPHA_DEFAULT, RELATIVE_KEYS, TWIST_BASE_HUE } from "./types.ts";
import { deriveReadablePairs } from "./readable-pairs.ts";

export interface GeneratedTheme {
  options: ThemeOptions;
  scales: Record<SemanticName | ChromaticName, ColorScale>;
  /** Constrained relative scale per semantic (anchor ± fixed lightness). */
  relative: Record<SemanticName | ChromaticName, RelativeScale>;
  /** Raw source anchor hex per semantic (the exact colour the user picked). */
  anchors: Record<SemanticName | ChromaticName, string>;
  /** Fixed chromatics + auto-derived readable text-on-surface values. */
  pairs: Record<string, string>;
  /** CSS custom-property map, e.g. "--accent-500" -> "#2563eb" */
  variables: Record<string, string>;
  /** Full :root block text */
  rootCss: string;
}

const OPTION_TO_SEMANTIC: [keyof ThemeOptions["colors"], SemanticName][] = [
  ["base", "base"],
  ["alt", "alt"],
  ["glass", "glass"],
  ["prose", "prose"],
  ["muted", "muted"],
  ["accent", "accent"],
  ["pop", "pop"],
  ["inverse", "inverse"],
  ["trafficStop", "traffic-stop"],
  ["trafficWarning", "traffic-warning"],
  ["trafficOk", "traffic-ok"],
];

export function generateTheme(options: ThemeOptions): GeneratedTheme {
  const scales = {} as Record<SemanticName | ChromaticName, ColorScale>;
  const relative = {} as Record<SemanticName | ChromaticName, RelativeScale>;
  const anchors = {} as Record<SemanticName | ChromaticName, string>;
  const variables: Record<string, string> = {};
  const emit = (name: SemanticName | ChromaticName, sourceHex: string, scale: ColorScale, rel: RelativeScale) => {
    scales[name] = scale;
    relative[name] = rel;
    anchors[name] = sourceHex;
    // The raw anchor: exactly the colour chosen, never a generated variation.
    variables[`--${name}`] = sourceHex;
    for (const key of RELATIVE_KEYS) {
      variables[`--${name}-${key}`] = rel[key];
    }
    for (const [step, value] of Object.entries(scale)) {
      variables[`--${name}-${step}`] = value;
    }
  };
  for (const [optKey, sem] of OPTION_TO_SEMANTIC) {
    const sourceHex = resolveTailwindHex(options.colors[optKey]).toLowerCase();
    emit(sem, sourceHex, generateScale(options.colors[optKey]), generateRelativeScale(options.colors[optKey]));
  }
  // Fixed chromatics: absolute anchors, full generated ranges.
  for (const name of CHROMATIC_NAMES) {
    const hex = CHROMATIC_HEX[name];
    emit(name, hex, generateScaleFromHex(hex, CHROMATIC_ANCHOR_STEP[name]), generateRelativeScaleFromHex(hex));
  }
  const pairs = deriveReadablePairs(scales);
  // Swappable body-copy source: default is the auto-derived prose value;
  // an explicit swatch overrides it verbatim (warnings cover low contrast).
  if (options.textSource) {
    const { sem, level } = options.textSource;
    pairs["--prose-on-base"] = level === "base" ? anchors[sem] : relative[sem][level];
  }
  // Frosted glass fill + pop twist (hue-rotated pop).
  const alpha = options.glassAlpha ?? GLASS_ALPHA_DEFAULT;
  const alphaPct = Math.round(alpha * 100);
  variables["--glass-alpha"] = String(alpha);
  variables["--glass-fill"] = `color-mix(in srgb, var(--glass) ${alphaPct}%, transparent)`;
  variables["--pop-twist"] = twistPop(anchors["pop"], options.twist?.hue ?? 0, options.twist?.saturation ?? 0);
  const twistSiblings = deriveLightDark(variables["--pop-twist"]);
  variables["--pop-twist-light"] = twistSiblings.light;
  variables["--pop-twist-dark"] = twistSiblings.dark;
  for (const [name, value] of Object.entries(pairs)) {
    variables[name] = value;
  }
  const lines = [":root {"];
  for (const [k, v] of Object.entries(variables)) {
    lines.push(`  ${k}: ${v};`);
  }
  lines.push("}");
  return { options, scales, relative, anchors, pairs, variables, rootCss: lines.join("\n") };
}

/**
 * Pop twist: the pop anchor rotated by the automatic base hue plus an
 * optional tweak (-15..15°), with relative saturation adjustment (-15..15%).
 */
export function twistPop(popHex: string, hueTweak = 0, saturationTweak = 0): string {
  const src = hexToOklch(popHex.toLowerCase());
  const h = ((src.h + TWIST_BASE_HUE + hueTweak) % 360 + 360) % 360;
  const c = Math.max(0, src.c * (1 + saturationTweak / 100));
  return oklchToHex(src.l, Math.min(c, 0.37), h);
}
