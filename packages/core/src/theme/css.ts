import type { GeneratedTheme } from "./generate-theme.ts";
import {
  CANVAS_SHADE,
  EDGE_SHADE,
  RAISED_SHADE,
  TRAFFIC_EDGE,
  TRAFFIC_TINT,
} from "./readable-pairs.ts";
import { fontStacks } from "../typography/fonts.ts";
import { fluidClamp, FLUID_SIZES } from "../typography/fluid.ts";
import type {
  BreakoutElement,
  BreakoutLevel,
  Breakouts,
  FontElement,
  SizeValue,
  ThemeOptions,
} from "./types.ts";
import { CHROMATIC_NAMES, SCALE_STEPS, SEMANTIC_NAMES } from "./types.ts";

export interface ThemeFiles {
  "root.css": string;
  "fonts.css": string;
  "base.css": string;
  "typography.css": string;
  "markdown.css": string;
  "layout.css": string;
  /** Tailwind v4 bridge. Absent when the theme opts out via tailwindBridge. */
  "tw-bridge.css"?: string;
  "index.css": string;
}

const ELEMENT_VAR: Record<FontElement, string> = {
  h1: "--font-h1",
  h2: "--font-h2",
  h3: "--font-h3",
  h4: "--font-h4",
  h5: "--font-h5",
  h6: "--font-h6",
  p: "--font-p",
  list: "--font-list",
  blockquote: "--font-blockquote",
  code: "--font-code",
};

const DEFAULT_ROLE: Record<FontElement, "primary" | "secondary" | "tertiary"> = {
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
};

/**
 * Breakout grid (single setup, always full to its parent so it drops into
 * sidebars, cards and embeds unchanged). The measure lives in the center
 * track, tuned per width via --content-max.
 *
 * Feature levels are gated by data-grid on the .content-grid container:
 *   blank (absent/"")  single column fallback — every child is content
 *   "breakout"         .breakout children span the breakout tracks
 *   "full"             additionally, .full-width children span full
 */
export function generateLayoutCss(): string {
  return `/* Layout: content grid, hooked by [data-grid] (blank = default).
   The grid is opt-in by attribute; .breakout / .full-width and element
   routing decide what breaks out. Band sizes come from --content-size /
   --breakout-size (value + unit). */
[data-grid] { display: grid; width: 100%; grid-template-columns:
  [full-start] minmax(0, 1fr)
  [breakout-start] minmax(0, var(--breakout-size, 6%))
  [content-start] minmax(0, var(--content-size, 70%))
  [content-end]
  minmax(0, var(--breakout-size, 6%))
  [breakout-end] minmax(0, 1fr) [full-end]; }
[data-grid] > * { grid-column: content; min-width: 0; }
[data-grid] > .breakout { grid-column: breakout; }
[data-grid] > .full-width { grid-column: full; }
/* Replaced elements don't stretch to grid tracks by default — make images
   fill whichever track routing assigns them. */
[data-grid] > img { display: block; width: 100%; height: auto; margin-bottom: 1.3rem; }
[data-grid] .breakout img, [data-grid] .full-width img { display: block; width: 100%; height: auto; }
/* Full-bleed images run edge to edge: no radius. */
[data-grid] > .full-width img { border-radius: 0; }
@media (max-width: 40rem) {
  [data-grid] { grid-template-columns: [full-start] 0 [breakout-start] 0 [content-start] minmax(0, 100%) [content-end] 0 [breakout-end] 0 [full-end]; padding-inline: 1.25rem; }
}`;
}

/**
 * Every callout variant. The base component rules target this whole group so
 * a modifier class works standalone (`class="callout-stop"`), and each
 * variant only overrides its surface, border, ink and badge glyph.
 */
const CALLOUTS =
  ":is(.markdown .callout, .markdown .callout-pop, .markdown .callout-stop, .markdown .callout-warning, .markdown .callout-ok)";

const BREAKOUT_SELECTOR: Record<BreakoutElement, string> = {
  blockquote: "blockquote",
  table: "table",
  pre: "pre",
  img: "img",
  callout: ".callout",
  hr: "hr",
};

/**
 * Route markdown structures to grid tracks by element. Authors keep using
 * plain markdown (no wrapper divs required); the grid is always on, so this
 * routing is the single source of truth for what breaks out.
 */
export function generateRoutingCss(breakouts: Breakouts): string {
  const breakoutSel: string[] = [];
  const fullSel: string[] = [];
  const fullImg: string[] = [];
  for (const el of Object.keys(BREAKOUT_SELECTOR) as BreakoutElement[]) {
    const level: BreakoutLevel = breakouts[el] ?? "content";
    const s = BREAKOUT_SELECTOR[el];
    if (level === "breakout") {
      breakoutSel.push(`[data-grid] > ${s}`);
    }
    if (level === "full") {
      fullSel.push(`[data-grid] > ${s}`);
      // Full-bleed images run edge to edge: no radius.
      if (el === "img") fullImg.push(`[data-grid] > ${s}`);
    }
  }
  const lines: string[] = ["/* Element breakout routing. */"];
  if (breakoutSel.length) lines.push(`${breakoutSel.join(",\n")} { grid-column: breakout; }`);
  if (fullSel.length) lines.push(`${fullSel.join(",\n")} { grid-column: full; }`);
  if (fullImg.length) lines.push(`${fullImg.join(",\n")} { border-radius: 0; }`);
  return lines.join("\n");
}

/** data-grid feature level for a layout mode. */
/**
 * Class contract for the document shell. The shell carries data-grid (the
 * opt-in hook) and its direct children are the content, so the builder and
 * the shipped CSS stay in lockstep.
 */
export function docShellClasses(): string {
  return `tsb-doc`;
}

/**
 * Document canvas measure, expressed as the grid's content track so the
 * measure rule ships with the system. Article ≈ 60ch best practice.
 */
export function generateWidthCss(width: SizeValue, breakout: SizeValue): string {
  const size = (s: SizeValue) => `${s.value}${s.unit}`;
  // "full"-style bleeding: a single track, line names retained for routing.
  const fullOverride =
    width.unit === "%" && width.value >= 100
      ? `\n.tsb-doc.content-grid { grid-template-columns: [full-start] 0 [breakout-start] 0 [content-start] minmax(0, 1fr) [content-end] 0 [breakout-end] 0 [full-end]; }`
      : "";
  return `/* Content ${size(width)}; breakout +${size(breakout)} per side. */
.tsb-doc { --content-size: ${size(width)}; --breakout-size: ${size(breakout)}; margin-inline: auto; min-width: 0; padding-block: 2.5rem; background: var(--base); color: var(--prose-on-base); }
/* Grid items never collapse margins, so rhythm is single-direction: tops are
   zeroed here (layout ships last, so this wins ties) and each block carries
   only its bottom margin — the same spacing collapsing would have produced. */
.tsb-doc > * { margin-top: 0; }${fullOverride}`;
}

export function fontRoleVars(options: ThemeOptions): Record<string, string> {
  const stacks = fontStacks(options);
  const out: Record<string, string> = {};
  const els: FontElement[] = ["h1","h2","h3","h4","h5","h6","p","list","blockquote","code"];
  for (const el of els) {
    const role = options.fontAssignments?.[el] ?? DEFAULT_ROLE[el];
    const stack = role === "primary" ? stacks.primary : role === "secondary" ? stacks.secondary : stacks.tertiary ?? "ui-monospace, Menlo, Consolas, monospace";
    out[ELEMENT_VAR[el]] = `var(--font-${role}${role === "tertiary" && !stacks.tertiary ? ", monospace" : ""})`;
    // Resolve to concrete stack so preview works even without CSS var chaining issues:
    out[ELEMENT_VAR[el]] = stack;
  }
  return out;
}

/** Concrete variable-font weight per element: element override > role > 400. */
export function fontWeightVars(options: ThemeOptions): Record<string, number> {
  const out: Record<string, number> = {};
  const els: FontElement[] = ["h1","h2","h3","h4","h5","h6","p","list","blockquote","code"];
  for (const el of els) {
    const role = options.fontAssignments?.[el] ?? DEFAULT_ROLE[el];
    out[`${ELEMENT_VAR[el]}-weight`] =
      options.elementWeights?.[el] ?? options.weights?.[role] ?? 400;
  }
  return out;
}

export function generateThemeFiles(options: ThemeOptions, gen: GeneratedTheme, fontsCss: string): ThemeFiles {
  const roleVars = fontRoleVars(options);
  const weightVars = fontWeightVars(options);
  const pct = (w: number) => `${Math.round(w * 100)}%`;

  const rootCss =
    gen.rootCss.replace(/\}$/, "") +
    `\n  --font-primary: ${fontStacks(options).primary};\n  --font-secondary: ${fontStacks(options).secondary};` +
    (fontStacks(options).tertiary ? `\n  --font-tertiary: ${fontStacks(options).tertiary};` : "") +
    Object.entries(roleVars).map(([k, v]) => `\n  ${k}: ${v};`).join("") +
    Object.entries(weightVars).map(([k, v]) => `\n  ${k}: ${v};`).join("") +
    "\n}";

  const baseCss = `/* Base document styles — semantic variables only, no hardcoded palette.
   Surfaces shade via color-mix with --prose so a dark canvas stays dark:
   the canvas is always exactly the chosen --base, never an assumed rung. */
html { background: color-mix(in srgb, var(--prose) ${pct(CANVAS_SHADE)}, var(--base)); }
body {
  margin: 0;
  background: var(--base);
  color: var(--prose-on-base);
  font-family: var(--font-p, var(--font-primary));
}
a { color: var(--accent-on-base); }
a:hover { color: var(--accent-hover-on-base); }
hr { border: 0; border-top: 1px solid color-mix(in srgb, var(--prose) ${pct(EDGE_SHADE)}, var(--alt)); margin-bottom: 1.3rem; }
.glass-panel {
  background: var(--glass);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid color-mix(in srgb, var(--prose) ${pct(EDGE_SHADE)}, var(--alt));
  border-radius: 0.75rem;
}
img { max-width: 100%; border-radius: 0.5rem; }
/* Full-bleed preview band: matches the html background so themed
   documents read as a continuous canvas. */
.preview { background: color-mix(in srgb, var(--prose) ${pct(CANVAS_SHADE)}, var(--base)); }
`;

  const fluid = (el: keyof typeof FLUID_SIZES): string => {
    const [min, max] = FLUID_SIZES[el];
    return fluidClamp(min, max);
  };

  const typographyCss = `/* Typography — Splendor-inspired fallback (markdowncss/splendor), custom fonts override via roles.
   Splendor: Merriweather/Georgia serif body, modular heading scale, generous line-height.
   Sizes are fluid (tolin-style clamp over 360–1280px viewports); desktop max = Splendor scale. */
.markdown { font-size: 1.05rem; font-optical-sizing: auto; }
.markdown h1, .markdown h2, .markdown h3, .markdown h4 { margin: 0 0 0.5rem; font-weight: inherit; line-height: normal; text-wrap: balance; overflow-wrap: anywhere; }
.markdown h5, .markdown h6 { overflow-wrap: anywhere; }
.markdown h1 { font-family: var(--font-h1); font-weight: var(--font-h1-weight, 400); font-size: ${fluid("h1")}; margin-top: 0; }
.markdown h2 { font-family: var(--font-h2); font-weight: var(--font-h2-weight, 400); font-size: ${fluid("h2")}; }
.markdown h3 { font-family: var(--font-h3); font-weight: var(--font-h3-weight, 400); font-size: ${fluid("h3")}; }
.markdown h4 { font-family: var(--font-h4); font-weight: var(--font-h4-weight, 400); font-size: ${fluid("h4")}; }
.markdown h5 { font-family: var(--font-h5); font-weight: var(--font-h5-weight, 400); font-size: ${fluid("h5")}; }
.markdown h6 { font-family: var(--font-h6); font-weight: var(--font-h6-weight, 400); font-size: ${fluid("h6")}; }
.markdown p, .markdown li { font-family: var(--font-p); font-weight: var(--font-p-weight, 400); color: var(--prose-on-base); line-height: normal; font-size: ${fluid("p")}; text-wrap: pretty; overflow-wrap: anywhere; }
.markdown p { margin-bottom: 1.3rem; }
.markdown ul, .markdown ol { font-family: var(--font-list); font-weight: var(--font-list-weight, 400); margin-bottom: 1.3rem; }
.markdown li { margin-left: 0.5rem; }
.markdown strong { color: inherit; font-weight: 700; }
.markdown em { color: inherit; font-style: italic; }
.markdown small { font-size: 0.707em; }
`;

  const markdownCss = `/* Markdown structures — all semantic.
   Blockquote variant is selected by a container class: .bq-rule (default),
   .bq-pull (large centered pull-quote) or .bq-minimal (plain indent). */
.markdown blockquote {
  font-family: var(--font-blockquote);
  margin: 0 0 1rem;
}
.markdown blockquote p { margin-bottom: 0; }
.markdown.bq-rule blockquote {
  color: var(--prose-on-quote);
  background: var(--alt);
  border-left: 4px solid var(--accent);
  padding: 0.75rem 1rem;
  border-radius: 0 0.5rem 0.5rem 0;
}
.markdown.bq-rule blockquote p { font-size: ${fluid("blockquote")}; font-style: italic; font-weight: var(--font-blockquote-weight, 400); }
.markdown.bq-pull blockquote {
  color: var(--prose-on-base);
  background: transparent;
  border: 0;
  padding: 1.5rem 1rem;
  text-align: center;
}
.markdown.bq-pull blockquote p { font-size: ${fluid("h3")}; font-style: italic; line-height: normal; font-weight: var(--font-blockquote-weight, 400); }
.markdown.bq-minimal blockquote {
  color: var(--prose-on-quote-soft);
  background: transparent;
  border: 0;
  padding: 0.25rem 0 0.25rem 1rem;
}
.markdown.bq-minimal blockquote p { font-size: ${fluid("blockquote")}; font-style: italic; font-weight: var(--font-blockquote-weight, 400); }
.markdown pre {
  font-family: var(--font-code);
  font-weight: var(--font-code-weight, 400);
  background: var(--alt-950);
  color: var(--pre-on-ink);
  font-size: ${fluid("code")};
  border-radius: 0.5rem;
  overflow-x: auto;
  max-width: 100%;
  margin-bottom: 1.3rem;
  padding: 1.125em;
}
/* Inline code wraps mid-token so long names and payloads can never force a
   horizontal overflow; code inside pre keeps white-space: pre and scrolls. */
.markdown code { font-family: var(--font-code); background: color-mix(in srgb, var(--prose) ${pct(RAISED_SHADE)}, var(--alt)); color: var(--prose-on-alt); padding: 0.1em 0.35em; border-radius: 0.3rem; overflow-wrap: anywhere; }
.markdown pre code { background: transparent; color: inherit; padding: 0; }
/* Tables always fill their track (auto layout shares leftover width, so no
   lopsided trailing space); cells wrap mid-token when squeezed, which also
   keeps long values from blowing out the grid track on narrow screens. */
.markdown table { width: 100%; margin-bottom: 1.3rem; border-collapse: collapse; font-family: var(--font-p); }.markdown th { background: color-mix(in srgb, var(--prose) ${pct(RAISED_SHADE)}, var(--alt)); color: var(--prose-on-alt); text-align: left; }
.markdown th, .markdown td { border: 1px solid color-mix(in srgb, var(--prose) ${pct(EDGE_SHADE)}, var(--alt)); padding: 0.5rem 0.75rem; overflow-wrap: anywhere; }
.markdown tbody tr:nth-child(even) { background: var(--alt); }
.markdown ul { list-style: disc; padding-left: 1.5rem; }
.markdown ol { list-style: decimal; padding-left: 1.5rem; }
.markdown ul ul { list-style: circle; }
.markdown ol ol, .markdown ul ol { list-style: lower-roman; }
.markdown li { margin: 0.25rem 0; }
.markdown li::marker { color: var(--accent-on-base); }
/* Callouts share the language of blockquotes, tables and code: the same
   radius, border and type rhythm, plus a leading icon badge. Surfaces are
   derived from the theme anchors (tints over --base), so they keep the
   theme's polarity instead of assuming a light canvas. A strong first child
   reads as an optional title line.
   The base rules target the whole family, so a modifier can be used on its
   own — a lone callout-stop class needs no callout companion. */
${CALLOUTS} {
  position: relative;
  border-radius: 0.75rem;
  padding: 1rem 1.25rem 1rem 3.25rem;
  margin: 0 0 1.5rem;
  overflow-wrap: anywhere;
  background: var(--alt);
  border: 1px solid color-mix(in srgb, var(--prose) ${pct(EDGE_SHADE)}, var(--alt));
  color: var(--prose-on-quote);
}
${CALLOUTS} > strong:first-child { display: block; margin-bottom: 0.25rem; color: inherit; }
${CALLOUTS}::before {
  content: "i";
  position: absolute;
  left: 1rem;
  top: 1rem;
  display: grid;
  place-items: center;
  width: 1.6rem;
  height: 1.6rem;
  border-radius: 9999px;
  background: var(--accent);
  color: var(--inverse-on-accent);
  font-family: var(--font-p);
  font-size: 0.95rem;
  font-weight: 700;
  font-style: italic;
  line-height: 1;
}
.markdown .callout-pop {
  background: var(--pop);
  border-color: var(--pop);
  color: var(--inverse-on-pop);
}
.markdown .callout-pop::before {
  content: "★";
  background: rgb(0 0 0 / 0.22);
  color: inherit;
  font-style: normal;
}
.markdown .callout-stop {
  background: color-mix(in srgb, var(--traffic-stop) ${pct(TRAFFIC_TINT)}, var(--base));
  border-color: color-mix(in srgb, var(--traffic-stop) ${pct(TRAFFIC_EDGE)}, var(--base));
  color: var(--traffic-stop-on-callout);
}
.markdown .callout-stop::before { content: "✕"; background: var(--traffic-stop); color: var(--traffic-stop-on-fill); font-style: normal; }
.markdown .callout-warning {
  background: color-mix(in srgb, var(--traffic-warning) ${pct(TRAFFIC_TINT)}, var(--base));
  border-color: color-mix(in srgb, var(--traffic-warning) ${pct(TRAFFIC_EDGE)}, var(--base));
  color: var(--traffic-warning-on-callout);
}
.markdown .callout-warning::before { content: "!"; background: var(--traffic-warning); color: var(--traffic-warning-on-fill); font-style: normal; }
.markdown .callout-ok {
  background: color-mix(in srgb, var(--traffic-ok) ${pct(TRAFFIC_TINT)}, var(--base));
  border-color: color-mix(in srgb, var(--traffic-ok) ${pct(TRAFFIC_EDGE)}, var(--base));
  color: var(--traffic-ok-on-callout);
}
.markdown .callout-ok::before { content: "✓"; background: var(--traffic-ok); color: var(--traffic-ok-on-fill); font-style: normal; }
.markdown .pop { color: var(--pop); }
.markdown .muted { color: var(--muted-on-base); }
/* Stacked images keep breathing room, in and out of the grid. Tops are zeroed
   on grid children, so the pair rides the first image's bottom margin. */
.markdown img + img { margin-top: 0; }
`;

  const includeBridge = options.tailwindBridge !== false;
  const bridge: string[] = [
    "/* Tailwind v4 semantic bridge — every generated variable re-exposed, so",
    "   components use utilities (bg-base-50, text-prose-800, bg-twist-light)",
    "   instead of raw values. Hand-edit after generation as needed. */",
    '@import "tailwindcss";',
    "",
    "@theme inline {",
  ];
  for (const sem of [...SEMANTIC_NAMES, ...CHROMATIC_NAMES]) {
    // Bare `base` would collide with the `text-base` font-size utility.
    if (sem !== "base") bridge.push(`  --color-${sem}: var(--${sem});`);
    bridge.push(`  --color-${sem}-light: var(--${sem}-light);`);
    bridge.push(`  --color-${sem}-dark: var(--${sem}-dark);`);
    for (const step of SCALE_STEPS) {
      bridge.push(`  --color-${sem}-${step}: var(--${sem}-${step});`);
    }
  }
  // Readable text-on-surface pairs, e.g. `text-prose-on-base`.
  for (const name of Object.keys(gen.pairs)) {
    bridge.push(`  --color-${name.slice(2)}: var(${name});`);
  }
  // Twist trio, canonical and short names.
  for (const [token, ref] of [
    ["pop-twist", "--pop-twist"],
    ["pop-twist-light", "--pop-twist-light"],
    ["pop-twist-dark", "--pop-twist-dark"],
    ["twist", "--pop-twist"],
    ["twist-light", "--pop-twist-light"],
    ["twist-dark", "--pop-twist-dark"],
  ] as const) {
    bridge.push(`  --color-${token}: var(${ref});`);
  }
  bridge.push(`  --font-primary: var(--font-primary);`);
  bridge.push(`  --font-secondary: var(--font-secondary);`);
  if (fontStacks(options).tertiary) bridge.push(`  --font-tertiary: var(--font-tertiary);`);
  bridge.push("}");
  const tailwindCss = bridge.join("\n") + "\n";

  const layoutCss =
    generateLayoutCss() +
    "\n" +
    generateWidthCss(options.width ?? { value: 70, unit: "%" }, options.breakout ?? { value: 6, unit: "%" }) +
    "\n" +
    generateRoutingCss(options.breakouts ?? {});

  const indexParts = ["root.css", "fonts.css", "base.css", "typography.css", "markdown.css", "layout.css"];
  if (includeBridge) indexParts.push("tw-bridge.css");
  const indexCss = indexParts.map((f) => `@import "./${f}";`).join("\n") + "\n";

  const files: ThemeFiles = {
    "root.css": rootCss,
    "fonts.css": fontsCss,
    "base.css": baseCss,
    "typography.css": typographyCss,
    "markdown.css": markdownCss,
    "layout.css": layoutCss,
    "index.css": indexCss,
  };
  if (includeBridge) files["tw-bridge.css"] = tailwindCss;
  return files;
}
