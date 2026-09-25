// Fluid type scale, following the fluid-type.tolin.ski method:
// each level interpolates linearly between a min and max viewport width,
// emitted as clamp(min, intercept + slope * 100vi, max).
// Desktop (max) sizes reproduce the Splendor modular scale; mobile (min)
// sizes keep headings proportional on small screens.

export interface FluidRange {
  minVw: number; // px
  maxVw: number; // px
}

export const FLUID_RANGE: FluidRange = { minVw: 360, maxVw: 1280 };

const round4 = (n: number): number => Math.round(n * 10000) / 10000;

/** Preferred size in px at a given viewport width (linear interpolation). */
export function fluidPreferred(minPx: number, maxPx: number, vwPx: number, range = FLUID_RANGE): number {
  const slope = (maxPx - minPx) / (range.maxVw - range.minVw);
  return minPx + slope * (vwPx - range.minVw);
}

export function fluidClamp(minPx: number, maxPx: number, range = FLUID_RANGE): string {
  if (maxPx <= minPx) return `${round4(minPx / 16)}rem`;
  const slope = (maxPx - minPx) / (range.maxVw - range.minVw);
  const interceptPx = minPx - slope * range.minVw;
  return `clamp(${round4(minPx / 16)}rem, ${round4(interceptPx / 16)}rem + ${round4(slope * 100)}vi, ${round4(maxPx / 16)}rem)`;
}

/** [mobileMinPx, desktopMaxPx] per element. Desktop max = Splendor scale. */
export const FLUID_SIZES: Record<string, [number, number]> = {
  h1: [34, 64],
  h2: [29, 45],
  h3: [24, 32],
  h4: [20, 23],
  h5: [17, 18],
  h6: [14, 14],
  p: [15, 17],
  blockquote: [20, 24],
  code: [12.8, 12.8],
};
