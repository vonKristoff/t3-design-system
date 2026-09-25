import { FALLBACK_STACKS, CURATED_FONTS } from "../theme/defaults.ts";
import type { ThemeOptions } from "../theme/types.ts";

function stackFor(fontName: string | undefined, fallback: string): string {
  if (!fontName) return fallback;
  const curated = CURATED_FONTS.find((f) => f.name === fontName);
  if (curated) return curated.stack;
  const safe = fontName.replace(/[";\\]/g, "");
  return `"${safe}", ${fallback}`;
}

export function fontStacks(options: ThemeOptions): { primary: string; secondary: string; tertiary: string | null } {
  return {
    primary: stackFor(options.fonts.primary, FALLBACK_STACKS.primary),
    secondary: stackFor(options.fonts.secondary, FALLBACK_STACKS.secondary),
    tertiary: options.fonts.tertiary ? stackFor(options.fonts.tertiary, FALLBACK_STACKS.mono) : null,
  };
}

export function googleFontHref(options: ThemeOptions): string | null {
  const names = [options.fonts.primary, options.fonts.secondary, options.fonts.tertiary].filter(
    (n): n is string => typeof n === "string" && n.length > 0
  );
  if (names.length === 0) return null;
  const uniq = [...new Set(names)];
  const families = uniq
    .map((n) => {
      const slug = encodeURIComponent(n).replace(/%20/g, "+");
      const curated = CURATED_FONTS.find((f) => f.name === n);
      if (curated?.variable && curated.axis) return `family=${slug}:${curated.axis}`;
      return `family=${slug}:wght@400;500;600;700`;
    })
    .join("&");
  return `https://fonts.googleapis.com/css2?${families}&display=swap`;
}

export function generateFontsCss(options: ThemeOptions): string {
  const stacks = fontStacks(options);
  const href = googleFontHref(options);
  const lines: string[] = [];
  if (href) lines.push(`@import url("${href}");`);
  lines.push(":root {");
  lines.push(`  --font-primary: ${stacks.primary};`);
  lines.push(`  --font-secondary: ${stacks.secondary};`);
  if (stacks.tertiary) lines.push(`  --font-tertiary: ${stacks.tertiary};`);
  lines.push("}");
  return lines.join("\n");
}
