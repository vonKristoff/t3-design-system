export type FontRole = "primary" | "secondary" | "tertiary";

export type FontElement =
  | "h1"
  | "h2"
  | "h3"
  | "h4"
  | "h5"
  | "h6"
  | "p"
  | "list"
  | "blockquote"
  | "code";

export const PAYLOAD_VERSION = 1;

export interface ThemeColors {
  base: string;
  alt: string;
  prose: string;
  accent: string;
  brandPrimary: string;
  brandSecondary: string;
  trafficStop: string;
  trafficWarning: string;
  trafficOk: string;
}

export interface ThemeFonts {
  primary?: string;
  secondary?: string;
  tertiary?: string;
}

/** Variable-font weight per role (100–1000). Absent means 400. */
export type FontWeights = Partial<Record<FontRole, number>>;

/** Per-element weight override (100–1000). Wins over the role weight. */
export type ElementWeights = Partial<Record<FontElement, number>>;

export type FontAssignments = Partial<Record<FontElement, FontRole>>;

/** Content measure / breakout extent, expressed as value + unit. */
export const SIZE_UNITS = ["%", "rem", "em", "ch", "px"] as const;

export type SizeUnit = (typeof SIZE_UNITS)[number];

export interface SizeValue {
  value: number;
  unit: SizeUnit;
}

/** How far breakouts extend beyond the content measure (per side). */

/** Markdown structures that can be routed to a grid track. */
export const BREAKOUT_ELEMENTS = ["blockquote", "table", "pre", "img", "callout", "hr"] as const;

export type BreakoutElement = (typeof BREAKOUT_ELEMENTS)[number];

export type BreakoutLevel = "content" | "breakout" | "full";

export type Breakouts = Partial<Record<BreakoutElement, BreakoutLevel>>;

/** First component-style dimension; cards/accordions/dialogs can follow. */
export type BlockquoteVariant = "rule" | "pull" | "minimal";

export const BLOCKQUOTE_VARIANTS: BlockquoteVariant[] = ["rule", "pull", "minimal"];

export interface ComponentStyles {
  blockquote?: BlockquoteVariant;
}

/**
 * Hue-bounce experiment knobs. All optional — absent means the default.
 * When disabled, readable picks stay exactly as derived (no hue rotation).
 */
export interface BounceOptions {
  enabled?: boolean;
  /** Complementary rotation in degrees. Default 180. */
  hueShift?: number;
  /** Bounce only when the anchor family is at least this chromatic. Default 0.03. */
  minAnchorC?: number;
  /** Bounce only when the picked rung is greyer than this. Default 0.03. */
  maxPickC?: number;
  /** Bounced render must reach at least this chroma. Default 0.05. */
  minRenderC?: number;
  /** Bounced render must stay within this hue drift. Default 40. */
  maxDrift?: number;
}

export interface Experiments {
  hueBounce?: BounceOptions;
}

export interface ThemeOptions {
  version: number;
  colors: ThemeColors;
  fonts: ThemeFonts;
  weights?: FontWeights;
  /** Per-element weight overrides, e.g. h1 heavier than p. */
  elementWeights?: ElementWeights;
  fontAssignments?: FontAssignments;
  /** Content measure. Defaults to { value: 70, unit: "%" }. */
  width?: SizeValue;
  /** Breakout extension beyond content, per side. Defaults to { value: 6, unit: "%" }. */
  breakout?: SizeValue;
  /** Per-element grid track routing. Defaults applied when omitted. */
  breakouts?: Breakouts;
  /** Component styles. Defaults to { blockquote: "rule" } when omitted. */
  components?: ComponentStyles;
  /** Experiment flags. Defaults to hue bounce enabled. */
  experiments?: Experiments;
}

export type ScaleStep =
  | "50"
  | "100"
  | "200"
  | "300"
  | "400"
  | "500"
  | "600"
  | "700"
  | "800"
  | "900"
  | "950";

export const SCALE_STEPS: ScaleStep[] = [
  "50",
  "100",
  "200",
  "300",
  "400",
  "500",
  "600",
  "700",
  "800",
  "900",
  "950",
];

export type ColorScale = Record<ScaleStep, string>;

/**
 * Constrained relative scale: the exact anchor plus two fixed lightness
 * steps either side. Emitted as --{semantic}, --{semantic}-light-1/2,
 * --{semantic}-dark-1/2.
 */
export interface RelativeScale {
  base: string;
  "light-1": string;
  "light-2": string;
  "dark-1": string;
  "dark-2": string;
}

export const RELATIVE_KEYS = ["light-1", "light-2", "dark-1", "dark-2"] as const;

export type RelativeKey = (typeof RELATIVE_KEYS)[number];

export const SEMANTIC_NAMES = [
  "base",
  "alt",
  "prose",
  "accent",
  "brand-primary",
  "brand-secondary",
  "traffic-stop",
  "traffic-warning",
  "traffic-ok",
] as const;

export type SemanticName = (typeof SEMANTIC_NAMES)[number];
