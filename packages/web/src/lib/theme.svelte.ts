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
	type ContentWidth,
	type FontElement,
	type FontRole,
	type LayoutMode,
	type ThemeColors,
	type ThemeOptions
} from '@tsup-system/core';

export type ColorKey = keyof ThemeColors;

export const COLOR_FIELDS: { key: ColorKey; label: string; hint: string }[] = [
	{ key: 'prose', label: 'Prose', hint: 'Paragraphs, headings' },
	{ key: 'base', label: 'Base', hint: 'Page background' },
	{ key: 'alt', label: 'Alt', hint: 'Cards, code blocks, tables' },
	{ key: 'accent', label: 'Accent', hint: 'Links, highlights' },
	{ key: 'brandPrimary', label: 'Brand Primary', hint: 'Primary brand' },
	{ key: 'brandSecondary', label: 'Brand Secondary', hint: 'Secondary brand' },
	{ key: 'trafficStop', label: 'Stop', hint: 'Errors, destructive' },
	{ key: 'trafficWarning', label: 'Warning', hint: 'Caution, pending' },
	{ key: 'trafficOk', label: 'OK', hint: 'Success, confirmed' }
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
		fontAssignments: theme.fontAssignments ? { ...theme.fontAssignments } : undefined,
		layout: theme.layout ?? 'compact',
		width: theme.width ?? 'wide'
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

export function getLayout(): LayoutMode {
	return theme.layout ?? 'compact';
}

export function setLayout(mode: LayoutMode): void {
	theme.layout = mode;
}

export function getLayoutCss(): string {
	return _layoutCss;
}

export function getWidth(): ContentWidth {
	return theme.width ?? 'wide';
}

export function setWidth(width: ContentWidth): void {
	theme.width = width;
}

export function getBlockquote(): BlockquoteVariant {
	return theme.components?.blockquote ?? 'rule';
}

export function setBlockquote(variant: BlockquoteVariant): void {
	if (!theme.components) theme.components = {};
	theme.components.blockquote = variant;
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

export function getActivePreset(): string | null {
	return matchPreset(theme.colors);
}

/** Apply a preset's colours only — fonts, layout and assignments are kept. */
export function applyPresetTheme(name: string): void {
	const preset = PRESET_THEMES.find((p) => p.name === name);
	if (!preset) return;
	theme.colors = { ...preset.colors };
}

export function resetTheme(): void {	const fresh = structuredClone(DEFAULT_THEME);
	theme.version = fresh.version;
	theme.colors = fresh.colors;
	theme.fonts = fresh.fonts;
	theme.fontAssignments = fresh.fontAssignments;
	theme.layout = fresh.layout;
	theme.width = fresh.width;
	theme.components = fresh.components;
}
