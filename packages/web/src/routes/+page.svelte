<script lang="ts">
	import {
		CURATED_FONTS,
		FLUID_SIZES,
		BREAKOUT_ELEMENTS,
		SIZE_UNITS,
		BLOCKQUOTE_VARIANTS,
		PRESET_THEMES,
		SCALE_STEPS,
		fluidClamp,
		docShellClasses,
		resolveTailwindHex,
		type BlockquoteVariant,
		type BreakoutElement,
		type BreakoutLevel,
		type SizeUnit,
		type SizeValue,
		type FontElement,
		type FontRole,
		type SemanticName
	} from '@tsup-system/core';
	import {
		Check,
		Copy,
		LayoutGrid,
		Monitor,
		Palette,
		PanelRight,
		PanelRightClose,
		Quote,
		RotateCcw,
		Smartphone,
		Tablet,
		Type
	} from 'lucide-svelte';
	import { mount, unmount, untrack } from 'svelte';
	import ColorField from '$lib/components/ColorField.svelte';
	import Footer from '$lib/components/Footer.svelte';
	import Icon from '$lib/components/Icon.svelte';
	import SampleDoc from '$lib/sample.svx';
	import {
		theme,
		COLOR_FIELDS,
		ASSIGNMENT_ELEMENTS,
		STRUCTURAL_CSS,
		getVarStyle,
		getFontHref,
		getBunxCommand,
		getWarnings,
		getGenerated,
		getActivePreset,
		applyPresetTheme,
		getWidth,
		setWidth,
		getBreakoutWidth,
		setBreakoutWidth,
		getBreakoutRoute,
		setBreakoutRoute,
		getBlockquote,
		setBlockquote,
		getDocumentCss,
		getLayoutCss,
		setAssignment,
		assignmentFor,
		roleWeight,
		setRoleWeight,
		elementWeight,
		setElementWeight,
		resetTheme,
		type ColorKey
	} from '$lib/theme.svelte.js';

	type RoleKey = 'primary' | 'secondary' | 'tertiary';

	const ROLE_LABEL: Record<RoleKey, string> = {
		primary: 'Primary',
		secondary: 'Secondary',
		tertiary: 'Tertiary (optional)'
	};

	let customOpen = $state<Record<RoleKey, boolean>>({
		primary: false,
		secondary: false,
		tertiary: false
	});
	let customName = $state<Record<RoleKey, string>>({ primary: '', secondary: '', tertiary: '' });

	const isCurated = (name: string | undefined): boolean =>
		!!name && CURATED_FONTS.some((f) => f.name === name);

	function fontSelectValue(role: RoleKey): string {
		const v = theme.fonts[role];
		if (!v) return role === 'tertiary' ? '__none' : '';
		if (isCurated(v)) return v;
		return '__custom';
	}

	function onFontSelect(role: RoleKey, v: string): void {
		if (v === '__custom') {
			customOpen[role] = true;
			const current = theme.fonts[role];
			customName[role] = current && !isCurated(current) ? current : '';
			return;
		}
		customOpen[role] = false;
		theme.fonts[role] = v === '' || v === '__none' ? undefined : v;
		const entry = CURATED_FONTS.find((f) => f.name === theme.fonts[role]);
		const w = theme.weights?.[role];
		if (entry?.variable && w !== undefined) onWeight(role, w);
	}

	function onCustomInput(role: RoleKey, v: string): void {
		customName[role] = v;
		theme.fonts[role] = v.trim() ? v.trim() : undefined;
	}

	function weightRange(role: RoleKey): [number, number] | null {
		const entry = CURATED_FONTS.find((f) => f.name === theme.fonts[role]);
		if (!entry || !entry.variable) return null;
		return [entry.weightMin, entry.weightMax];
	}

	/** Range of the variable font serving an element's role, or null if static. */
	function elementWeightRange(el: FontElement): [number, number] | null {
		return weightRange(assignmentFor(el) as RoleKey);
	}

	function onWeight(role: RoleKey, v: number): void {
		const range = weightRange(role);
		if (!range) return;
		setRoleWeight(role, Math.min(range[1], Math.max(range[0], Math.round(v))));
	}

	function onElementWeight(el: FontElement, v: number): void {
		const range = elementWeightRange(el);
		if (!range) return;
		setElementWeight(el, Math.min(range[1], Math.max(range[0], Math.round(v))));
	}

	const ROLES: RoleKey[] = ['primary', 'secondary', 'tertiary'];

	const BREAKOUT_ELEMENT_LABEL: Record<BreakoutElement, string> = {
		blockquote: 'Blockquote',
		table: 'Table',
		pre: 'Code block',
		img: 'Images',
		callout: 'Callouts',
		hr: 'Rules'
	};

	const BREAKOUT_LEVELS: BreakoutLevel[] = ['content', 'breakout', 'full'];

	// Slider bounds per unit. Content has a floor; breakout is extra overhang
	// and must be able to reach 0 (flush with content).
	const CONTENT_RANGE: Record<SizeUnit, { min: number; max: number; step: number }> = {
		'%': { min: 20, max: 100, step: 1 },
		rem: { min: 10, max: 120, step: 1 },
		em: { min: 10, max: 120, step: 1 },
		ch: { min: 20, max: 120, step: 1 },
		px: { min: 160, max: 1920, step: 10 }
	};
	const BREAKOUT_RANGE: Record<SizeUnit, { min: number; max: number; step: number }> = {
		'%': { min: 0, max: 40, step: 1 },
		rem: { min: 0, max: 20, step: 1 },
		em: { min: 0, max: 20, step: 1 },
		ch: { min: 0, max: 40, step: 1 },
		px: { min: 0, max: 400, step: 10 }
	};
	const contentRange = $derived(CONTENT_RANGE[getWidth().unit]);
	const breakoutRange = $derived(BREAKOUT_RANGE[getBreakoutWidth().unit]);

	function sizePx(s: SizeValue, refPx = 1480): number {
		if (s.unit === '%') return (s.value / 100) * refPx;
		if (s.unit === 'px') return s.value;
		if (s.unit === 'rem' || s.unit === 'em') return s.value * 16;
		return s.value * 8; // ch ≈ 8px at typical body size
	}

	const contentPct = $derived(`${Math.min(100, Math.round((sizePx(getWidth()) / 1480) * 100))}%`);
	const breakoutPct = $derived(
		`${Math.min(100, Math.round((sizePx(getWidth()) / 1480) * 100) + Math.round((sizePx(getBreakoutWidth()) / 1480) * 200))}%`
	);

	function setWidthValue(value: number): void {
		setWidth({ ...getWidth(), value });
	}
	function setWidthUnit(unit: SizeUnit): void {
		setWidth({ value: clampForUnit(getWidth().value, unit), unit });
	}
	function setBreakoutValue(value: number): void {
		setBreakoutWidth({ ...getBreakoutWidth(), value });
	}
	function setBreakoutUnit(unit: SizeUnit): void {
		setBreakoutWidth({ value: clampForUnit(getBreakoutWidth().value, unit), unit });
	}
	function clampForUnit(value: number, unit: SizeUnit): number {
		const r = BREAKOUT_RANGE[unit];
		return Math.min(r.max, Math.max(r.min, value));
	}

	type StepId = 'step-fonts' | 'step-colours' | 'step-layout' | 'step-components';

	const STEPS: {
		id: StepId;
		n: number;
		short: string;
		title: string;
		blurb: string;
		activeCls: string;
	}[] = [
		{
			id: 'step-fonts',
			n: 1,
			short: 'Font',
			title: 'Select your font',
			blurb: 'Pick Google Fonts, assign roles to elements',
			activeCls: 'border-sky-200 bg-sky-100'
		},
		{
			id: 'step-colours',
			n: 2,
			short: 'Colours',
			title: 'Choose your theme colours',
			blurb: 'Nine semantic anchors, Tailwind palette',
			activeCls: 'border-violet-200 bg-violet-100'
		},
		{
			id: 'step-layout',
			n: 3,
			short: 'Layout',
			title: 'Select your layout',
			blurb: 'Content measure, breakouts and routing',
			activeCls: 'border-emerald-200 bg-emerald-100'
		},
		{
			id: 'step-components',
			n: 4,
			short: 'Components',
			title: 'Style your components',
			blurb: 'Blockquote variants, more to follow',
			activeCls: 'border-rose-200 bg-rose-100'
		}
	];

	const BLOCKQUOTE_BLURB: Record<BlockquoteVariant, string> = {
		rule: 'Accent rule · current default',
		pull: 'Large centered pull-quote',
		minimal: 'Plain indent, no chrome'
	};

	const STEP_ICON = [Type, Palette, LayoutGrid, Quote];

	let activeStep = $state<StepId>('step-fonts');
	let cssPanelOpen = $state(false);
	let footerVisible = $state(false);
	let frame: HTMLIFrameElement | undefined = $state(undefined);
	let frameRO: ResizeObserver | undefined = undefined;

	type PreviewViewport = 'full' | 'tablet' | 'mobile';
	const VIEWPORTS: { id: PreviewViewport; label: string; px: string }[] = [
		{ id: 'full', label: 'Desktop full width', px: 'none' },
		{ id: 'tablet', label: 'Tablet · 768px', px: '768px' },
		{ id: 'mobile', label: 'Mobile · 390px', px: '390px' }
	];
	let previewViewport = $state<PreviewViewport>('full');

	// Desktop preview measure: 1280px, or 1480px once the browser is wide enough.
	let windowWidth = $state(1280);
	const desktopMax = $derived(windowWidth < 1480 ? '1280px' : '1480px');
	const previewMax = $derived(
		previewViewport === 'tablet' ? '768px' : previewViewport === 'mobile' ? '390px' : desktopMax
	);

	const CHIPS = [
		['brand-primary', 'var(--brand-primary)', 'var(--base-50)'],
		['brand-secondary', 'var(--brand-secondary)', 'var(--base-50)'],
		['stop · 100', 'var(--traffic-stop-100)', 'var(--traffic-stop-900)'],
		['warning · 100', 'var(--traffic-warning-100)', 'var(--traffic-warning-900)'],
		['ok · 100', 'var(--traffic-ok-100)', 'var(--traffic-ok-900)']
	]
		.map(
			([label, bg, fg]) =>
				`<span style="border-radius:9999px;padding:0.25rem 0.75rem;font-size:0.75rem;font-weight:600;background:${bg};color:${fg}">${label}</span>`
		)
		.join('');
	const CHIPS_HTML = `<div style="display:flex;flex-wrap:wrap;gap:0.5rem;margin-top:2rem;">${CHIPS}</div>`;

	// Isolated document preview. The sample markup never changes with theme, so
	// it is rendered once; theme updates are applied to the live iframe document
	// in place (style + classes) — no remount, no reload, no page-height jumps.
	let sampleHtml = $state('');

	$effect(() => {
		if (sampleHtml) return;
		const host = document.createElement('div');
		const comp = mount(SampleDoc, { target: host });
		sampleHtml = host.innerHTML;
		unmount(comp);
	});

	$effect(() => {
		const el = frame;
		if (!el || !sampleHtml) return;
		// Seed with the current CSS (non-reactive) to avoid a first-paint flash.
		const css = untrack(() => getDocumentCss());
		el.srcdoc =
			`<!DOCTYPE html><html><head><meta charset="utf-8">` +
			`<meta name="viewport" content="width=device-width,initial-scale=1">` +
			`<style id="tsb-theme">${css}</style></head>` +
			`<body class="markdown">` +
			`<div class="${docShellClasses()}" data-grid="">${sampleHtml}${CHIPS_HTML}</div></body></html>`;
	});

	function applyToFrame(): void {
		const doc = frame?.contentDocument;
		if (!doc || !doc.body) return;
		const css = getDocumentCss();
		let style = doc.getElementById('tsb-theme') as HTMLStyleElement | null;
		if (!style) {
			style = doc.createElement('style');
			style.id = 'tsb-theme';
			doc.head.appendChild(style);
		}
		if (style.textContent !== css) style.textContent = css;

		const href = getFontHref();
		let link = doc.getElementById('tsb-fonts') as HTMLLinkElement | null;
		if (href) {
			if (!link) {
				link = doc.createElement('link');
				link.id = 'tsb-fonts';
				link.rel = 'stylesheet';
				doc.head.appendChild(link);
			}
			if (link.getAttribute('href') !== href) link.setAttribute('href', href);
		} else if (link) {
			link.remove();
		}

		const bodyCls = `markdown bq-${getBlockquote()}`;
		if (doc.body.className !== bodyCls) doc.body.className = bodyCls;
		const shell = doc.body.firstElementChild as HTMLElement | null;
		if (shell) {
			const cls = docShellClasses();
			if (shell.className !== cls) shell.className = cls;
		}
	}

	$effect(() => {
		// Subscribe to every theme input, then patch the live document.
		getDocumentCss();
		getFontHref();
		getBlockquote();
		getWidth();
		applyToFrame();
		// Re-measure now and next frame (layout of the patched styles).
		fitFrame();
		const raf = requestAnimationFrame(fitFrame);
		return () => cancelAnimationFrame(raf);
	});

	function fitFrame(): void {
		const el = frame;
		const doc = el?.contentDocument;
		if (!el || !doc) return;
		const fit = () => {
			// Measure the body only. documentElement.scrollHeight reports the
			// iframe's own viewport when content is shorter, which would stop
			// the frame from ever shrinking.
			const body = doc.body;
			const contentH = Math.max(
				body ? body.getBoundingClientRect().height : 0,
				body ? body.scrollHeight : 0
			);
			const next = `${Math.max(Math.ceil(contentH), 200)}px`;
			if (el.style.height !== next) el.style.height = next;
		};
		fit();
		try {
			doc.fonts.ready.then(fit);
		} catch {
			/* fonts API unavailable — initial fit stands */
		}
		try {
			frameRO?.disconnect();
			frameRO = new ResizeObserver(fit);
			if (doc.documentElement) frameRO.observe(doc.documentElement);
			if (doc.body) frameRO.observe(doc.body);
		} catch {
			/* ResizeObserver unavailable — onload fit stands */
		}
	}

	function jumpTo(id: StepId): void {
		document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
	}

	function stepHeaderCls(id: StepId): string {
		const s = STEPS.find((x) => x.id === id);
		const idx = STEPS.findIndex((x) => x.id === id);
		const tint = s && activeStep === id ? s.activeCls : 'border-neutral-200 bg-white/95';
		return `sticky z-10 -mx-1 scroll-mt-44 rounded-lg border px-3 shadow-sm backdrop-blur ${tint}`;
	}

	// Sticky pitch measured at runtime so the headers always land flush,
	// whatever the nav height or font loading does.
	let stackTops = $state(['56px', '98px', '140px', '182px']);

	function measureStack(): void {
		const nav = document.querySelector('header')?.getBoundingClientRect().height ?? 56;
		const heights = STEPS.map((s) => document.getElementById(s.id)?.getBoundingClientRect().height ?? 42);
		let top = nav;
		stackTops = heights.map((h) => {
			const t = `${Math.round(top)}px`;
			top += h;
			return t;
		});
	}

	$effect(() => {
		windowWidth = window.innerWidth;
		measureStack();
		const raf = requestAnimationFrame(() => measureStack());
		try {
			document.fonts.ready.then(() => measureStack());
		} catch {
			/* fonts API unavailable */
		}
		window.addEventListener('resize', measureStack);
		return () => {
			cancelAnimationFrame(raf);
			window.removeEventListener('resize', measureStack);
		};
	});

	$effect(() => {
		const bodies = Array.from(document.querySelectorAll('[data-step]'));
		const observer = new IntersectionObserver(
			(entries) => {
				for (const e of entries) {
					if (e.isIntersecting && e.target instanceof HTMLElement) {
						activeStep = e.target.dataset.step as StepId;
					}
				}
			},
			{ rootMargin: '-30% 0px -60% 0px' }
		);
		for (const b of bodies) observer.observe(b);
		return () => observer.disconnect();
	});

	// Unstick the bunx command bar once the site footer scrolls into view.
	$effect(() => {
		const el = document.getElementById('site-footer');
		if (!el) return;
		const observer = new IntersectionObserver(
			(entries) => {
				footerVisible = entries.some((e) => e.isIntersecting);
			},
			{ threshold: 0 }
		);
		observer.observe(el);
		return () => observer.disconnect();
	});

	let copied = $state(false);

	function swatch(name: string): string {
		try {
			return resolveTailwindHex(name);
		} catch {
			return 'transparent';
		}
	}

	function fmtSize(s: SizeValue): string {
		return `${s.value}${s.unit}`;
	}

	async function copyCommand(): Promise<void> {
		try {
			await navigator.clipboard.writeText(getBunxCommand());
		} catch {
			const ta = document.createElement('textarea');
			ta.value = getBunxCommand();
			document.body.appendChild(ta);
			ta.select();
			document.execCommand('copy');
			ta.remove();
		}
		copied = true;
		setTimeout(() => (copied = false), 2000);
	}

	const SPECIMEN: { el: keyof typeof FLUID_SIZES; tag: string; sample: string }[] = [
		{ el: 'h1', tag: 'h1', sample: 'Fluid display' },
		{ el: 'h2', tag: 'h2', sample: 'Scales with viewport' },
		{ el: 'h3', tag: 'h3', sample: 'No breakpoints needed' },
		{ el: 'h4', tag: 'h4', sample: 'One clamp per level' },
		{ el: 'p', tag: 'p', sample: 'The quick brown fox jumps over the lazy dog.' },
		{ el: 'blockquote', tag: 'blockquote', sample: 'Simplicity is the soul of efficiency.' }
	];

	const SCALE_GROUPS: { sem: SemanticName; label: string; anchor: ColorKey }[] = [
		{ sem: 'base', label: 'Base', anchor: 'base' },
		{ sem: 'alt', label: 'Alt', anchor: 'alt' },
		{ sem: 'prose', label: 'Prose', anchor: 'prose' },
		{ sem: 'accent', label: 'Accent', anchor: 'accent' },
		{ sem: 'brand-primary', label: 'Brand Primary', anchor: 'brandPrimary' },
		{ sem: 'brand-secondary', label: 'Brand Secondary', anchor: 'brandSecondary' },
		{ sem: 'traffic-stop', label: 'Stop', anchor: 'trafficStop' },
		{ sem: 'traffic-warning', label: 'Warning', anchor: 'trafficWarning' },
		{ sem: 'traffic-ok', label: 'OK', anchor: 'trafficOk' }
	];

	const TREE = `theme/
├── root.css          semantic scales
├── fonts.css         Google Fonts + stacks
├── base.css          html / body / links
├── typography.css    fluid type
├── markdown.css      quotes / tables / code
├── layout.css        breakout grid
├── tailwind.css      @theme bridge
└── index.css         imports all`;

	const TAILWIND_EXCERPT = `@import "tailwindcss";
@theme inline {
  --color-brand-primary: var(--brand-primary-600);
  --color-traffic-ok: var(--traffic-ok-600);
  --font-primary: var(--font-primary);
}`;

	const USAGE_EXCERPT = `<div class="bg-brand-primary font-primary">
  Ships with your system
</div>`;
</script>

<svelte:head>
	<title>Design System Builder</title>
	{#if getFontHref()}
		<link rel="stylesheet" href={getFontHref()} />
	{/if}
</svelte:head>

{@html '<style>' + STRUCTURAL_CSS + getLayoutCss() + '</style>'}

<svelte:window
	onresize={() => {
		windowWidth = window.innerWidth;
		fitFrame();
	}}
/>

<div class="flex min-h-screen flex-col bg-neutral-100 text-neutral-900">
	<header class="sticky top-0 z-30 border-b border-neutral-200 bg-white">
		<div class="mx-auto flex max-w-6xl items-center gap-2 px-4 py-2.5 sm:px-8">
			<p class="flex items-center gap-2 text-sm font-semibold whitespace-nowrap">
				<Icon src="shapes" ctx="hand-1" size="1.75em" />
				<span class="hidden text-base font-normal sm:inline" style="font-family:'Chewy', system-ui, sans-serif;"
					>three<span class="opacity-55">jjj</span>s</span
				>
				Design System Builder
			</p>
			<nav aria-label="Builder steps" class="mx-auto hidden items-center gap-1 md:flex">
				{#each STEPS as s, i (s.id)}
					{@const Icon = STEP_ICON[i]}
					<button
						type="button"
						onclick={() => jumpTo(s.id)}
						aria-current={activeStep === s.id ? 'step' : undefined}
						class="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium {activeStep ===
						s.id
							? 'bg-neutral-900 text-white'
							: 'text-neutral-600 hover:bg-neutral-100'}"
					>
						<Icon size={14} class="hidden sm:inline" />
						{s.n} · {s.short}
					</button>
				{/each}
			</nav>
			<div class="ml-auto flex items-center gap-1.5 md:ml-0">
				<button
					type="button"
					onclick={() => (cssPanelOpen = !cssPanelOpen)}
					aria-expanded={cssPanelOpen}
					title="Toggle CSS preview panel"
					class="hidden items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs font-medium md:flex {cssPanelOpen
						? 'border-neutral-900 bg-neutral-900 text-white'
						: 'border-neutral-300 hover:bg-neutral-50'}"
				>
					{#if cssPanelOpen}
						<PanelRightClose size={16} />
					{:else}
						<PanelRight size={16} />
					{/if}
					<span class="hidden sm:inline">CSS preview</span>
				</button>
				<button
					type="button"
					onclick={resetTheme}
					title="Reset to defaults"
					class="flex items-center gap-1.5 rounded-md border border-neutral-300 px-2.5 py-1.5 text-xs font-medium hover:bg-neutral-50"
				>
					<RotateCcw size={16} />
					<span class="hidden sm:inline">Reset</span>
				</button>
			</div>
		</div>
	</header>

	{#if getWarnings().length > 0}
		<div class="border-b border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-900">
			<div class="mx-auto max-w-6xl sm:px-8">
				{#each getWarnings() as w (w.pair)}
					<p>{w.message}</p>
				{/each}
			</div>
		</div>
	{/if}

	<div
		class="min-w-0 flex-1 transition-[margin] duration-300 {cssPanelOpen ? 'lg:mr-[26rem]' : ''}"
	>
		<section class="mx-auto max-w-6xl px-4 pt-8 pb-2 sm:px-8">
			<p class="w-fit rounded-full bg-neutral-900 px-3 py-1 text-xs font-medium text-white">
				Tailwind-compatible · scaffold CSS generator
			</p>
			<h1 class="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">Ship your design system</h1>
			<p class="mt-2 max-w-2xl text-sm text-neutral-600 sm:text-base">
				This generator produces your design-system scaffold CSS — semantic colour scales, fluid
				type, Markdown styles, breakout layout and a Tailwind bridge — from three steps, exported as
				a single bunx command.
			</p>
			<ol class="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
				{#each STEPS as s, i (s.id)}
					{@const Icon = STEP_ICON[i]}
					<li>
						<button
							type="button"
							onclick={() => jumpTo(s.id)}
							class="flex w-full items-start gap-2.5 rounded-lg border border-neutral-200 bg-white p-3 text-left hover:border-neutral-400"
						>
							<span class="mt-0.5 rounded-md bg-neutral-100 p-1.5"><Icon size={16} /></span>
							<span>
								<span class="block text-sm font-semibold">{s.n}. {s.title}</span>
								<span class="block text-xs text-neutral-500">{s.blurb}</span>
							</span>
						</button>
					</li>
				{/each}
			</ol>
		</section>

		<main class="mx-auto max-w-6xl px-4 sm:px-8">
			<div class="space-y-6 pt-6">
				<div id="step-fonts" class={stepHeaderCls('step-fonts')} style="top:{stackTops[0]}">
					<a
						href="#step-fonts"
						class="flex w-full items-center justify-between py-2.5"
					>
						<h2 class="flex items-center gap-2 text-sm font-semibold whitespace-nowrap">
							<span
								class="inline-flex h-5 w-5 items-center justify-center rounded-full bg-neutral-900 text-[11px] text-white"
								>1</span
							>
							Select your font
						</h2>
					</a>
				</div>
				<div id="step-fonts-body" data-step="step-fonts" class="space-y-4 pt-4">
						<div class="grid gap-3 md:grid-cols-3">
							{#each ROLES as role (role)}
								<label class="block rounded-lg border border-neutral-200 bg-white p-3">
									<span class="mb-1 block text-sm font-medium text-neutral-800"
										>{ROLE_LABEL[role]}</span
									>
									<select
										value={fontSelectValue(role)}
										onchange={(e) =>
											onFontSelect(role, (e.currentTarget as HTMLSelectElement).value)}
										class="w-full rounded-md border border-neutral-300 bg-white px-2 py-1.5 text-sm"
									>
										{#if role === 'tertiary'}
											<option value="__none">None (mono fallback)</option>
										{:else}
											<option value="">System default</option>
										{/if}
										{#each CURATED_FONTS as f (f.name)}
											<option value={f.name}>{f.name} · {f.category}</option>
										{/each}
										<option value="__custom">Custom Google Font…</option>
									</select>
									{#if fontSelectValue(role) === '__custom' || customOpen[role]}
										<input
											type="text"
											placeholder="e.g. Space Grotesk"
											value={customName[role]}
											oninput={(e) =>
												onCustomInput(role, (e.currentTarget as HTMLInputElement).value)}
											class="mt-1 w-full rounded-md border border-neutral-300 px-2 py-1.5 text-sm"
										/>
									{/if}
									{#if weightRange(role)}
										{@const range = weightRange(role)!}
										<span class="mt-2 flex items-center gap-2">
											<span class="shrink-0 text-xs text-neutral-500">Weight</span>
											<input
												type="range"
												min={range[0]}
												max={range[1]}
												step="10"
												value={roleWeight(role)}
												oninput={(e) =>
													onWeight(role, Number((e.currentTarget as HTMLInputElement).value))}
												class="min-w-0 flex-1 accent-neutral-900"
												aria-label={`${ROLE_LABEL[role]} variable weight`}
											/>
											<output class="w-10 shrink-0 text-right font-mono text-xs">{roleWeight(role)}</output>
										</span>
									{/if}
								</label>
							{/each}
						</div>
						<div class="rounded-lg border border-neutral-200 bg-white p-3">
							<h3 class="mb-2 text-xs font-semibold tracking-widest text-neutral-500 uppercase">
								Font assignments
							</h3>
							<div class="grid grid-cols-2 gap-2 sm:grid-cols-5">
								{#each ASSIGNMENT_ELEMENTS as el (el.key)}
									<label class="block">
										<span class="mb-1 block text-xs font-medium text-neutral-700">{el.label}</span>
										<select
											value={assignmentFor(el.key)}
											onchange={(e) =>
												setAssignment(
													el.key,
													(e.currentTarget as HTMLSelectElement).value as FontRole
												)}
											class="w-full rounded-md border border-neutral-300 bg-white px-2 py-1.5 text-sm"
										>
											<option value="primary">Primary</option>
											<option value="secondary">Secondary</option>
											<option value="tertiary">Tertiary</option>
										</select>
									</label>
								{/each}
							</div>
						</div>
						<div class="rounded-lg border border-neutral-200 bg-white p-3">
							<h3 class="mb-1 text-xs font-semibold tracking-widest text-neutral-500 uppercase">
								Fluid type scale
							</h3>
							<p class="mb-3 text-xs text-neutral-500">
								Live sizes from your theme — fluid between 360–1280px viewports, no breakpoints.
							</p>
							<div class={'markdown bq-' + getBlockquote()} style={getVarStyle()}>
								{#each SPECIMEN as row (row.el)}
									{@const [minPx, maxPx] = FLUID_SIZES[row.el]}
									{@const range = elementWeightRange(row.el as FontElement)}
									<div
										class="flex flex-col gap-1 border-b border-neutral-100 py-2 last:border-0 sm:flex-row sm:items-baseline sm:gap-4"
									>
										<span class="w-32 shrink-0 font-mono text-[11px] text-neutral-500"
											>{row.el} · {minPx}→{maxPx}px</span
										>
										{#if row.el === 'blockquote'}
											<blockquote><p>{row.sample}</p></blockquote>
										{:else}
											<svelte:element this={row.tag} style="margin: 0;">{row.sample}</svelte:element
											>
										{/if}
										{#if range}
											<span class="ml-auto flex shrink-0 items-center gap-2">
												<span class="text-[11px] text-neutral-500">w</span>
												<input
													type="range"
													min={range[0]}
													max={range[1]}
													step="10"
													value={elementWeight(row.el as FontElement)}
													oninput={(e) =>
														onElementWeight(row.el as FontElement, Number((e.currentTarget as HTMLInputElement).value))}
													class="w-28 accent-neutral-900"
													aria-label={`${row.el} variable weight`}
												/>
												<output class="w-9 shrink-0 text-right font-mono text-[11px] text-neutral-600"
													>{elementWeight(row.el as FontElement)}</output
												>
											</span>
										{/if}
									</div>
								{/each}
							</div>
						</div>
					</div>

				<div id="step-colours" class={stepHeaderCls('step-colours')} style="top:{stackTops[1]}">
					<a
						href="#step-colours"
						class="flex w-full items-center justify-between py-2.5"
					>
						<h2 class="flex items-center gap-2 text-sm font-semibold whitespace-nowrap">
							<span
								class="inline-flex h-5 w-5 items-center justify-center rounded-full bg-neutral-900 text-[11px] text-white"
								>2</span
							>
							Choose your theme colours
						</h2>
					</a>
				</div>
				<div>
					<h3 class="mb-2 text-xs font-semibold tracking-widest text-neutral-500 uppercase">Preset themes</h3>
					<div class="mb-4 flex flex-wrap gap-x-5 gap-y-2" role="radiogroup" aria-label="Preset themes">
						{#each PRESET_THEMES as p (p.name)}
							<label class="flex cursor-pointer items-center gap-1.5 text-sm" title={p.blurb}>
								<input
									type="radio"
									name="preset-theme"
									checked={getActivePreset() === p.name}
									onchange={() => applyPresetTheme(p.name)}
									class="accent-neutral-900"
								/>
								<span class="font-medium">{p.label}</span>
								<span class="flex" aria-hidden="true">
									<span class="inline-block h-3 w-3 rounded-full border border-black/20" style:background={swatch(p.colors.base)}></span>
									<span class="-ml-1 inline-block h-3 w-3 rounded-full border border-black/20" style:background={swatch(p.colors.accent)}></span>
									<span class="-ml-1 inline-block h-3 w-3 rounded-full border border-black/20" style:background={swatch(p.colors.brandPrimary)}></span>
								</span>
							</label>
						{/each}
					</div>
					<div
						id="step-colours-body"
						data-step="step-colours"
						class="grid gap-3 pt-4 md:grid-cols-2 xl:grid-cols-3"
					>
						{#each COLOR_FIELDS as field (field.key)}
							<div class="rounded-lg border border-neutral-200 bg-zinc-200 p-3">
								<ColorField
									label={field.label}
									hint={field.hint}
									bind:value={theme.colors[field.key as ColorKey]}
								/>
							</div>
						{/each}
					</div>
				</div>

				<div id="step-layout" class={stepHeaderCls('step-layout')} style="top:{stackTops[2]}">
					<a
						href="#step-layout"
						class="flex w-full items-center justify-between py-2.5"
					>
						<h2 class="flex items-center gap-2 text-sm font-semibold whitespace-nowrap">
							<span
								class="inline-flex h-5 w-5 items-center justify-center rounded-full bg-neutral-900 text-[11px] text-white"
								>3</span
							>
							Select your layout
						</h2>
					</a>
				</div>
				<div id="step-layout-body" data-step="step-layout" class="space-y-3 pt-4">
						<div class="rounded-lg border border-neutral-200 bg-white p-3">
							<h3 class="mb-2 text-xs font-semibold tracking-widest text-neutral-500 uppercase">Measure</h3>
							<div class="space-y-1">
								<div class="rounded-sm bg-neutral-100 px-2 py-1 text-[10px] text-neutral-500">full viewport</div>
								<div class="mx-auto rounded-sm bg-sky-100 px-2 py-1 text-[10px] text-sky-800" style:width={breakoutPct}>breakout</div>
								<div class="mx-auto rounded-sm bg-neutral-900 px-2 py-1 text-[10px] text-white" style:width={contentPct}>content</div>
							</div>
						</div>

						<div class="grid gap-3 md:grid-cols-2">
							<div class="rounded-lg border border-neutral-200 bg-white p-3">
								<span class="mb-1 block text-sm font-medium text-neutral-800">Content width</span>
								<div class="flex items-center gap-2">
									<input
										type="range"
										min={contentRange.min}
										max={contentRange.max}
										step={contentRange.step}
										value={getWidth().value}
										oninput={(e) => setWidthValue(Number((e.currentTarget as HTMLInputElement).value))}
										class="min-w-0 flex-1 accent-neutral-900"
										aria-label="Content width"
									/>
									<output class="w-12 shrink-0 text-right font-mono text-xs">{getWidth().value}</output>
									<select
										value={getWidth().unit}
										onchange={(e) => setWidthUnit((e.currentTarget as HTMLSelectElement).value as SizeUnit)}
										class="shrink-0 rounded-md border border-neutral-300 bg-white px-1.5 py-1 text-xs"
										aria-label="Content width unit"
									>
										{#each SIZE_UNITS as u (u)}<option value={u}>{u}</option>{/each}
									</select>
								</div>
								<span class="mt-1 block text-xs text-neutral-500"
									>Reading measure. Use ch for ~60–75 character lines; % scales with the container.</span
								>
							</div>
							<div class="rounded-lg border border-neutral-200 bg-white p-3">
								<span class="mb-1 block text-sm font-medium text-neutral-800">Breakout width</span>
								<div class="flex items-center gap-2">
									<input
										type="range"
										min={breakoutRange.min}
										max={breakoutRange.max}
										step={breakoutRange.step}
										value={getBreakoutWidth().value}
										oninput={(e) => setBreakoutValue(Number((e.currentTarget as HTMLInputElement).value))}
										class="min-w-0 flex-1 accent-neutral-900"
										aria-label="Breakout width"
									/>
									<output class="w-12 shrink-0 text-right font-mono text-xs">{getBreakoutWidth().value}</output>
									<select
										value={getBreakoutWidth().unit}
										onchange={(e) => setBreakoutUnit((e.currentTarget as HTMLSelectElement).value as SizeUnit)}
										class="shrink-0 rounded-md border border-neutral-300 bg-white px-1.5 py-1 text-xs"
										aria-label="Breakout width unit"
									>
										{#each SIZE_UNITS as u (u)}<option value={u}>{u}</option>{/each}
									</select>
								</div>
								<span class="mt-1 block text-xs text-neutral-500"
									>Extra width each side of content. % keeps breakouts distinct at any viewport.</span
								>
							</div>
						</div>

						<div class="rounded-lg border border-neutral-200 bg-white p-3">
							<h3 class="mb-1 text-xs font-semibold tracking-widest text-neutral-500 uppercase">Breakout elements</h3>
							<p class="mb-2 text-xs text-neutral-500">
								Route plain Markdown structures to a track — no wrapper divs needed.
							</p>
							<div class="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
								{#each BREAKOUT_ELEMENTS as el (el)}
									<div class="flex items-center justify-between gap-2 rounded-md border border-neutral-100 bg-neutral-50 px-2 py-1.5">
										<span class="text-sm font-medium text-neutral-800">{BREAKOUT_ELEMENT_LABEL[el]}</span>
										<div class="flex shrink-0 rounded-md border border-neutral-200 bg-white p-0.5" role="group" aria-label={`${BREAKOUT_ELEMENT_LABEL[el]} track`}>
											{#each BREAKOUT_LEVELS as level (level)}
												<button
													type="button"
													onclick={() => setBreakoutRoute(el, level)}
													aria-pressed={getBreakoutRoute(el) === level}
													class="rounded px-2 py-1 text-[11px] font-medium {getBreakoutRoute(el) === level
														? 'bg-neutral-900 text-white'
														: 'text-neutral-500 hover:bg-neutral-100'}"
												>
													{level === 'content' ? 'Content' : level === 'breakout' ? 'Breakout' : 'Full'}
												</button>
											{/each}
										</div>
									</div>
								{/each}
							</div>
						</div>
					</div>

			<div id="step-components" class={stepHeaderCls('step-components')} style="top:{stackTops[3]}">
				<a
					href="#step-components"
					class="flex w-full items-center justify-between py-2.5"
				>
					<h2 class="flex items-center gap-2 text-sm font-semibold whitespace-nowrap">
						<span class="inline-flex h-5 w-5 items-center justify-center rounded-full bg-neutral-900 text-[11px] text-white">4</span>
						Style your components
					</h2>
				</a>
			</div>
			<div id="step-components-body" data-step="step-components" class="grid gap-2 pt-4 sm:grid-cols-3">
					{#each BLOCKQUOTE_VARIANTS as v (v)}
						<button
							type="button"
							onclick={() => setBlockquote(v)}
							aria-pressed={getBlockquote() === v}
							class="rounded-lg border p-3 text-left {getBlockquote() === v
								? 'border-neutral-900 bg-neutral-900 text-white'
								: 'border-neutral-200 bg-white hover:border-neutral-400'}"
						>
							<span class="block text-sm font-semibold">Blockquote · {v}</span>
							<span class="block text-xs {getBlockquote() === v ? 'text-neutral-300' : 'text-neutral-500'}">{BLOCKQUOTE_BLURB[v]}</span>
						</button>
					{/each}
				</div>
			</div>
		</main>

		<section aria-label="Markdown preview" style={getVarStyle()} class="w-full">
			<div class="mx-auto mt-8 flex max-w-6xl items-center justify-between gap-2 bg-highlight px-4 py-3 sm:px-8">
				<h2 class="text-xs font-semibold tracking-widest uppercase" style="color:var(--prose-700)">
					Markdown preview
				</h2>
				<div
					class="flex items-center gap-1 rounded-md border border-neutral-200 bg-white p-0.5"
					role="group"
					aria-label="Preview viewport width"
				>
					{#each VIEWPORTS as v (v.id)}
						{@const Icon = v.id === 'full' ? Monitor : v.id === 'tablet' ? Tablet : Smartphone}
						<button
							type="button"
							onclick={() => {
								previewViewport = v.id;
								fitFrame();
							}}
							title={v.label}
							aria-pressed={previewViewport === v.id}
							class="rounded p-1.5 {previewViewport === v.id
								? 'bg-neutral-900 text-white'
								: 'text-neutral-500 hover:bg-neutral-100'}"
						>
							<Icon size={15} />
						</button>
					{/each}
				</div>
				<p class="hidden font-mono text-[11px] sm:block" style="color:var(--prose-500)">
					content-grid · {fmtSize(getWidth())} +{fmtSize(getBreakoutWidth())} · isolated document
				</p>
			</div>
			<div class="px-2 pb-12 sm:px-4">
				<div
					class="mx-auto w-full overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-xl transition-[max-width] duration-300"
					style="max-width:{previewMax}"
				>
					<div class="flex items-center gap-2 border-b border-neutral-200 bg-neutral-100 px-3 py-2">
						<span class="flex gap-1.5" aria-hidden="true">
							<span class="inline-block h-3 w-3 rounded-full bg-[#ff5f57]"></span>
							<span class="inline-block h-3 w-3 rounded-full bg-[#febc2e]"></span>
							<span class="inline-block h-3 w-3 rounded-full bg-[#28c840]"></span>
						</span>
						<span
							class="mx-auto hidden w-full max-w-md truncate rounded-md bg-white px-3 py-1 text-center font-mono text-[11px] text-neutral-500 sm:block"
						>
							tsup-system.preview/{fmtSize(getWidth())}
						</span>
						<span class="w-14 shrink-0" aria-hidden="true"></span>
					</div>
					<iframe
						bind:this={frame}
						title="Theme preview document"
						scrolling="no"
						onload={() => {
						applyToFrame();
						fitFrame();
					}}
						class="block w-full"
						style="border:0;background:var(--base-50);height:900px;overflow:hidden"
					></iframe>
				</div>
			</div>
		</section>

		<footer
			class="{footerVisible
				? 'relative'
				: 'sticky bottom-0'} z-10 border-t border-neutral-200 bg-white/95 px-4 py-3 shadow-[0_-4px_16px_rgba(0,0,0,0.08)] backdrop-blur"
		>
			<div class="mx-auto max-w-6xl sm:px-8">
				<div class="flex flex-col gap-2 sm:flex-row sm:items-center">
					<div class="flex flex-row items-center gap-1.5" aria-label="Chosen theme colours">
						{#each COLOR_FIELDS as field (field.key)}
							{@const chosen = theme.colors[field.key as ColorKey]}
							<span
								class="inline-block h-4 w-4 shrink-0 rounded-full border border-black/20"
								style:background={swatch(chosen)}
								title={`${field.label}: ${chosen} · ${swatch(chosen)}`}
								aria-hidden="true"
							></span>
						{/each}
					</div>
				<code
					class="min-w-0 flex-1 overflow-x-auto rounded-md bg-neutral-900 p-3 font-mono text-xs break-all text-neutral-100"
					>{getBunxCommand()}</code
				>
				<button
					type="button"
					onclick={copyCommand}
					class="flex min-w-28 shrink-0 items-center justify-center gap-1.5 rounded-md px-4 py-2 text-sm font-medium text-white {copied
						? 'bg-green-600'
						: 'bg-neutral-900 hover:bg-neutral-700'}"
				>
					{#if copied}
						<Check size={16} />
					{:else}
						<Copy size={16} />
					{/if}
					{copied ? 'Copied!' : 'Copy'}
				</button>
				</div>
			</div>
		</footer>
		<div id="site-footer">
			<Footer />
		</div>
	</div>

	<aside
		aria-label="CSS preview"
		aria-hidden={!cssPanelOpen}
		class="fixed right-0 bottom-0 z-20 w-[26rem] max-w-[92vw] border-l border-neutral-200 bg-white transition-transform duration-300 {cssPanelOpen
			? 'translate-x-0 shadow-2xl'
			: 'translate-x-full'}"
		style="top:{stackTops[0]}"
	>
		<div class="flex h-full flex-col">
			<div class="border-b border-neutral-200 px-4 py-3">
				<h2 class="text-sm font-semibold">CSS preview</h2>
				<p class="text-xs text-neutral-500">
					Live values from your theme — this is what the CLI ships.
				</p>
			</div>
			<div
				class="min-h-0 flex-1 overflow-y-auto bg-neutral-950 p-4 font-mono text-[11px] leading-relaxed text-neutral-200"
			>
				<pre class="text-neutral-400">{TREE}</pre>
				<p class="mt-4 text-emerald-400">/* root.css — live */</p>
				<p>{':root {'}</p>
				{#each SCALE_GROUPS as g (g.sem)}
					<p class="mt-2 text-emerald-400">/* {g.label} · anchor {theme.colors[g.anchor]} */</p>
					<p class="flex items-center gap-1.5 pl-2">
						<span
							class="inline-block h-3 w-3 shrink-0 rounded-sm border border-white/20"
							style:background={getGenerated().anchors[g.sem]}
						></span>
						<span class="text-sky-300">--{g.sem}</span><span>: {getGenerated().anchors[g.sem]};</span>
					</p>
					{#each SCALE_STEPS as step (step)}
						{@const v = getGenerated().scales[g.sem][step]}
						<p class="flex items-center gap-1.5 pl-2">
							<span
								class="inline-block h-3 w-3 shrink-0 rounded-sm border border-white/20"
								style:background={v}
							></span>
							<span class="text-sky-300">--{g.sem}-{step}</span><span>: {v};</span>
						</p>
					{/each}
				{/each}
				<p>&#125;</p>
				<p class="mt-4 text-emerald-400">/* typography.css — fluid, no breakpoints */</p>
				<pre>{`.markdown h1 {\n  font-family: var(--font-h1);\n  font-size: ${fluidClamp(FLUID_SIZES.h1[0], FLUID_SIZES.h1[1])};\n}`}</pre>
				<p class="mt-4 text-emerald-400">/* tailwind.css — utilities read your system */</p>
				<pre>{TAILWIND_EXCERPT}</pre>
				<p class="mt-4 text-emerald-400">&lt;!-- use it --&gt;</p>
				<pre>{USAGE_EXCERPT}</pre>
			</div>
		</div>
	</aside>
</div>
