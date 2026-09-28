// Shared reactive theme state for the builder UI.
// Single source of truth: @tsup-system/core — the exact engine the CLI uses,
// so the preview can never diverge from generated output.
import {
	DEFAULT_THEME,
	PRESET_THEMES,
	matchPreset,
	generateTheme,
	generateThemeFiles,
	generateFontsCss,
	generateLayoutCss,
	fontRoleVars,
	fontWeightVars,
	fontStacks,
	buildBunxCommand,
	contrastWarnings,
	googleFontHref,
	type BlockquoteVariant,
	type BreakoutElement,
	type BreakoutLevel,
	type SizeValue,
	type FontElement,
		type FontRole,
		type ThemeColors,
	type SemanticName,
	type TextSource,
	type ThemeOptions
} from '@tsup-system/core';

export type ColorKey = keyof ThemeColors;

export type ColorGroup = 'Surfaces' | 'Content' | 'Emphasis' | 'Contrast' | 'Traffic';

export const COLOR_GROUPS: ColorGroup[] = ['Surfaces', 'Content', 'Emphasis', 'Contrast', 'Traffic'];

export const COLOR_FIELDS: { key: ColorKey; label: string; hint: string; group: ColorGroup }[] = [
	{ key: 'base', label: 'Base', hint: 'Page background', group: 'Surfaces' },
	{ key: 'alt', label: 'Alt', hint: 'Cards, code blocks, tables', group: 'Surfaces' },
	{ key: 'prose', label: 'Prose', hint: 'Paragraphs, headings', group: 'Content' },
	{ key: 'muted', label: 'Muted', hint: 'Diminished text', group: 'Content' },
	{ key: 'accent', label: 'Accent', hint: 'Links, buttons, controls', group: 'Emphasis' },
	{ key: 'pop', label: 'Pop', hint: 'Badges, callouts, standouts', group: 'Emphasis' },
	{ key: 'inverse', label: 'Inverse', hint: 'Content on contrasting surfaces', group: 'Contrast' },
	{ key: 'trafficStop', label: 'Stop', hint: 'Errors, destructive', group: 'Traffic' },
	{ key: 'trafficWarning', label: 'Warning', hint: 'Caution, pending', group: 'Traffic' },
	{ key: 'trafficOk', label: 'OK', hint: 'Success, confirmed', group: 'Traffic' }
];

export const ASSIGNMENT_ELEMENTS: { key: FontElement; label: string }[] = [
	{ key: 'h1', label: 'H1' },
	{ key: 'h2', label: 'H2' },
	{ key: 'h3', label: 'H3' },
	{ key: 'h4', label: 'H4' },
	{ key: 'h5', label: 'H5' },
	{ key: 'h6', label: 'H6' },
	{ key: 'p', label: 'Paragraph' },
	{ key: 'list', label: 'Lists' },
	{ key: 'blockquote', label: 'Blockquote' },
	{ key: 'code', label: 'Code / Pre' }
];

export const theme = $state<ThemeOptions>(structuredClone(DEFAULT_THEME));

/**
 * Plain-object read of theme state with direct property access.
 * NOTE: $state.snapshot() must NOT be used inside $derived — it does not
 * establish subscriptions, so updates never propagate. Spreading the proxy
 * reads every key reactively instead.
 */
function readTheme(): ThemeOptions {
	return {
		version: theme.version,
		colors: { ...theme.colors },
		fonts: { ...theme.fonts },
		weights: theme.weights ? { ...theme.weights } : undefined,
		elementWeights: theme.elementWeights ? { ...theme.elementWeights } : undefined,
		fontAssignments: theme.fontAssignments ? { ...theme.fontAssignments } : undefined,
		width: { ...(theme.width ?? DEFAULT_THEME.width!) },
		breakout: { ...(theme.breakout ?? DEFAULT_THEME.breakout!) },
		breakouts: theme.breakouts ? { ...theme.breakouts } : undefined,
		textSource: theme.textSource ? { ...theme.textSource } : undefined
	};
}

// Module-private deriveds (Svelte forbids exporting $derived directly);
// exposed below via getter functions, which stay reactive in markup.
const _generated = $derived.by(() => generateTheme(readTheme()));

const _fontHref = $derived.by(() => googleFontHref(readTheme()) ?? '');

const _bunxCommand = $derived.by(() => buildBunxCommand(readTheme()));

const _warnings = $derived.by(() => contrastWarnings(readTheme()));

const _layoutCss = $derived.by(() => generateLayoutCss());

/** Reactive inline-style string with every generated variable for the preview scope. */
const _varStyle = $derived.by(() => {
	const s = readTheme();
	const stacks = fontStacks(s);
	const vars: Record<string, string> = {
		..._generated.variables,
		'--font-primary': stacks.primary,
		'--font-secondary': stacks.secondary,
		...fontRoleVars(s),
		...Object.fromEntries(Object.entries(fontWeightVars(s)).map(([k, v]) => [k, String(v)]))
	};
	if (stacks.tertiary) vars['--font-tertiary'] = stacks.tertiary;
	return Object.entries(vars)
		.map(([k, v]) => `${k}:${v}`)
		.join(';');
});

export function getGenerated(): ReturnType<typeof generateTheme> {
	return _generated;
}

export function getFontHref(): string {
	return _fontHref;
}

export function getBunxCommand(): string {
	return _bunxCommand;
}

export function getWarnings(): ReturnType<typeof contrastWarnings> {
	return _warnings;
}

export function getVarStyle(): string {
	return _varStyle;
}

export function getLayoutCss(): string {
	return _layoutCss;
}

export function getWidth(): SizeValue {
	return theme.width ?? DEFAULT_THEME.width!;
}

export function setWidth(width: SizeValue): void {
	theme.width = width;
}

export function getBreakoutWidth(): SizeValue {
	return theme.breakout ?? DEFAULT_THEME.breakout!;
}

export function setBreakoutWidth(breakout: SizeValue): void {
	theme.breakout = breakout;
}

export function getBreakoutRoute(el: BreakoutElement): BreakoutLevel {
	return theme.breakouts?.[el] ?? DEFAULT_THEME.breakouts?.[el] ?? 'content';
}

export function setBreakoutRoute(el: BreakoutElement, level: BreakoutLevel): void {
	if (!theme.breakouts) theme.breakouts = {};
	theme.breakouts[el] = level;
}

export function getBlockquote(): BlockquoteVariant {
	return theme.components?.blockquote ?? 'rule';
}

export function setBlockquote(variant: BlockquoteVariant): void {
	if (!theme.components) theme.components = {};
	theme.components.blockquote = variant;
}

/** Encoded text-source value for the prose-on dropdown: "auto" or "sem:level". */
export function getTextSource(): string {
  const ts = theme.textSource;
  return ts ? `${ts.sem}:${ts.level}` : "auto";
}

export function setTextSource(value: string): void {
  if (value === "auto") {
    theme.textSource = undefined;
    return;
  }
  const [sem, level] = value.split(":");
  if (!sem || (level !== "light" && level !== "base" && level !== "dark")) return;
  theme.textSource = { sem: sem as SemanticName, level };
}

/** Full standalone document CSS for the iframe preview (same files the CLI ships). */
export function getDocumentCss(): string {
	const s = readTheme();
	const gen = generateTheme(s);
	const files = generateThemeFiles(s, gen, generateFontsCss(s));
	return [files['root.css'], files['base.css'], files['typography.css'], files['markdown.css'], files['layout.css']].join('\n');
}

// Structural CSS (base / typography / markdown) only references variables, so
// it is theme-independent: compute once from the shared generator.
const _gen = generateTheme(DEFAULT_THEME);
const _files = generateThemeFiles(DEFAULT_THEME, _gen, '');
export const STRUCTURAL_CSS: string = [_files['base.css'], _files['typography.css'], _files['markdown.css']].join('\n');

export function setAssignment(el: FontElement, role: FontRole): void {
	if (!theme.fontAssignments) theme.fontAssignments = {};
	theme.fontAssignments[el] = role;
}

export function assignmentFor(el: FontElement): FontRole {
	return theme.fontAssignments?.[el] ?? 'primary';
}

/** Base (role) variable weight. */
export function roleWeight(role: FontRole): number {
	return theme.weights?.[role] ?? 400;
}

export function setRoleWeight(role: FontRole, weight: number): void {
	if (!theme.weights) theme.weights = {};
	theme.weights[role] = weight;
}

/** Effective variable weight for an element: element override wins. */
export function elementWeight(el: FontElement): number {
	return theme.elementWeights?.[el] ?? roleWeight(assignmentFor(el));
}

export function setElementWeight(el: FontElement, weight: number): void {
	if (!theme.elementWeights) theme.elementWeights = {};
	theme.elementWeights[el] = weight;
}

export function getActivePreset(): string | null {
	return matchPreset(theme.colors);
}

/** Apply a preset's colours only — fonts, layout and assignments are kept. */
export function applyPresetTheme(name: string): void {
	const preset = PRESET_THEMES.find((p) => p.name === name);
	if (!preset) return;
	theme.colors = { ...preset.colors };
}

export function resetTheme(): void {
	const fresh = structuredClone(DEFAULT_THEME);
	theme.version = fresh.version;
	theme.colors = fresh.colors;
	theme.fonts = fresh.fonts;
	theme.weights = fresh.weights;
	theme.elementWeights = fresh.elementWeights;
	theme.fontAssignments = fresh.fontAssignments;
	theme.width = fresh.width;
	theme.breakout = fresh.breakout;
	theme.breakouts = fresh.breakouts;
	theme.components = fresh.components;
	theme.textSource = fresh.textSource;
}
