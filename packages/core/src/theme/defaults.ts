import type { ThemeOptions } from "./types.ts";
import { PAYLOAD_VERSION } from "./types.ts";

export const DEFAULT_THEME: ThemeOptions = {
  version: PAYLOAD_VERSION,
  colors: {
    base: "slate-50",
    alt: "slate-100",
    prose: "slate-900",
    muted: "slate-500",
    accent: "blue-600",
    pop: "fuchsia-500",
    inverse: "slate-50",
    trafficStop: "red-600",
    trafficWarning: "amber-500",
    trafficOk: "green-600",
  },
  fonts: {
    primary: "Roboto",
    secondary: "Merriweather",
  },
  fontAssignments: {
    h1: "primary",
    h2: "primary",
    h3: "primary",
    h4: "secondary",
    h5: "secondary",
    h6: "secondary",
    p: "primary",
    list: "primary",
    blockquote: "secondary",
    code: "tertiary",
  },
  width: { value: 70, unit: "%" },
  breakout: { value: 6, unit: "%" },
  breakouts: {
    blockquote: "breakout",
    table: "breakout",
    pre: "breakout",
    img: "full",
    callout: "content",
    hr: "content",
  },
  components: {
    blockquote: "rule",
  },
};

// Curated Google Fonts: 3 sans + 3 serif. `axis` is the variable-font axis
// request (verified against the live API); families without one are served
// as static instances. weightMin/weightMax bound the variable slider.
export const CURATED_FONTS = [
  { name: "Inter", category: "sans", stack: '"Inter", ui-sans-serif, system-ui, sans-serif', variable: true, axis: "opsz,wght@14..32,100..900", weightMin: 100, weightMax: 900 },
  { name: "Roboto", category: "sans", stack: '"Roboto", ui-sans-serif, system-ui, sans-serif', variable: true, axis: "ital,wght@0,100..900", weightMin: 100, weightMax: 900 },
  { name: "DM Sans", category: "sans", stack: '"DM Sans", ui-sans-serif, system-ui, sans-serif', variable: true, axis: "ital,opsz,wght@0,9..40,100..1000", weightMin: 100, weightMax: 1000 },
  { name: "Playfair Display", category: "serif", stack: '"Playfair Display", Georgia, serif', variable: true, axis: "ital,wght@0,400..900", weightMin: 400, weightMax: 900 },
  { name: "Merriweather", category: "serif", stack: '"Merriweather", Georgia, serif', variable: false as const, axis: null as string | null, weightMin: 400, weightMax: 400 },
  { name: "Lora", category: "serif", stack: '"Lora", Georgia, serif', variable: true, axis: "ital,wght@0,400..700", weightMin: 400, weightMax: 700 },
] as const;

export const FALLBACK_STACKS = {
  primary: 'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
  secondary: 'Georgia, "Times New Roman", serif',
  // Splendor-inspired: strong readable serif body w/ system fallbacks.
  body: 'Georgia, "Times New Roman", "Nimbus Roman", serif',
  mono: 'ui-monospace, "Cascadia Code", Menlo, Consolas, monospace',
} as const;
