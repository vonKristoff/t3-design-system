// Minimal, dependency-free sRGB <-> OKLCH conversion.
// Reference math: sRGB -> linear -> Oklab (Björn Ottosson) -> OKLCH.

export interface Oklch {
  l: number; // 0..1
  c: number; // >= 0
  h: number; // 0..360 (0 when achromatic)
}

function clamp01(x: number): number {
  return Math.min(1, Math.max(0, x));
}

export function hexToRgb(hex: string): { r: number; g: number; b: number } {
  let h = hex.trim().toLowerCase();
  if (h.startsWith("#")) h = h.slice(1);
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  if (h.length !== 6 || !/^[0-9a-f]{6}$/.test(h)) {
    throw new Error(`Invalid hex colour: "${hex}".`);
  }
  return {
    r: parseInt(h.slice(0, 2), 16) / 255,
    g: parseInt(h.slice(2, 4), 16) / 255,
    b: parseInt(h.slice(4, 6), 16) / 255,
  };
}

function srgbToLinear(c: number): number {
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

function linearToSrgb(c: number): number {
  return c <= 0.0031308 ? 12.92 * c : 1.055 * Math.pow(c, 1 / 2.4) - 0.055;
}

export function rgbToOklch(r: number, g: number, b: number): Oklch {
  const rl = srgbToLinear(clamp01(r));
  const gl = srgbToLinear(clamp01(g));
  const bl = srgbToLinear(clamp01(b));

  const l = 0.4122214708 * rl + 0.5363325363 * gl + 0.0514459929 * bl;
  const m = 0.2119034982 * rl + 0.6806995451 * gl + 0.1073969566 * bl;
  const s = 0.0883024619 * rl + 0.2817188376 * gl + 0.6299787005 * bl;

  const l_ = Math.cbrt(l);
  const m_ = Math.cbrt(m);
  const s_ = Math.cbrt(s);

  const L = 0.2104542553 * l_ + 0.7936177850 * m_ - 0.0040720468 * s_;
  const a = 1.9779984951 * l_ - 2.4285922050 * m_ + 0.4505937099 * s_;
  const bb = 0.0259040371 * l_ + 0.7827717662 * m_ - 0.8086757660 * s_;

  const C = Math.sqrt(a * a + bb * bb);
  let H = (Math.atan2(bb, a) * 180) / Math.PI;
  if (H < 0) H += 360;
  if (C < 1e-5) H = 0;

  return { l: L, c: C, h: H };
}

export function hexToOklch(hex: string): Oklch {
  const { r, g, b } = hexToRgb(hex);
  return rgbToOklch(r, g, b);
}

export function oklchToRgb(L: number, C: number, Hdeg: number): { r: number; g: number; b: number } {
  const H = ((Hdeg % 360) + 360) % 360;
  const hRad = (H * Math.PI) / 180;
  const a = C * Math.cos(hRad);
  const b_ = C * Math.sin(hRad);

  const l_ = L + 0.3963377774 * a + 0.2158037573 * b_;
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b_;
  const s_ = L - 0.0894841775 * a - 1.2914855480 * b_;

  const l = l_ * l_ * l_;
  const m = m_ * m_ * m_;
  const s = s_ * s_ * s_;

  const rl = +4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s;
  const gl = -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s;
  const bl = -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s;

  return { r: linearToSrgb(rl), g: linearToSrgb(gl), b: linearToSrgb(bl) };
}

function toHexByte(x: number): string {
  return Math.round(clamp01(x) * 255).toString(16).padStart(2, "0");
}

export function oklchToHex(L: number, C: number, H: number): string {
  const { r, g, b } = oklchToRgb(L, C, H);
  return `#${toHexByte(r)}${toHexByte(g)}${toHexByte(b)}`;
}

export function formatOklch(L: number, C: number, H: number): string {
  const l = Math.min(1, Math.max(0, L)).toFixed(4);
  const c = Math.max(0, C).toFixed(4);
  const h = (((H % 360) + 360) % 360).toFixed(2);
  return `oklch(${l} ${c} ${h})`;
}

/**
 * Linear mix of two opaque hex colours in sRGB space, matching CSS
 * `color-mix(in srgb, <a> <weightA>%, <b>)`: `weightA` is the fraction of
 * colour `a` in the result (0..1). Used to keep derivation in lockstep with
 * the tinted surfaces the generated CSS renders.
 */
export function mixSrgb(a: string, b: string, weightA: number): string {
  const ca = hexToRgb(a);
  const cb = hexToRgb(b);
  const w = clamp01(weightA);
  const mix = (x: number, y: number) => toHexByte(x * w + y * (1 - w));
  return `#${mix(ca.r, cb.r)}${mix(ca.g, cb.g)}${mix(ca.b, cb.b)}`;
}

export function isValidCssColor(value: string): boolean {
  if (/^#[0-9a-f]{3}([0-9a-f]{3})?$/i.test(value.trim())) return true;
  const m = /^oklch\(\s*([0-9.]+)\s+([0-9.]+)\s+([0-9.]+)\s*\)$/.exec(value.trim());
  if (!m) return false;
  const l = parseFloat(m[1]);
  const c = parseFloat(m[2]);
  const h = parseFloat(m[3]);
  return l >= 0 && l <= 1 && c >= 0 && c <= 0.5 && h >= 0 && h <= 360;
}
