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
  glass: string;
  prose: string;
  muted: string;
  accent: string;
  pop: string;
  inverse: string;
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

/** Frosted-surface opacity. Absent means GLASS_ALPHA_DEFAULT. */
export type GlassAlpha = number;

export const GLASS_ALPHA_DEFAULT = 0.85;

/**
 * Pop twist tweaks, applied on top of the automatic +35° rotation.
 * Hue offset in degrees (-15..15); saturation as relative percent (-15..15).
 */
export interface Twist {
  hue?: number;
  saturation?: number;
}

export const TWIST_BASE_HUE = 35;

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
  /**
   * Swappable text source for body copy. Defaults to prose/base (auto-derived
   * readable); set to render body text from another established swatch.
   */
  textSource?: TextSource;
  /** Frosted-surface opacity 0..1. Absent means GLASS_ALPHA_DEFAULT. */
  glassAlpha?: GlassAlpha;
  /** Pop twist tweaks on top of the automatic +35° rotation. */
  twist?: Twist;
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
 * Constrained relative scale: the anchor plus one fixed lightness step
 * either side. Emitted as --{semantic}, --{semantic}-light, --{semantic}-dark.
 *
 * End-anchoring: when the anchor sits too close to white (or black) for a
 * step to fit, the anchor itself occupies the extreme slot and the rest
 * derive backwards — e.g. a red-50 pick becomes prose-light, with prose and
 * prose-dark generated darker. The trio always spans light→dark.
 */
export interface RelativeScale {
  base: string;
  light: string;
  dark: string;
}

export const RELATIVE_KEYS = ["light", "dark"] as const;

export type RelativeKey = (typeof RELATIVE_KEYS)[number];

/** Which relative state supplies body-copy text. Defaults to prose/base. */
export interface TextSource {
  sem: SemanticName;
  level: RelativeKey | "base";
}

export const SEMANTIC_NAMES = [
  "base",
  "alt",
  "glass",
  "prose",
  "muted",
  "accent",
  "pop",
  "inverse",
  "traffic-stop",
  "traffic-warning",
  "traffic-ok",
] as const;

export type SemanticName = (typeof SEMANTIC_NAMES)[number];

/** Fixed chromatics: absolute anchors, still granted full generated ranges. */
export const CHROMATIC_NAMES = ["black", "white"] as const;

export type ChromaticName = (typeof CHROMATIC_NAMES)[number];

export const CHROMATIC_HEX: Record<ChromaticName, string> = {
  black: "#000000",
  white: "#ffffff",
};

/** Rung each fixed anchor pins to: black lives at the bottom, white at the top. */
export const CHROMATIC_ANCHOR_STEP: Record<ChromaticName, ScaleStep> = {
  black: "950",
  white: "50",
};

/** Semantic name → ThemeOptions.colors key. */
export const SEMANTIC_TO_OPTION = {
  base: "base",
  alt: "alt",
  glass: "glass",
  prose: "prose",
  muted: "muted",
  accent: "accent",
  pop: "pop",
  inverse: "inverse",
  "traffic-stop": "trafficStop",
  "traffic-warning": "trafficWarning",
  "traffic-ok": "trafficOk",
} as const satisfies Record<SemanticName, keyof ThemeColors>;
