import { hexToRgb } from "../colors/oklch.ts";
import { generateScale } from "../colors/generate-scale.ts";
import { generateRelativeScale } from "../colors/generate-scale.ts";
import { resolveTailwindHex } from "../colors/tailwind-palette.ts";
import { SEMANTIC_TO_OPTION } from "./types.ts";
import type { ThemeOptions } from "./types.ts";

export function luminance(hex: string): number {
  const { r, g, b } = hexToRgb(hex);
  const f = (c: number) => {
    c = Math.min(1, Math.max(0, c));
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}

export function cssToHex(value: string): string | null {
  const v = value.trim();
  if (/^#[0-9a-f]{3}([0-9a-f]{3})?$/i.test(v)) {
    let h = v.slice(1);
    if (h.length === 3) h = h.split("").map((c) => c + c).join("");
    return `#${h.toLowerCase()}`;
  }
  return null; // oklch() strings: skip precise contrast, rely on anchor hexes
}

export function contrastRatio(aHex: string, bHex: string): number {
  const la = luminance(aHex);
  const lb = luminance(bHex);
  const [hi, lo] = la >= lb ? [la, lb] : [lb, la];
  return (hi + 0.05) / (lo + 0.05);
}

export interface ContrastWarning {
  pair: string;
  ratio: number;
  message: string;
}

/** Warn (never auto-fix) on obvious low-contrast pairs using anchor + scale values. */
export function contrastWarnings(options: ThemeOptions): ContrastWarning[] {
  const out: ContrastWarning[] = [];
  try {
    const baseScale = generateScale(options.colors.base);
    const proseScale = generateScale(options.colors.prose);
    const pairs: [string, string, string][] = [
      [proseScale["800"], baseScale["50"], "Prose on Base"],
      [proseScale["900"], baseScale["50"], "Headings on Base"],
      [baseScale["50"], proseScale["900"], "Base on Prose (inverse)"],
    ];
    for (const [fg, bg, label] of pairs) {
      const fh = cssToHex(fg);
      const bh = cssToHex(bg);
      if (!fh || !bh) continue;
      const ratio = contrastRatio(fh, bh);
      if (ratio < 4.5) {
        out.push({ pair: label, ratio: Math.round(ratio * 100) / 100, message: `⚠ ${label} may have low contrast (${ratio.toFixed(2)}:1).` });
      }
    }
    // Explicit text source: warn, never override, when the chosen swatch fails.
    if (options.textSource) {
      const { sem, level } = options.textSource;
      const sourceName = options.colors[SEMANTIC_TO_OPTION[sem]];
      const swatch =
        level === "base"
          ? resolveTailwindHex(sourceName).toLowerCase()
          : generateRelativeScale(sourceName)[level];
      const fh = cssToHex(swatch);
      const bh = cssToHex(generateScale(options.colors.base)["50"]);
      if (fh && bh) {
        const ratio = contrastRatio(fh, bh);
        if (ratio < 4.5) {
          out.push({
            pair: "Text source on Base",
            ratio: Math.round(ratio * 100) / 100,
            message: `⚠ Text source ${sem} ${level} may have low contrast on Base (${ratio.toFixed(2)}:1).`,
          });
        }
      }
    }
  } catch {
    // never throw from warnings
  }
  return out;
}
