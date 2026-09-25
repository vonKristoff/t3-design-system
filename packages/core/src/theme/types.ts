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

export type FontAssignments = Partial<Record<FontElement, FontRole>>;

export type LayoutMode = "compact" | "minimal" | "wide";

export const LAYOUT_MODES: LayoutMode[] = ["compact", "minimal", "wide"];

/** Content measure for the document canvas. Article ≈ 60ch best practice. */
export type ContentWidth = "article" | "comfortable" | "wide" | "full";

export const CONTENT_WIDTHS: ContentWidth[] = ["article", "comfortable", "wide", "full"];

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
  fontAssignments?: FontAssignments;
  /** Preview/CLI layout mode. Defaults to "compact" when omitted. */
  layout?: LayoutMode;
  /** Document canvas measure. Defaults to "wide" when omitted. */
  width?: ContentWidth;
  /** Component styles. Defaults to { blockquote: "rule" } when omitted. */
  components?: ComponentStyles;
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
