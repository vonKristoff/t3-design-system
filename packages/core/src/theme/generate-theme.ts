import { generateRelativeScale, generateScale } from "../colors/generate-scale.ts";
import { resolveTailwindHex } from "../colors/tailwind-palette.ts";
import type { ColorScale, RelativeScale, SemanticName, ThemeOptions } from "./types.ts";
import { RELATIVE_KEYS } from "./types.ts";
import { deriveReadablePairs } from "./readable-pairs.ts";

export interface GeneratedTheme {
  options: ThemeOptions;
  scales: Record<SemanticName, ColorScale>;
  /** Constrained relative scale per semantic (anchor ± fixed lightness). */
  relative: Record<SemanticName, RelativeScale>;
  /** Raw source anchor hex per semantic (the exact colour the user picked). */
  anchors: Record<SemanticName, string>;
  /** Auto-derived readable text-on-surface values (varName → hex). */
  pairs: Record<string, string>;
  /** CSS custom-property map, e.g. "--brand-primary-500" -> "#2563eb" */
  variables: Record<string, string>;
  /** Full :root block text */
  rootCss: string;
}

const OPTION_TO_SEMANTIC: [keyof ThemeOptions["colors"], SemanticName][] = [
  ["base", "base"],
  ["alt", "alt"],
  ["prose", "prose"],
  ["accent", "accent"],
  ["brandPrimary", "brand-primary"],
  ["brandSecondary", "brand-secondary"],
  ["trafficStop", "traffic-stop"],
  ["trafficWarning", "traffic-warning"],
  ["trafficOk", "traffic-ok"],
];

export function generateTheme(options: ThemeOptions): GeneratedTheme {
  const scales = {} as Record<SemanticName, ColorScale>;
  const relative = {} as Record<SemanticName, RelativeScale>;
  const anchors = {} as Record<SemanticName, string>;
  const variables: Record<string, string> = {};
  for (const [optKey, sem] of OPTION_TO_SEMANTIC) {
    const sourceHex = resolveTailwindHex(options.colors[optKey]).toLowerCase();
    const scale = generateScale(options.colors[optKey]);
    const rel = generateRelativeScale(options.colors[optKey]);
    scales[sem] = scale;
    relative[sem] = rel;
    anchors[sem] = sourceHex;
    // The raw anchor: exactly the colour chosen, never a generated variation.
    variables[`--${sem}`] = sourceHex;
    for (const key of RELATIVE_KEYS) {
      variables[`--${sem}-${key}`] = rel[key];
    }
    for (const [step, value] of Object.entries(scale)) {
      variables[`--${sem}-${step}`] = value;
    }
  }
  const pairs = deriveReadablePairs(scales);
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
