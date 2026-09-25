import { generateScale } from "../colors/generate-scale.ts";
import { resolveTailwindHex } from "../colors/tailwind-palette.ts";
import type { ColorScale, SemanticName, ThemeOptions } from "./types.ts";

export interface GeneratedTheme {
  options: ThemeOptions;
  scales: Record<SemanticName, ColorScale>;
  /** Raw source anchor hex per semantic (the exact colour the user picked). */
  anchors: Record<SemanticName, string>;
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
  const anchors = {} as Record<SemanticName, string>;
  const variables: Record<string, string> = {};
  for (const [optKey, sem] of OPTION_TO_SEMANTIC) {
    const sourceHex = resolveTailwindHex(options.colors[optKey]).toLowerCase();
    const scale = generateScale(options.colors[optKey]);
    scales[sem] = scale;
    anchors[sem] = sourceHex;
    // The raw anchor: exactly the colour chosen, never a generated variation.
    variables[`--${sem}`] = sourceHex;
    for (const [step, value] of Object.entries(scale)) {
      variables[`--${sem}-${step}`] = value;
    }
  }
  const lines = [":root {"];
  for (const [k, v] of Object.entries(variables)) {
    lines.push(`  ${k}: ${v};`);
  }
  lines.push("}");
  return { options, scales, anchors, variables, rootCss: lines.join("\n") };
}
