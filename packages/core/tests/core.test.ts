import { describe, expect, test } from "bun:test";
import { resolveTailwindHex } from "../src/colors/tailwind-palette.ts";
import { generateScale } from "../src/colors/generate-scale.ts";
import { isValidCssColor, hexToOklch } from "../src/colors/oklch.ts";
import { DEFAULT_THEME } from "../src/theme/defaults.ts";
import { generateTheme } from "../src/theme/generate-theme.ts";
import { generateThemeFiles } from "../src/theme/css.ts";
import { layoutToDataGrid } from "../src/theme/css.ts";
import { fluidClamp, fluidPreferred } from "../src/typography/fluid.ts";
import { encodeTheme, decodeTheme } from "../src/serialization/theme-payload.ts";

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
      layout: "wide" as const,
      width: "article" as const,
    };
    const payload = encodeTheme(modified);
    expect(payload.length).toBeLessThan(300);
    expect(decodeTheme(payload)).toEqual(modified);
  });
  test("layout.css carries grid, data-grid gates and content width", () => {
    const gen = generateTheme(DEFAULT_THEME);
    const files = generateThemeFiles(DEFAULT_THEME, gen, "");
    expect(files["layout.css"]).toContain(".content-grid");
    expect(files["layout.css"]).toContain('[data-grid="breakout"] > .breakout');
    expect(files["layout.css"]).toContain('[data-grid="full"] > .full-width');
    expect(files["layout.css"]).toContain("--content-max: 72rem;");
    expect(layoutToDataGrid("compact")).toBe("");
    expect(layoutToDataGrid("minimal")).toBe("breakout");
    expect(layoutToDataGrid("wide")).toBe("full");
  });
  test("blockquote variants ship and round-trip", () => {
    const gen = generateTheme(DEFAULT_THEME);
    const files = generateThemeFiles(DEFAULT_THEME, gen, "");
    expect(files["markdown.css"]).toContain(".markdown.bq-pull blockquote");
    expect(files["markdown.css"]).toContain(".markdown.bq-minimal blockquote");
    const varied = { ...structuredClone(DEFAULT_THEME), components: { blockquote: "pull" as const } };
    expect(decodeTheme(encodeTheme(varied))).toEqual(varied);
  });
});

describe("theme consistency", () => {
  test("preview variables match generator", () => {
    const gen = generateTheme(DEFAULT_THEME);
    expect(gen.variables["--accent-600"]).toBeDefined();
    expect(gen.rootCss).toContain("--brand-primary-");
  });
});

describe("fluid type", () => {
  test("clamp hits min/max at range edges and interpolates", () => {
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
