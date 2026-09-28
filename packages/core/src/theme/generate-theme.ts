import { generateRelativeScale, generateRelativeScaleFromHex, generateScale, generateScaleFromHex } from "../colors/generate-scale.ts";
import { resolveTailwindHex } from "../colors/tailwind-palette.ts";
import type { ChromaticName, ColorScale, RelativeScale, SemanticName, ThemeOptions } from "./types.ts";
import { CHROMATIC_ANCHOR_STEP, CHROMATIC_HEX, CHROMATIC_NAMES, RELATIVE_KEYS } from "./types.ts";
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
