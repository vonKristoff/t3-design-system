import { describe, expect, test } from "bun:test";
import { resolveTailwindHex } from "../src/colors/tailwind-palette.ts";
import { generateRelativeScale, generateScale, parseTailwindStep, RELATIVE_DELTA } from "../src/colors/generate-scale.ts";
import { isValidCssColor, hexToOklch } from "../src/colors/oklch.ts";
import { contrastRatio, cssToHex } from "../src/theme/contrast.ts";
import { READABLE_PAIRS } from "../src/theme/readable-pairs.ts";
import { DEFAULT_THEME } from "../src/theme/defaults.ts";
import { PRESET_THEMES, assertPresetsValid, matchPreset } from "../src/theme/presets.ts";
import { generateTheme } from "../src/theme/generate-theme.ts";
import { generateThemeFiles } from "../src/theme/css.ts";
import { fontWeightVars } from "../src/theme/css.ts";
import { googleFontHref } from "../src/typography/fonts.ts";
import { docShellClasses } from "../src/theme/css.ts";
import { fluidClamp, fluidPreferred } from "../src/typography/fluid.ts";
import { encodeTheme, decodeTheme } from "../src/serialization/theme-payload.ts";
import { validateThemeOptions } from "../src/theme/validate.ts";
import { contrastWarnings } from "../src/theme/contrast.ts";
import { ensureContrast } from "../src/theme/readable-pairs.ts";

describe("colour resolution", () => {
  test("blue-600 resolves", () => {
    expect(resolveTailwindHex("blue-600")).toBe("#2563eb");
  });
  test("red-500 resolves", () => {
    expect(resolveTailwindHex("red-500")).toBe("#ef4444");
  });
});

describe("oklch generation", () => {
  test("scales are valid CSS colours and ordered by lightness", () => {
    const scale = generateScale("blue-600");
    for (const v of Object.values(scale)) {
      expect(isValidCssColor(v)).toBe(true);
    }
    // Lightness ordering: 50 lightest -> 950 darkest
    const ls = (["50","100","200","300","400","500","600","700","800","900","950"] as const).map(
      (s) => hexToOklch(scale[s]).l
    );
    for (let i = 1; i < ls.length; i++) {
      expect(ls[i]).toBeLessThan(ls[i - 1]);
    }
  });
  test("anchor preserved", () => {
    const scale = generateScale("blue-600");
    expect(Object.values(scale)).toContain("#2563eb");
  });
  test("light/dark extremes stay valid", () => {
    for (const name of ["yellow-50", "slate-950"]) {
      const s = generateScale(name);
      for (const v of Object.values(s)) expect(isValidCssColor(v)).toBe(true);
    }
    const dark = generateScale("slate-950");
    for (const v of Object.values(dark)) expect(isValidCssColor(v)).toBe(true);
  });
});

describe("serialization round-trip", () => {
  test("ThemeOptions survives encode/decode", () => {
    const payload = encodeTheme(DEFAULT_THEME);
    expect(/^[A-Za-z0-9\-_]+$/.test(payload)).toBe(true);
    const back = decodeTheme(payload);
    expect(back).toEqual(DEFAULT_THEME);
  });
  test("default theme encodes compactly", () => {
    expect(encodeTheme(DEFAULT_THEME).length).toBeLessThan(60);
  });
  test("modified theme round-trips and stays small", () => {
    const modified = {
      ...structuredClone(DEFAULT_THEME),
      colors: { ...DEFAULT_THEME.colors, accent: "purple-600", pop: "teal-500" },
      fonts: { primary: "DM Sans" },
      width: { value: 60, unit: "ch" as const },
      breakout: { value: 4, unit: "rem" as const },
    };
    const payload = encodeTheme(modified);
    expect(payload.length).toBeLessThan(300);
    expect(decodeTheme(payload)).toEqual(modified);
  });
  test("layout.css carries data-grid hook, routing and content width", () => {
    const gen = generateTheme(DEFAULT_THEME);
    const files = generateThemeFiles(DEFAULT_THEME, gen, "");
    expect(files["layout.css"]).toContain("[data-grid]");
    expect(files["layout.css"]).toContain("[data-grid] > .breakout");
    expect(files["layout.css"]).toContain("[data-grid] > .full-width");
    expect(files["layout.css"]).not.toContain(".content-grid");
    expect(files["layout.css"]).toContain("--content-size: 70%;");
    // Grid must be on the element holding the content items.
    expect(docShellClasses()).toBe("tsb-doc");
    expect(files["layout.css"]).not.toContain(".tsb-doc { padding");
    expect(files["typography.css"]).toContain("line-height: normal");
  });
  test("element breakout routing and breakout width", () => {
    const gen = generateTheme(DEFAULT_THEME);
    const files = generateThemeFiles(DEFAULT_THEME, gen, "");
    expect(files["layout.css"]).toContain("> blockquote,");
    expect(files["layout.css"]).toContain("grid-column: breakout;");
    expect(files["layout.css"]).toContain("--breakout-size: 6%;");
    // Images default to full-bleed.
    expect(files["layout.css"]).toContain("> img { grid-column: full; }");
    const routed = {
      ...structuredClone(DEFAULT_THEME),
      breakout: { value: 10, unit: "%" as const },
      breakouts: { blockquote: "full" as const, table: "content" as const, img: "content" as const },
    };
    expect(decodeTheme(encodeTheme(routed))).toEqual(routed);
    const f2 = generateThemeFiles(routed, generateTheme(routed), "");
    expect(f2["layout.css"]).toContain("--breakout-size: 10%;");
    expect(f2["layout.css"]).toContain("> blockquote { grid-column: full; }");
    expect(f2["layout.css"]).not.toContain("> table");
    expect(f2["layout.css"]).not.toContain("grid-column: full; }".repeat(2));
  });
  test("full content width collapses the grid to one track", () => {
    const full = { ...structuredClone(DEFAULT_THEME), width: { value: 100, unit: "%" as const } };
    const files = generateThemeFiles(full, generateTheme(full), "");
    expect(files["layout.css"]).toContain("--content-size: 100%;");
    expect(files["layout.css"]).toContain(".tsb-doc.content-grid { grid-template-columns:");
  });
  test("legacy width tokens migrate on decode", () => {
    const legacy = {
      version: 1,
      colors: DEFAULT_THEME.colors,
      fonts: DEFAULT_THEME.fonts,
      fontAssignments: DEFAULT_THEME.fontAssignments,
      width: "article",
      breakout: "snug",
    };
    const decoded = validateThemeOptions(legacy);
    expect(decoded.width).toEqual({ value: 60, unit: "ch" });
    expect(decoded.breakout).toEqual({ value: 3, unit: "%" });
  });
  test("blockquote variants ship and round-trip", () => {
    const gen = generateTheme(DEFAULT_THEME);
    const files = generateThemeFiles(DEFAULT_THEME, gen, "");
    expect(files["markdown.css"]).toContain(".markdown.bq-pull blockquote");
    expect(files["markdown.css"]).toContain(".markdown.bq-minimal blockquote");
    expect(files["markdown.css"]).toContain(".markdown img + img");
    const varied = { ...structuredClone(DEFAULT_THEME), components: { blockquote: "pull" as const } };
    expect(decodeTheme(encodeTheme(varied))).toEqual(varied);
  });
  test("variable weights flow into fonts URL, vars and CSS", () => {
    const weighted = {
      ...structuredClone(DEFAULT_THEME),
      fonts: { primary: "Inter", secondary: "Merriweather" },
      weights: { primary: 650 },
    };
    expect(decodeTheme(encodeTheme(weighted))).toEqual(weighted);
    expect(googleFontHref(weighted)).toContain("family=Inter:opsz,wght@14..32,100..900");
    expect(googleFontHref(weighted)).toContain("family=Merriweather:wght@400;500;600;700");
    expect(fontWeightVars(weighted)["--font-h1-weight"]).toBe(650);
    expect(fontWeightVars(weighted)["--font-blockquote-weight"]).toBe(400);
    const perElement = {
      ...weighted,
      elementWeights: { h1: 900, p: 300 },
    };
    expect(decodeTheme(encodeTheme(perElement))).toEqual(perElement);
    expect(fontWeightVars(perElement)["--font-h1-weight"]).toBe(900);
    expect(fontWeightVars(perElement)["--font-p-weight"]).toBe(300);
    expect(fontWeightVars(perElement)["--font-h2-weight"]).toBe(650);
    const gen = generateTheme(weighted);
    const files = generateThemeFiles(weighted, gen, "");
    expect(files["root.css"]).toContain("--font-h1-weight: 650;");
    expect(files["typography.css"]).toContain("font-weight: var(--font-h1-weight, 400);");
  });
});

describe("anchor pinning", () => {
  test("the picked step number is where the colour lands", () => {
    expect(parseTailwindStep("yellow-100")).toBe("100");
    expect(generateScale("yellow-100")["100"]).toBe("#fef9c3");
    expect(generateScale("slate-950")["950"]).toBe(resolveTailwindHex("slate-950").toLowerCase());
    expect(generateScale("blue-600")["600"]).toBe("#2563eb");
  });
});

describe("relative scale", () => {
  test("fixed delta, strict ordering mid-range", () => {
    expect(RELATIVE_DELTA).toBe(0.1);
    const rel = generateRelativeScale("blue-600");
    expect(rel.base).toBe("#2563eb");
    for (const v of Object.values(rel)) expect(isValidCssColor(v)).toBe(true);
    const l = (hex: string) => hexToOklch(hex).l;
    expect(l(rel.light)).toBeGreaterThan(l(rel.base));
    expect(l(rel.base)).toBeGreaterThan(l(rel.dark));
    expect(l(rel.light) - l(rel.base)).toBeCloseTo(0.1, 1);
    expect(l(rel.base) - l(rel.dark)).toBeCloseTo(0.1, 1);
  });
  test("pale anchors shed chroma faster; mid anchors keep the classic ramp", () => {
    const c = (hex: string) => hexToOklch(hex).c;
    // End-anchored pale picks: dark siblings stay pastel (≤55% of anchor chroma).
    for (const name of ["yellow-200", "lime-200", "pink-200"]) {
      const rel = generateRelativeScale(name);
      const anchorC = c(rel.light);
      expect(anchorC).toBeGreaterThan(0.03);
      expect(c(rel.dark)).toBeLessThanOrEqual(anchorC * 0.55);
      expect(c(rel.base)).toBeLessThanOrEqual(anchorC);
    }
    // Mid-tone anchors: classic retention (~0.8 per step), unchanged behavior.
    const mid = generateRelativeScale("blue-600");
    expect(c(mid.dark) / c(mid.base)).toBeGreaterThan(0.8);
    expect(c(mid.light) / c(mid.base)).toBeGreaterThan(0.8);
  });
  test("light anchors occupy the light slot and derive backwards", () => {
    const theme = {
      ...structuredClone(DEFAULT_THEME),
      colors: { ...DEFAULT_THEME.colors, prose: "red-50" },
    };
    const gen = generateTheme(theme);
    const rel = gen.relative["prose"];
    // Chosen colour becomes prose-light; base/dark step down from it.
    expect(rel.light).toBe(gen.anchors["prose"]);
    const l = (hex: string) => hexToOklch(hex).l;
    expect(l(rel.light)).toBeGreaterThan(l(rel.base));
    expect(l(rel.base)).toBeGreaterThan(l(rel.dark));
    for (const v of Object.values(rel)) expect(isValidCssColor(v)).toBe(true);
  });
  test("dark anchors occupy the dark slot and derive upwards", () => {
    const theme = {
      ...structuredClone(DEFAULT_THEME),
      colors: { ...DEFAULT_THEME.colors, prose: "slate-950" },
    };
    const gen = generateTheme(theme);
    const rel = gen.relative["prose"];
    expect(rel.dark).toBe(gen.anchors["prose"]);
    const l = (hex: string) => hexToOklch(hex).l;
    expect(l(rel.light)).toBeGreaterThan(l(rel.base));
    expect(l(rel.base)).toBeGreaterThan(l(rel.dark));
    for (const v of Object.values(rel)) expect(isValidCssColor(v)).toBe(true);
  });
  test("relative tokens are emitted per semantic", () => {
    const gen = generateTheme(DEFAULT_THEME);
    for (const key of ["light", "dark"] as const) {
      expect(gen.variables[`--accent-${key}`]).toBe(gen.relative["accent"][key]);
    }
    expect(gen.rootCss).toContain("--base-light:");
    expect(gen.rootCss).toContain("--pop-dark:");
    expect(gen.rootCss).not.toMatch(/--base-(light|dark)-\d/);
  });
});

describe("readable pairs", () => {
  test("every pair meets AA against its surface", () => {
    const kj = (v: string | null) => {
      expect(v).not.toBeNull();
      return v as string;
    };
    const checkTheme = (colors: typeof DEFAULT_THEME.colors) => {
      const theme = { ...structuredClone(DEFAULT_THEME), colors };
      const gen = generateTheme(theme);
      for (const spec of READABLE_PAIRS) {
        const text = kj(cssToHex(gen.pairs[spec.varName]));
        const bg = kj(cssToHex(gen.scales[spec.bgSem][spec.bgStep]));
        expect(contrastRatio(text, bg)).toBeGreaterThanOrEqual(4.5);
      }
      const hover = kj(cssToHex(gen.pairs["--accent-hover-on-base"]));
      const link = kj(cssToHex(gen.pairs["--accent-on-base"]));
      const base = kj(cssToHex(gen.scales["base"]["50"]));
      expect(contrastRatio(hover, base)).toBeGreaterThanOrEqual(4.5);
      expect(hover).not.toBe(link);
    };
    checkTheme(DEFAULT_THEME.colors);
    const night = PRESET_THEMES.find((p) => p.name === "night")!;
    checkTheme(night.colors);
    checkTheme({ ...DEFAULT_THEME.colors, accent: "yellow-100", prose: "amber-200" });
  });
  test("defaults resolve to the previously hardcoded rungs", () => {
    const gen = generateTheme(DEFAULT_THEME);
    expect(gen.pairs["--prose-on-base"]).toBe(gen.scales["prose"]["800"]);
    expect(gen.pairs["--prose-on-alt"]).toBe(gen.scales["prose"]["900"]);
    expect(gen.pairs["--prose-on-quote"]).toBe(gen.scales["prose"]["700"]);
    expect(gen.pairs["--prose-on-quote-soft"]).toBe(gen.scales["prose"]["600"]);
    expect(gen.pairs["--accent-on-base"]).toBe(gen.scales["accent"]["600"]);
    expect(gen.pairs["--accent-hover-on-base"]).toBe(gen.scales["accent"]["700"]);
    expect(gen.pairs["--muted-on-base"]).toBe(gen.scales["muted"]["600"]);
    expect(gen.pairs["--traffic-stop-on-callout"]).toBe(gen.scales["traffic-stop"]["900"]);
    expect(gen.pairs["--traffic-warning-on-callout"]).toBe(gen.scales["traffic-warning"]["900"]);
    expect(gen.pairs["--traffic-ok-on-callout"]).toBe(gen.scales["traffic-ok"]["900"]);
    expect(gen.pairs["--inverse-on-accent"]).toBe(gen.scales["inverse"]["50"]);
    expect(gen.pairs["--inverse-on-pop"]).toBe(gen.scales["inverse"]["50"]);
    expect(gen.pairs["--traffic-stop-on-callout"]).toBe(gen.scales["traffic-stop"]["900"]);
    expect(gen.pairs["--traffic-warning-on-callout"]).toBe(gen.scales["traffic-warning"]["900"]);
    expect(gen.pairs["--traffic-ok-on-callout"]).toBe(gen.scales["traffic-ok"]["900"]);
    expect(gen.pairs["--pre-on-ink"]).toBe(gen.scales["alt"]["50"]);
  });
  test("fixed chromatics carry full generated ranges", () => {
    const gen = generateTheme(DEFAULT_THEME);
    expect(gen.anchors["black"]).toBe("#000000");
    expect(gen.anchors["white"]).toBe("#ffffff");
    expect(gen.scales["black"]["950"]).toBe("#000000");
    expect(gen.scales["white"]["50"]).toBe("#ffffff");
    // End-anchored extremes: black derives upwards, white downwards.
    const l = (hex: string) => hexToOklch(hex).l;
    expect(gen.relative["black"].dark).toBe("#000000");
    expect(l(gen.relative["black"].base)).toBeGreaterThan(l(gen.relative["black"].dark));
    expect(gen.relative["white"].light).toBe("#ffffff");
    expect(l(gen.relative["white"].light)).toBeGreaterThan(l(gen.relative["white"].base));
    expect(gen.variables["--black-900"]).toBe(gen.scales["black"]["900"]);
    expect(gen.variables["--white-light"]).toBe(gen.relative["white"]["light"]);
    expect(gen.rootCss).toContain("--black-50:");
    expect(gen.rootCss).toContain("--white-950:");
    // Every rung is a valid achromatic grey.
    for (const v of [...Object.values(gen.scales["black"]), ...Object.values(gen.scales["white"])]) {
      expect(isValidCssColor(v)).toBe(true);
      expect(hexToOklch(v).c).toBeLessThan(0.012);
    }
  });
  test("glass vars, alpha and frosted panel ship", () => {
    const gen = generateTheme(DEFAULT_THEME);
    expect(gen.variables["--glass"]).toBe(gen.anchors["glass"]);
    expect(gen.variables["--glass-alpha"]).toBe("0.7");
    expect(gen.variables["--glass-fill"]).toBe("color-mix(in srgb, var(--glass) 70%, transparent)");
    const files = generateThemeFiles(DEFAULT_THEME, gen, "");
    expect(files["base.css"]).toContain(".glass-panel");
    expect(files["base.css"]).toContain("var(--glass-fill)");
    const custom = {
      ...structuredClone(DEFAULT_THEME),
      glassAlpha: 0.4,
    };
    expect(generateTheme(custom).variables["--glass-fill"]).toBe(
      "color-mix(in srgb, var(--glass) 40%, transparent)"
    );
    expect(decodeTheme(encodeTheme(custom))).toEqual(custom);
    expect(() => validateThemeOptions({ version: 1, glassAlpha: 2 })).toThrow(/glassAlpha/);
    expect(() => validateThemeOptions({ version: 1, glassAlpha: "half" })).toThrow(/glassAlpha/);
  });
  test("pop twist defaults to +35° with tweaks either side", () => {
    const gen = generateTheme(DEFAULT_THEME);
    const anchor = hexToOklch(gen.anchors["pop"]);
    const twisted = hexToOklch(gen.variables["--pop-twist"]);
    expect(isValidCssColor(gen.variables["--pop-twist"])).toBe(true);
    let drift = Math.abs(twisted.h - ((anchor.h + 35) % 360));
    if (drift > 180) drift = 360 - drift;
    expect(drift).toBeLessThan(5);
    expect(twisted.l).toBeCloseTo(anchor.l, 1);
    const plusOpts = {
      ...structuredClone(DEFAULT_THEME),
      twist: { hue: 10, saturation: 10 },
    };
    const plus = generateTheme(plusOpts);
    const plusBack = hexToOklch(plus.variables["--pop-twist"]);
    let plusDrift = Math.abs(plusBack.h - ((anchor.h + 45) % 360));
    if (plusDrift > 180) plusDrift = 360 - plusDrift;
    expect(plusDrift).toBeLessThan(5);
    expect(plusBack.c).toBeGreaterThan(twisted.c);
    // Achromatic pop stays grey, never invents colour.
    const grey = generateTheme({
      ...structuredClone(DEFAULT_THEME),
      colors: { ...DEFAULT_THEME.colors, pop: "neutral-500" },
    });
    expect(hexToOklch(grey.variables["--pop-twist"]).c).toBeLessThan(0.012);
    expect(decodeTheme(encodeTheme(plusOpts))).toEqual(plusOpts);
    expect(() => validateThemeOptions({ version: 1, twist: { hue: 99 } })).toThrow(/twist\.hue/);
    expect(() => validateThemeOptions({ version: 1, twist: { saturation: -99 } })).toThrow(/twist\.saturation/);
    expect(() => validateThemeOptions({ version: 1, twist: "spicy" })).toThrow(/twist/);
  });
  test("pair vars are emitted and consumed", () => {
    const gen = generateTheme(DEFAULT_THEME);
    const files = generateThemeFiles(DEFAULT_THEME, gen, "");
    expect(gen.rootCss).toContain("--prose-on-base:");
    expect(gen.rootCss).toContain("--accent-hover-on-base:");
    expect(gen.rootCss).toContain("--muted-on-base:");
    expect(gen.rootCss).toContain("--inverse-on-pop:");
    expect(files["base.css"]).toContain("color: var(--prose-on-base);");
    expect(files["base.css"]).toContain("color: var(--accent-on-base);");
    expect(files["markdown.css"]).toContain("color: var(--prose-on-quote);");
    expect(files["markdown.css"]).toContain("color: var(--inverse-on-pop);");
  });
  test("swappable text source overrides body copy verbatim", () => {
    const swapped = {
      ...structuredClone(DEFAULT_THEME),
      textSource: { sem: "accent" as const, level: "dark" as const },
    };
    const gen = generateTheme(swapped);
    expect(gen.pairs["--prose-on-base"]).toBe(gen.relative["accent"]["dark"]);
    // Other pairs are unaffected.
    expect(gen.pairs["--accent-on-base"]).toBe(gen.scales["accent"]["600"]);
  });
  test("textSource validates, rejects junk, and round-trips", () => {
    const withSource = {
      ...structuredClone(DEFAULT_THEME),
      textSource: { sem: "accent" as const, level: "light" as const },
    };
    expect(decodeTheme(encodeTheme(withSource))).toEqual(withSource);
    expect(() =>
      validateThemeOptions({ version: 1, textSource: { sem: "plum", level: "base" } })
    ).toThrow(/textSource\.sem/);
    expect(() =>
      validateThemeOptions({ version: 1, textSource: { sem: "accent", level: "dim" } })
    ).toThrow(/textSource\.level/);
    expect(() =>
      validateThemeOptions({ version: 1, textSource: "prose" })
    ).toThrow(/textSource/);
  });
  test("ensureContrast falls back to black, then white", () => {
    expect(ensureContrast("#434a5a", "#fafafa")).toBe("#434a5a");
    expect(ensureContrast("#808080", "#d946ef")).toBe("#000000");
    expect(ensureContrast("#3b0764", "#020617")).toBe("#ffffff");
  });
  test("explicit low-contrast source raises a warning, never an override", () => {
    const risky = {
      ...structuredClone(DEFAULT_THEME),
      textSource: { sem: "base" as const, level: "light" as const },
    };
    const warnings = contrastWarnings(risky);
    expect(warnings.some((w) => w.pair === "Text source on Base")).toBe(true);
    // Value still passes through verbatim.
    expect(generateTheme(risky).pairs["--prose-on-base"]).toBe(
      generateTheme(risky).relative["base"]["light"]
    );
  });
});

describe("theme consistency", () => {
  test("preview variables match generator", () => {
    const gen = generateTheme(DEFAULT_THEME);
    expect(gen.variables["--accent-600"]).toBeDefined();
    expect(gen.rootCss).toContain("--accent-");
  });
  test("raw anchor var equals the exact chosen colour", () => {
    const gen = generateTheme(DEFAULT_THEME);
    expect(gen.anchors["accent"]).toBe("#2563eb");
    expect(gen.variables["--accent"]).toBe("#2563eb");
    // Light anchor: the anchor is exact even though generated steps go muddy.
    const light = {
      ...structuredClone(DEFAULT_THEME),
      colors: { ...DEFAULT_THEME.colors, accent: "yellow-100" },
    };
    const g2 = generateTheme(light);
    expect(g2.anchors["accent"]).toBe("#fef9c3");
    expect(g2.variables["--accent"]).toBe("#fef9c3");
  });
  test("fixed chromatics are absolute", () => {
    const gen = generateTheme(DEFAULT_THEME);
    expect(gen.variables["--black"]).toBe("#000000");
    expect(gen.variables["--white"]).toBe("#ffffff");
  });
});

describe("presets", () => {
  test("five named presets with valid colours", () => {
    expect(PRESET_THEMES.map((p) => p.name)).toEqual(["ocean", "sand", "night", "cyber", "jungle"]);
    assertPresetsValid();
  });
  test("matchPreset identifies presets and null when customized", () => {
    for (const p of PRESET_THEMES) {
      expect(matchPreset(p.colors)).toBe(p.name);
    }
    expect(matchPreset({ ...PRESET_THEMES[0].colors, accent: "pink-600" })).toBe(null);
  });
});

describe("fluid type", () => {  test("clamp hits min/max at range edges and interpolates", () => {
    expect(fluidPreferred(34, 64, 360)).toBeCloseTo(34, 6);
    expect(fluidPreferred(34, 64, 1280)).toBeCloseTo(64, 6);
    expect(fluidPreferred(34, 64, 820)).toBeCloseTo(49, 6);
  });
  test("clamp format is valid and degenerate ranges collapse", () => {
    const c = fluidClamp(34, 64);
    expect(c).toMatch(/^clamp\(.+rem, .+rem \+ .+vi, .+rem\)$/);
    expect(fluidClamp(14, 14)).toBe("0.875rem");
  });
  test("generated typography uses fluid sizes", () => {
    const gen = generateTheme(DEFAULT_THEME);
    const files = generateThemeFiles(DEFAULT_THEME, gen, "");
    expect(files["typography.css"]).toContain("clamp(");
    expect(files["typography.css"]).toMatch(/vi,/);
    expect(files["typography.css"]).toMatch(/clamp\(2\.125rem/);
  });
});
