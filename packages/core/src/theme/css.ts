import type { GeneratedTheme } from "./generate-theme.ts";
import { fontStacks } from "../typography/fonts.ts";
import { fluidClamp, FLUID_SIZES } from "../typography/fluid.ts";
import type {
  BreakoutElement,
  BreakoutLevel,
  BreakoutWidth,
  Breakouts,
  ContentWidth,
  FontElement,
  LayoutMode,
  ThemeOptions,
} from "./types.ts";

export interface ThemeFiles {
  "root.css": string;
  "fonts.css": string;
  "base.css": string;
  "typography.css": string;
  "markdown.css": string;
  "layout.css": string;
  "tailwind.css": string;
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
  return `/* Layout: always-on content-grid. Routing decides what breaks out.
   Tracks are proportional to the container (with the rem measure as a cap),
   so bands stay distinct at any viewport and the grid drops into any parent. */
.content-grid { display: grid; width: 100%; grid-template-columns:
  [full-start] minmax(0, 1fr)
  [breakout-start] minmax(0, var(--breakout-pct, 6%))
  [content-start] minmax(0, min(var(--content-max, 72rem), var(--content-pct, 70%)))
  [content-end]
  minmax(0, var(--breakout-pct, 6%))
  [breakout-end] minmax(0, 1fr) [full-end]; }
.content-grid > * { grid-column: content; min-width: 0; }
.content-grid > .breakout { grid-column: breakout; }
.content-grid > .full-width { grid-column: full; }
/* Replaced elements don't stretch to grid tracks by default — make images
   fill whichever track routing assigns them. */
.content-grid > img { display: block; width: 100%; height: auto; }
.content-grid .breakout img, .content-grid .full-width img { display: block; width: 100%; height: auto; }
@media (max-width: 40rem) {
  .content-grid { grid-template-columns: [full-start] 0 [breakout-start] 0 [content-start] minmax(0, 100%) [content-end] 0 [breakout-end] 0 [full-end]; padding-inline: 1.25rem; }
}`;
}

const BREAKOUT_PCT: Record<BreakoutWidth, string> = {
  none: "0%",
  snug: "3%",
  medium: "6%",
  wide: "10%",
};

const CONTENT_PCT: Record<ContentWidth, string> = {
  article: "55%",
  comfortable: "62%",
  wide: "70%",
  full: "100%",
};

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
  for (const el of Object.keys(BREAKOUT_SELECTOR) as BreakoutElement[]) {
    const level: BreakoutLevel = breakouts[el] ?? "content";
    const s = BREAKOUT_SELECTOR[el];
    if (level === "breakout") {
      breakoutSel.push(`.content-grid > ${s}`);
    }
    if (level === "full") {
      fullSel.push(`.content-grid > ${s}`);
    }
  }
  const lines: string[] = ["/* Element breakout routing. */"];
  if (breakoutSel.length) lines.push(`${breakoutSel.join(",\n")} { grid-column: breakout; }`);
  if (fullSel.length) lines.push(`${fullSel.join(",\n")} { grid-column: full; }`);
  return lines.join("\n");
}

/** data-grid feature level for a layout mode. */
/**
 * Class contract for the document shell. The grid must sit on the element
 * whose direct children are the content (breakout/full-width targets), so
 * the builder and the shipped CSS stay in lockstep.
 */
export function docShellClasses(width: ContentWidth): string {
  return `tsb-doc content-grid tsb-width-${width}`;
}

/**
 * Document canvas measure, expressed as the grid's content track so the
 * measure rule ships with the system. Article ≈ 60ch best practice.
 */
export function generateWidthCss(width: ContentWidth, breakout: BreakoutWidth): string {
  const max =
    width === "article" ? "60ch" :
    width === "comfortable" ? "48rem" :
    width === "wide" ? "72rem" : "100%";
  // "full" has no room for gutters: collapse the grid to a single track
  // (line names retained so routing selectors stay valid).
  const fullOverride =
    width === "full"
      ? `\n.tsb-doc.content-grid { grid-template-columns: [full-start] 0 [breakout-start] 0 [content-start] minmax(0, 1fr) [content-end] 0 [breakout-end] 0 [full-end]; }`
      : "";
  return `/* Content width: ${width}; breakout: ${breakout}. */
.tsb-doc { --content-max: ${max}; --content-pct: ${CONTENT_PCT[width]}; --breakout-pct: ${BREAKOUT_PCT[breakout]}; margin-inline: auto; padding-block: 2.5rem; background: var(--base-50); color: var(--prose-800); }${fullOverride}`;
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

  const rootCss =
    gen.rootCss.replace(/\}$/, "") +
    `\n  --font-primary: ${fontStacks(options).primary};\n  --font-secondary: ${fontStacks(options).secondary};` +
    (fontStacks(options).tertiary ? `\n  --font-tertiary: ${fontStacks(options).tertiary};` : "") +
    Object.entries(roleVars).map(([k, v]) => `\n  ${k}: ${v};`).join("") +
    Object.entries(weightVars).map(([k, v]) => `\n  ${k}: ${v};`).join("") +
    "\n}";

  const baseCss = `/* Base document styles — semantic variables only, no hardcoded palette. */
html { background: var(--base-100); }
body {
  margin: 0;
  background: var(--base-50);
  color: var(--prose-800);
  font-family: var(--font-p, var(--font-primary));
}
a { color: var(--accent-600); }
a:hover { color: var(--accent-700); }
hr { border: 0; border-top: 1px solid var(--alt-300); }
img { max-width: 100%; border-radius: 0.5rem; }
/* Full-bleed preview band: matches the html background so themed
   documents read as a continuous canvas. */
.preview { background: var(--base-100); }
`;

  const fluid = (el: keyof typeof FLUID_SIZES): string => {
    const [min, max] = FLUID_SIZES[el];
    return fluidClamp(min, max);
  };

  const typographyCss = `/* Typography — Splendor-inspired fallback (markdowncss/splendor), custom fonts override via roles.
   Splendor: Merriweather/Georgia serif body, modular heading scale, generous line-height.
   Sizes are fluid (tolin-style clamp over 360–1280px viewports); desktop max = Splendor scale. */
.markdown { font-size: 1.05rem; font-optical-sizing: auto; }
.markdown h1, .markdown h2, .markdown h3, .markdown h4 { margin: 1.414rem 0 0.5rem; font-weight: inherit; line-height: normal; text-wrap: balance; }
.markdown h1 { font-family: var(--font-h1); font-weight: var(--font-h1-weight, 400); font-size: ${fluid("h1")}; margin-top: 0; }
.markdown h2 { font-family: var(--font-h2); font-weight: var(--font-h2-weight, 400); font-size: ${fluid("h2")}; }
.markdown h3 { font-family: var(--font-h3); font-weight: var(--font-h3-weight, 400); font-size: ${fluid("h3")}; }
.markdown h4 { font-family: var(--font-h4); font-weight: var(--font-h4-weight, 400); font-size: ${fluid("h4")}; }
.markdown h5 { font-family: var(--font-h5); font-weight: var(--font-h5-weight, 400); font-size: ${fluid("h5")}; }
.markdown h6 { font-family: var(--font-h6); font-weight: var(--font-h6-weight, 400); font-size: ${fluid("h6")}; }
.markdown p, .markdown li { font-family: var(--font-p); font-weight: var(--font-p-weight, 400); color: var(--prose-800); line-height: normal; font-size: ${fluid("p")}; text-wrap: pretty; }
.markdown p { margin-bottom: 1.3rem; }
.markdown ul, .markdown ol { font-family: var(--font-list); font-weight: var(--font-list-weight, 400); }
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
  margin: 1rem 0;
}
.markdown blockquote p { margin-bottom: 0; }
.markdown.bq-rule blockquote {
  color: var(--prose-700);
  background: var(--alt-100);
  border-left: 4px solid var(--accent-500);
  padding: 0.75rem 1rem;
  border-radius: 0 0.5rem 0.5rem 0;
}
.markdown.bq-rule blockquote p { font-size: ${fluid("blockquote")}; font-style: italic; font-weight: var(--font-blockquote-weight, 400); }
.markdown.bq-pull blockquote {
  color: var(--prose-800);
  background: transparent;
  border: 0;
  padding: 1.5rem 1rem;
  text-align: center;
}
.markdown.bq-pull blockquote p { font-size: ${fluid("h3")}; font-style: italic; line-height: normal; font-weight: var(--font-blockquote-weight, 400); }
.markdown.bq-minimal blockquote {
  color: var(--prose-600);
  background: transparent;
  border: 0;
  padding: 0.25rem 0 0.25rem 1rem;
}
.markdown.bq-minimal blockquote p { font-size: ${fluid("blockquote")}; font-style: italic; font-weight: var(--font-blockquote-weight, 400); }
.markdown pre {
  font-family: var(--font-code);
  font-weight: var(--font-code-weight, 400);
  background: var(--alt-950);
  color: var(--alt-50);
  font-size: ${fluid("code")};
  border-radius: 0.5rem;
  overflow-x: auto;
  padding: 1.125em;
}
.markdown code { font-family: var(--font-code); background: var(--alt-200); color: var(--prose-900); padding: 0.1em 0.35em; border-radius: 0.3rem; }
.markdown pre code { background: transparent; color: inherit; padding: 0; }
.markdown table { width: 100%; border-collapse: collapse; font-family: var(--font-p); }
.markdown th { background: var(--alt-200); color: var(--prose-900); text-align: left; }
.markdown th, .markdown td { border: 1px solid var(--alt-300); padding: 0.5rem 0.75rem; }
.markdown tbody tr:nth-child(even) { background: var(--alt-100); }
.markdown ul { list-style: disc; padding-left: 1.5rem; }
.markdown ol { list-style: decimal; padding-left: 1.5rem; }
.markdown ul ul { list-style: circle; }
.markdown ol ol, .markdown ul ol { list-style: lower-roman; }
.markdown li { margin: 0.25rem 0; }
.markdown li::marker { color: var(--accent-600); }
.markdown .callout { border-radius: 0.5rem; padding: 0.75rem 1rem; margin: 1rem 0; }
.markdown .callout-stop { background: var(--traffic-stop-100); border-left: 4px solid var(--traffic-stop-500); color: var(--traffic-stop-900); }
.markdown .callout-warning { background: var(--traffic-warning-100); border-left: 4px solid var(--traffic-warning-500); color: var(--traffic-warning-900); }
.markdown .callout-ok { background: var(--traffic-ok-100); border-left: 4px solid var(--traffic-ok-500); color: var(--traffic-ok-900); }
.markdown .brand { color: var(--brand-primary); }
.markdown .brand-secondary { color: var(--brand-secondary); }
`;

  const tailwindCss = `/* Tailwind v4 semantic bridge — utilities consume generated variables. */
@import "tailwindcss";

@theme inline {
  --color-base-50: var(--base-50);
  --color-base-100: var(--base-100);
  --color-base-500: var(--base-500);
  --color-base-900: var(--base-900);
  --color-accent-500: var(--accent-500);
  --color-accent-600: var(--accent-600);
  --color-brand-primary: var(--brand-primary-600);
  --color-brand-secondary: var(--brand-secondary-600);
  --color-traffic-stop: var(--traffic-stop-600);
  --color-traffic-warning: var(--traffic-warning-500);
  --color-traffic-ok: var(--traffic-ok-600);
  --font-primary: var(--font-primary);
  --font-secondary: var(--font-secondary);
}
`;

  const layoutCss =
    generateLayoutCss() +
    "\n" +
    generateWidthCss(options.width ?? "wide", options.breakout ?? "medium") +
    "\n" +
    generateRoutingCss(options.breakouts ?? {});

  const indexCss = `@import "./root.css";
@import "./fonts.css";
@import "./base.css";
@import "./typography.css";
@import "./markdown.css";
@import "./layout.css";
`;

  return {
    "root.css": rootCss,
    "fonts.css": fontsCss,
    "base.css": baseCss,
    "typography.css": typographyCss,
    "markdown.css": markdownCss,
    "layout.css": layoutCss,
    "tailwind.css": tailwindCss,
    "index.css": indexCss,
  };
}
