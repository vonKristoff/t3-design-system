import { isValidTailwindName } from "../colors/tailwind-palette.ts";
import { DEFAULT_THEME } from "./defaults.ts";
import type { BreakoutElement, FontElement, FontRole, SemanticName, SizeUnit, SizeValue, ThemeOptions } from "./types.ts";
import { BREAKOUT_ELEMENTS, PAYLOAD_VERSION, SEMANTIC_NAMES, SIZE_UNITS } from "./types.ts";

const COLOR_KEYS: (keyof ThemeOptions["colors"])[] = [
  "base", "alt", "prose", "accent",
  "brandPrimary", "brandSecondary",
  "trafficStop", "trafficWarning", "trafficOk",
];

const FONT_KEYS = ["primary", "secondary", "tertiary"] as const;

const VALID_ELEMENTS: FontElement[] = [
  "h1", "h2", "h3", "h4", "h5", "h6", "p", "list", "blockquote", "code",
];

const VALID_ROLES: FontRole[] = ["primary", "secondary", "tertiary"];

// Legacy v1 width tokens -> size values, so older payloads keep decoding.
const LEGACY_WIDTH: Record<string, SizeValue> = {
  article: { value: 60, unit: "ch" },
  comfortable: { value: 48, unit: "rem" },
  wide: { value: 70, unit: "%" },
  full: { value: 100, unit: "%" },
};
const LEGACY_BREAKOUT: Record<string, SizeValue> = {
  none: { value: 0, unit: "%" },
  snug: { value: 3, unit: "%" },
  medium: { value: 6, unit: "%" },
  wide: { value: 10, unit: "%" },
};

function parseSize(raw: unknown, fallback: SizeValue, field: string): SizeValue {
  if (raw === undefined) return fallback;
  if (typeof raw === "string") {
    const legacy = field === "width" ? LEGACY_WIDTH[raw] : LEGACY_BREAKOUT[raw];
    if (legacy) return legacy;
    throw err(`Invalid ${field}: ${JSON.stringify(raw)}.`);
  }
  if (typeof raw !== "object" || raw === null) throw err(`Invalid ${field} object.`);
  const v = raw as Record<string, unknown>;
  if (typeof v["value"] !== "number" || !Number.isFinite(v["value"])) {
    throw err(`Invalid ${field}.value: ${JSON.stringify(v["value"])}. Expected a number.`);
  }
  if (!SIZE_UNITS.includes(v["unit"] as SizeUnit)) {
    throw err(`Invalid ${field}.unit: ${JSON.stringify(v["unit"])}. Expected one of ${SIZE_UNITS.join(", ")}.`);
  }
  return { value: v["value"] as number, unit: v["unit"] as SizeUnit };
}

const err = (detail: string): Error => new Error(`Invalid theme payload.\n${detail}`);

/**
 * Validate a decoded payload and merge it onto defaults.
 * Accepts both full payloads and compact diff-encoded payloads
 * (sections/keys equal to the defaults may be omitted).
 */
export function validateThemeOptions(value: unknown): ThemeOptions {
  if (typeof value !== "object" || value === null) {
    throw err("Expected a theme object.");
  }
  const v = value as Record<string, unknown>;
  if (v["version"] !== PAYLOAD_VERSION) {
    throw err(
      `The supplied theme was encoded with an unsupported version (got ${JSON.stringify(v["version"])}, supports ${PAYLOAD_VERSION}).`
    );
  }

  // --- colors (partial allowed; merged per-key) ---
  const rawColors = v["colors"];
  const parsedColors: Partial<ThemeOptions["colors"]> = {};
  if (rawColors !== undefined) {
    if (typeof rawColors !== "object" || rawColors === null) throw err('Invalid "colors" object.');
    for (const [k, raw] of Object.entries(rawColors as Record<string, unknown>)) {
      if (!(COLOR_KEYS as string[]).includes(k)) continue; // ignore unknown keys
      if (typeof raw !== "string" || raw.length === 0) throw err(`Missing required colour value: colors.${k}.`);
      if (!isValidTailwindName(raw)) {
        throw err(`Invalid Tailwind colour name for colors.${k}: "${raw}". Expected e.g. "blue-600".`);
      }
      (parsedColors as Record<string, string>)[k] = raw;
    }
  }
  const colors = { ...DEFAULT_THEME.colors, ...parsedColors };

  // --- fonts (absent section => defaults; present section used as-is) ---
  let fonts: ThemeOptions["fonts"];
  if (v["fonts"] === undefined) {
    fonts = { ...DEFAULT_THEME.fonts };
  } else {
    const rf = v["fonts"];
    if (typeof rf !== "object" || rf === null) throw err('Invalid "fonts" object.');
    fonts = {};
    for (const k of FONT_KEYS) {
      const name: unknown = (rf as Record<string, unknown>)[k];
      if (name === undefined) continue;
      if (typeof name !== "string") throw err(`Invalid font name for fonts.${k}.`);
      if (name.length > 80) throw err(`Font name too long for fonts.${k}.`);
      fonts[k] = name;
    }
  }

  // --- weights (absent => unset; 400 applies at use time) ---
  let weights: ThemeOptions["weights"];
  if (v["weights"] === undefined) {
    weights = undefined;
  } else {
    const rw = v["weights"];
    if (typeof rw !== "object" || rw === null) throw err('Invalid "weights" object.');
    weights = {};
    for (const role of VALID_ROLES) {
      const w: unknown = (rw as Record<string, unknown>)[role];
      if (w === undefined) continue;
      if (typeof w !== "number" || !Number.isInteger(w) || w < 100 || w > 1000) {
        throw err(`Invalid font weight for weights.${role}: ${JSON.stringify(w)}. Expected 100–1000.`);
      }
      weights[role] = w;
    }
  }

  // --- elementWeights (per-element overrides) ---
  let elementWeights: ThemeOptions["elementWeights"];
  if (v["elementWeights"] === undefined) {
    elementWeights = undefined;
  } else {
    const re = v["elementWeights"];
    if (typeof re !== "object" || re === null) throw err('Invalid "elementWeights" object.');
    elementWeights = {};
    for (const [el, w] of Object.entries(re as Record<string, unknown>)) {
      if (!VALID_ELEMENTS.includes(el as FontElement)) throw err(`Invalid elementWeights element: "${el}".`);
      if (typeof w !== "number" || !Number.isInteger(w) || w < 100 || w > 1000) {
        throw err(`Invalid font weight for elementWeights.${el}: ${JSON.stringify(w)}. Expected 100–1000.`);
      }
      elementWeights[el as FontElement] = w;
    }
  }

  // --- fontAssignments (absent => defaults; present used as-is) ---
  let fontAssignments: ThemeOptions["fontAssignments"];
  if (v["fontAssignments"] === undefined) {
    fontAssignments = { ...DEFAULT_THEME.fontAssignments };
  } else {
    const fa = v["fontAssignments"];
    if (typeof fa !== "object" || fa === null) throw err('Invalid "fontAssignments" object.');
    fontAssignments = {};
    for (const [el, role] of Object.entries(fa as Record<string, unknown>)) {
      if (!VALID_ELEMENTS.includes(el as FontElement)) throw err(`Invalid font assignment element: "${el}".`);
      if (!VALID_ROLES.includes(role as FontRole)) {
        throw err(`Invalid font assignment role for "${el}": ${JSON.stringify(role)}.`);
      }
      fontAssignments[el as FontElement] = role as FontRole;
    }
  }

  // --- width / breakout (absent => defaults). Legacy v1 tokens are migrated. ---
  const width = parseSize(v["width"], DEFAULT_THEME.width!, "width");
  const breakout = parseSize(v["breakout"], DEFAULT_THEME.breakout!, "breakout");

  // --- per-element breakout routing (absent => defaults) ---
  let breakouts: ThemeOptions["breakouts"];
  if (v["breakouts"] === undefined) {
    breakouts = { ...DEFAULT_THEME.breakouts };
  } else {
    const rb = v["breakouts"];
    if (typeof rb !== "object" || rb === null) throw err('Invalid "breakouts" object.');
    breakouts = {};
    for (const [el, level] of Object.entries(rb as Record<string, unknown>)) {
      if (!BREAKOUT_ELEMENTS.includes(el as BreakoutElement)) throw err(`Invalid breakouts element: "${el}".`);
      if (level !== "content" && level !== "breakout" && level !== "full") {
        throw err(`Invalid breakout level for "${el}": ${JSON.stringify(level)}.`);
      }
      breakouts[el as BreakoutElement] = level;
    }
  }

  // --- components (absent => defaults; present used as-is) ---
  let components: ThemeOptions["components"];
  if (v["components"] === undefined) {
    components = { ...DEFAULT_THEME.components };
  } else {
    const rc = v["components"];
    if (typeof rc !== "object" || rc === null) throw err('Invalid "components" object.');
    components = {};
    const bq: unknown = (rc as Record<string, unknown>)["blockquote"];
    if (bq !== undefined) {
      if (bq !== "rule" && bq !== "pull" && bq !== "minimal") {
        throw err(`Invalid blockquote variant: ${JSON.stringify(bq)}.`);
      }
      components.blockquote = bq;
    }
  }

  // --- textSource (absent => auto-derived prose; explicit swatch overrides) ---
  let textSource: ThemeOptions["textSource"];
  if (v["textSource"] === undefined) {
    textSource = undefined;
  } else {
    const ts = v["textSource"];
    if (typeof ts !== "object" || ts === null) throw err('Invalid "textSource" object.');
    const sem = (ts as Record<string, unknown>)["sem"];
    const level = (ts as Record<string, unknown>)["level"];
    if (typeof sem !== "string" || !(SEMANTIC_NAMES as readonly string[]).includes(sem)) {
      throw err(`Invalid textSource.sem: ${JSON.stringify(sem)}.`);
    }
    if (level !== "light" && level !== "base" && level !== "dark") {
      throw err(`Invalid textSource.level: ${JSON.stringify(level)}. Expected "light", "base" or "dark".`);
    }
    textSource = { sem: sem as SemanticName, level };
  }

  return { version: PAYLOAD_VERSION, colors, fonts, weights, elementWeights, fontAssignments, width, breakout, breakouts, components, textSource };
}
