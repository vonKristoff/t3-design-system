import { describe, expect, test } from "bun:test";
import { resolveTailwindHex } from "../src/colors/tailwind-palette.ts";
import { generateScale } from "../src/colors/generate-scale.ts";
import { isValidCssColor, hexToOklch } from "../src/colors/oklch.ts";
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
      colors: { ...DEFAULT_THEME.colors, accent: "purple-600", trafficOk: "teal-500" },
      fonts: { primary: "DM Sans" },
      width: { value: 60, unit: "ch" as const },
      breakout: { value: 4, unit: "rem" as const },
    };
    const payload = encodeTheme(modified);
    expect(payload.length).toBeLessThan(300);
    expect(decodeTheme(payload)).toEqual(modified);
  });
  test("layout.css carries always-on grid, routing and content width", () => {
    const gen = generateTheme(DEFAULT_THEME);
    const files = generateThemeFiles(DEFAULT_THEME, gen, "");
    expect(files["layout.css"]).toContain(".content-grid");
    expect(files["layout.css"]).toContain(".content-grid > .breakout");
    expect(files["layout.css"]).toContain(".content-grid > .full-width");
    expect(files["layout.css"]).toContain("--content-size: 70%;");
    expect(files["layout.css"]).not.toContain("data-grid");
    // Grid must be on the element holding the content items.
    expect(docShellClasses({ value: 72, unit: "rem" })).toBe("tsb-doc content-grid tsb-width-72rem");
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

describe("theme consistency", () => {
  test("preview variables match generator", () => {
    const gen = generateTheme(DEFAULT_THEME);
    expect(gen.variables["--accent-600"]).toBeDefined();
    expect(gen.rootCss).toContain("--brand-primary-");
  });
  test("raw anchor var equals the exact chosen colour", () => {
    const gen = generateTheme(DEFAULT_THEME);
    expect(gen.anchors["brand-primary"]).toBe("#2563eb");
    expect(gen.variables["--brand-primary"]).toBe("#2563eb");
    // Light anchor: the anchor is exact even though generated steps go muddy.
    const light = {
      ...structuredClone(DEFAULT_THEME),
      colors: { ...DEFAULT_THEME.colors, brandPrimary: "yellow-100" },
    };
    const g2 = generateTheme(light);
    expect(g2.anchors["brand-primary"]).toBe("#fef9c3");
    expect(g2.variables["--brand-primary"]).toBe("#fef9c3");
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
