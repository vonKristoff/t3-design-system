import { deflateSync, inflateSync, strFromU8str, strToU8 } from "./pako-shim.ts";
import { DEFAULT_THEME } from "../theme/defaults.ts";
import type { ThemeOptions } from "../theme/types.ts";
import { validateThemeOptions } from "../theme/validate.ts";

export const CLI_PACKAGE_NAME = "tsup-system";

const COLOR_KEYS: (keyof ThemeOptions["colors"])[] = [
  "base", "alt", "prose", "accent",
  "brandPrimary", "brandSecondary",
  "trafficStop", "trafficWarning", "trafficOk",
];

function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (typeof value === "object" && value !== null) {
    const keys = Object.keys(value).sort();
    return `{${keys.map((k) => `${JSON.stringify(k)}:${canonical((value as Record<string, unknown>)[k])}`).join(",")}}`;
  }
  return JSON.stringify(value) ?? "null";
}

const same = (a: unknown, b: unknown): boolean => canonical(a) === canonical(b);

function base64UrlEncode(bytes: Uint8Array): string {
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  const b64 = typeof btoa !== "undefined" ? btoa(bin) : Buffer.from(bin, "binary").toString("base64");
  return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64UrlDecode(s: string): Uint8Array {
  const clean = s.trim();
  if (!/^[A-Za-z0-9\-_]*$/.test(clean) || clean.length === 0) {
    throw new Error("Invalid theme payload.\nTheme argument is not valid Base64URL.");
  }
  let b64 = clean.replace(/-/g, "+").replace(/_/g, "/");
  while (b64.length % 4 !== 0) b64 += "=";
  let bin: string;
  try {
    bin = typeof atob !== "undefined" ? atob(b64) : Buffer.from(b64, "base64").toString("binary");
  } catch {
    throw new Error("Invalid theme payload.\nTheme argument is not valid Base64URL.");
  }
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

/**
 * Compact diff-encoding: only values that differ from the defaults are
 * included. A default theme encodes to ~30 chars; a typical few-tweak
 * theme to ~150. Decoding merges back onto defaults, so the result is
 * always a complete ThemeOptions.
 */
export function encodeTheme(options: ThemeOptions): string {
  const out: Record<string, unknown> = { version: options.version };

  const colors: Partial<ThemeOptions["colors"]> = {};
  for (const key of COLOR_KEYS) {
    if (options.colors[key] !== DEFAULT_THEME.colors[key]) colors[key] = options.colors[key];
  }
  if (Object.keys(colors).length > 0) out["colors"] = colors;

  if (!same(options.fonts ?? {}, DEFAULT_THEME.fonts)) out["fonts"] = options.fonts ?? {};
  if (!same(options.fontAssignments ?? {}, DEFAULT_THEME.fontAssignments ?? {})) {
    out["fontAssignments"] = options.fontAssignments ?? {};
  }
  const layout = options.layout ?? "compact";
  if (layout !== "compact") out["layout"] = layout;

  const json = JSON.stringify(out);
  return base64UrlEncode(deflateSync(strToU8(json)));
}

export function decodeTheme(payload: string): ThemeOptions {
  let bytes: Uint8Array;
  try {
    bytes = base64UrlDecode(payload);
  } catch (e) {
    throw e instanceof Error ? e : new Error("Invalid theme payload.");
  }
  let json: string;
  try {
    json = strFromU8str(inflateSync(bytes));
  } catch {
    throw new Error("Invalid theme payload.\nCould not decompress theme data.");
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    throw new Error("Invalid theme payload.\nTheme data is not valid JSON.");
  }
  return validateThemeOptions(parsed);
}

export function buildBunxCommand(options: ThemeOptions, pkg = CLI_PACKAGE_NAME): string {
  return `bunx ${pkg} --theme="${encodeTheme(options)}"`;
}
