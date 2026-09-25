<script lang="ts">
	import {
		CURATED_FONTS,
		FLUID_SIZES,
		LAYOUT_MODES,
		CONTENT_WIDTHS,
		SCALE_STEPS,
		fluidClamp,
		type ContentWidth,
		type FontRole,
		type LayoutMode,
		type SemanticName
	} from '@tsup-system/core';
	import {
		Check,
		ChevronDown,
		Copy,
		LayoutGrid,
		Palette,
		PanelRight,
		PanelRightClose,
		RotateCcw,
		Type
	} from 'lucide-svelte';
	import { mount, unmount } from 'svelte';
	import ColorField from '$lib/components/ColorField.svelte';
	import Footer from '$lib/components/Footer.svelte';
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
		getLayout,
		setLayout,
		getWidth,
		setWidth,
		getDocumentCss,
		getLayoutCss,
		setAssignment,
		assignmentFor,
		resetTheme,
		type ColorKey
	} from '$lib/theme.svelte.js';

	type RoleKey = 'primary' | 'secondary' | 'tertiary';

	const ROLE_LABEL: Record<RoleKey, string> = {
		primary: 'Primary',
		secondary: 'Secondary',
		tertiary: 'Tertiary (optional)'
	};

	let customOpen = $state<Record<RoleKey, boolean>>({ primary: false, secondary: false, tertiary: false });
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
	}

	function onCustomInput(role: RoleKey, v: string): void {
		customName[role] = v;
		theme.fonts[role] = v.trim() ? v.trim() : undefined;
	}

	const ROLES: RoleKey[] = ['primary', 'secondary', 'tertiary'];

	const LAYOUT_HINT: Record<LayoutMode, string> = {
		compact: 'Single column',
		minimal: 'Text | quotes & images',
		wide: 'Text | quotes & tables | images'
	};

	const WIDTH_HINT: Record<ContentWidth, string> = {
		article: 'Article · 60ch measure',
		comfortable: 'Comfortable · 48rem',
		wide: 'Wide · 72rem',
		full: 'Full width'
	};

	type StepId = 'step-fonts' | 'step-colours' | 'step-layout';

	const STEPS: { id: StepId; n: number; short: string; title: string; blurb: string; activeCls: string }[] = [
		{ id: 'step-fonts', n: 1, short: 'Font', title: 'Select your font', blurb: 'Pick Google Fonts, assign roles to elements', activeCls: 'border-sky-200 bg-sky-100' },
		{ id: 'step-colours', n: 2, short: 'Colours', title: 'Choose your theme colours', blurb: 'Nine semantic anchors, Tailwind palette', activeCls: 'border-violet-200 bg-violet-100' },
		{ id: 'step-layout', n: 3, short: 'Layout', title: 'Select your layout', blurb: 'Breakout columns, fluid type included', activeCls: 'border-emerald-200 bg-emerald-100' }
	];

	const STEP_ICON = [Type, Palette, LayoutGrid];

	let activeStep = $state<StepId>('step-fonts');
	let openSections = $state<Record<StepId, boolean>>({
		'step-fonts': true,
		'step-colours': true,
		'step-layout': true
	});
	let cssPanelOpen = $state(false);
	let footerVisible = $state(false);
	let frame: HTMLIFrameElement | undefined = $state(undefined);

	const CHIPS = [
		['brand-primary · 600', 'var(--brand-primary-600)', 'white'],
		['brand-secondary · 600', 'var(--brand-secondary-600)', 'white'],
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

	// Isolated document preview: render the same .svx offscreen, then embed
	// its HTML with the generated CSS as an iframe srcdoc — its own <html>,
	// unaffected by builder chrome (and vice versa).
	$effect(() => {
		const el = frame;
		if (!el) return;
		const css = getDocumentCss();
		const font = getFontHref();
		const layout = getLayout();
		const width = getWidth();
		const host = document.createElement('div');
		const comp = mount(SampleDoc, { target: host });
		const html = host.innerHTML;
		unmount(comp);
		el.srcdoc =
			`<!DOCTYPE html><html><head><meta charset="utf-8">` +
			`<meta name="viewport" content="width=device-width,initial-scale=1">` +
			(font ? `<link rel="stylesheet" href="${font}">` : '') +
			`<style>${css}</style></head>` +
			`<body class="markdown tsb-layout tsb-layout-${layout}">` +
			`<div class="tsb-doc tsb-width-${width}">${html}${CHIPS_HTML}</div></body></html>`;
	});

	function fitFrame(): void {
		const el = frame;
		const doc = el?.contentDocument;
		if (!el || !doc) return;
		const fit = () => {
			if (el.contentDocument === doc) {
				el.style.height = Math.max(doc.documentElement.scrollHeight, 200) + 'px';
			}
		};
		fit();
		try {
			doc.fonts.ready.then(fit);
		} catch {
			/* fonts API unavailable — initial fit stands */
		}
	}

	function jumpTo(id: StepId): void {
		openSections[id] = true;
		document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
	}

	function stepHeaderCls(id: StepId, top: string): string {
		const s = STEPS.find((x) => x.id === id);
		const tint = s && activeStep === id ? s.activeCls : 'border-neutral-200 bg-white/95';
		return `sticky ${top} z-10 -mx-1 scroll-mt-44 rounded-lg border px-3 shadow-sm backdrop-blur ${tint}`;
	}

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

<div class="flex min-h-screen flex-col bg-neutral-100 text-neutral-900">
	<header class="sticky top-0 z-30 border-b border-neutral-200 bg-white">
		<div class="mx-auto flex max-w-6xl items-center gap-2 px-4 py-2.5 sm:px-8">
			<p class="text-sm font-semibold whitespace-nowrap">Design System Builder</p>
			<nav aria-label="Builder steps" class="mx-auto hidden items-center gap-1 md:flex">
				{#each STEPS as s, i (s.id)}
					{@const Icon = STEP_ICON[i]}
					<button
						type="button"
						onclick={() => jumpTo(s.id)}
						aria-current={activeStep === s.id ? 'step' : undefined}
						class="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium {activeStep === s.id
							? 'bg-neutral-900 text-white'
							: 'text-neutral-600 hover:bg-neutral-100'}"
					>
						<Icon size={14} />
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
					class="flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs font-medium {cssPanelOpen
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

	<div class="min-w-0 flex-1 transition-[margin] duration-300 {cssPanelOpen ? 'lg:mr-[26rem]' : ''}">
		<section class="mx-auto max-w-6xl px-4 pt-8 pb-2 sm:px-8">
			<p class="w-fit rounded-full bg-neutral-900 px-3 py-1 text-xs font-medium text-white">
				Tailwind-compatible · scaffold CSS generator
			</p>
			<h1 class="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">Ship your design system</h1>
			<p class="mt-2 max-w-2xl text-sm text-neutral-600 sm:text-base">
				This generator produces your design-system scaffold CSS — semantic colour scales, fluid
				type, Markdown styles, breakout layout and a Tailwind bridge — from three steps, exported
				as a single bunx command.
			</p>
			<ol class="mt-4 grid gap-2 sm:grid-cols-3">
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
			<div id="step-fonts" class={stepHeaderCls('step-fonts', 'top-14')}>
					<button
						type="button"
						onclick={() => (openSections['step-fonts'] = !openSections['step-fonts'])}
						aria-expanded={openSections['step-fonts']}
						aria-controls="step-fonts-body"
						class="flex w-full items-center justify-between py-2.5"
					>
						<h2 class="flex items-center gap-2 text-sm font-semibold whitespace-nowrap">
							<span class="inline-flex h-5 w-5 items-center justify-center rounded-full bg-neutral-900 text-[11px] text-white">1</span>
							Select your font
						</h2>
						<ChevronDown size={16} class="text-neutral-400 transition-transform {openSections['step-fonts'] ? '' : '-rotate-90'}" />
					</button>
				</div>
				{#if openSections['step-fonts']}
					<div id="step-fonts-body" data-step="step-fonts" class="space-y-4 pt-4">
						<div class="grid gap-3 md:grid-cols-3">
							{#each ROLES as role (role)}
								<label class="block rounded-lg border border-neutral-200 bg-white p-3">
									<span class="mb-1 block text-sm font-medium text-neutral-800">{ROLE_LABEL[role]}</span>
									<select
										value={fontSelectValue(role)}
										onchange={(e) => onFontSelect(role, (e.currentTarget as HTMLSelectElement).value)}
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
											oninput={(e) => onCustomInput(role, (e.currentTarget as HTMLInputElement).value)}
											class="mt-1 w-full rounded-md border border-neutral-300 px-2 py-1.5 text-sm"
										/>
									{/if}
								</label>
							{/each}
						</div>
						<div class="rounded-lg border border-neutral-200 bg-white p-3">
							<h3 class="mb-2 text-xs font-semibold tracking-widest text-neutral-500 uppercase">Font assignments</h3>
							<div class="grid grid-cols-2 gap-2 sm:grid-cols-5">
								{#each ASSIGNMENT_ELEMENTS as el (el.key)}
									<label class="block">
										<span class="mb-1 block text-xs font-medium text-neutral-700">{el.label}</span>
										<select
											value={assignmentFor(el.key)}
											onchange={(e) =>
												setAssignment(el.key, (e.currentTarget as HTMLSelectElement).value as FontRole)}
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
							<h3 class="mb-1 text-xs font-semibold tracking-widest text-neutral-500 uppercase">Fluid type scale</h3>
							<p class="mb-3 text-xs text-neutral-500">Live sizes from your theme — fluid between 360–1280px viewports, no breakpoints.</p>
							<div class="markdown" style={getVarStyle()}>
								{#each SPECIMEN as row (row.el)}
									{@const [minPx, maxPx] = FLUID_SIZES[row.el]}
									<div class="flex flex-col gap-1 border-b border-neutral-100 py-2 last:border-0 sm:flex-row sm:items-baseline sm:gap-4">
										<span class="w-32 shrink-0 font-mono text-[11px] text-neutral-500">{row.el} · {minPx}→{maxPx}px</span>
										{#if row.el === 'blockquote'}
											<blockquote><p>{row.sample}</p></blockquote>
										{:else}
											<svelte:element this={row.tag} style="margin: 0;">{row.sample}</svelte:element>
										{/if}
									</div>
								{/each}
							</div>
						</div>
					</div>
				{/if}

			<div id="step-colours" class={stepHeaderCls('step-colours', 'top-[6.125rem]')}>
					<button
						type="button"
						onclick={() => (openSections['step-colours'] = !openSections['step-colours'])}
						aria-expanded={openSections['step-colours']}
						aria-controls="step-colours-body"
						class="flex w-full items-center justify-between py-2.5"
					>
						<h2 class="flex items-center gap-2 text-sm font-semibold whitespace-nowrap">
							<span class="inline-flex h-5 w-5 items-center justify-center rounded-full bg-neutral-900 text-[11px] text-white">2</span>
							Choose your theme colours
						</h2>
						<ChevronDown size={16} class="text-neutral-400 transition-transform {openSections['step-colours'] ? '' : '-rotate-90'}" />
					</button>
				</div>
				{#if openSections['step-colours']}
					<div id="step-colours-body" data-step="step-colours" class="grid gap-3 pt-4 md:grid-cols-2 xl:grid-cols-3">
						{#each COLOR_FIELDS as field (field.key)}
							<div class="rounded-lg border border-neutral-200 bg-zinc-200 p-3">
								<ColorField label={field.label} hint={field.hint} bind:value={theme.colors[field.key as ColorKey]} />
							</div>
						{/each}
					</div>
				{/if}

			<div id="step-layout" class={stepHeaderCls('step-layout', 'top-[8.75rem]')}>
					<button
						type="button"
						onclick={() => (openSections['step-layout'] = !openSections['step-layout'])}
						aria-expanded={openSections['step-layout']}
						aria-controls="step-layout-body"
						class="flex w-full items-center justify-between py-2.5"
					>
						<h2 class="flex items-center gap-2 text-sm font-semibold whitespace-nowrap">
							<span class="inline-flex h-5 w-5 items-center justify-center rounded-full bg-neutral-900 text-[11px] text-white">3</span>
							Select your layout
						</h2>
						<ChevronDown size={16} class="text-neutral-400 transition-transform {openSections['step-layout'] ? '' : '-rotate-90'}" />
					</button>
				</div>
				{#if openSections['step-layout']}
					<div id="step-layout-body" data-step="step-layout" class="grid gap-3 pt-4 md:grid-cols-2">
						<label class="block rounded-lg border border-neutral-200 bg-white p-3">
							<span class="mb-1 block text-sm font-medium text-neutral-800">Breakout columns</span>
							<select
								value={getLayout()}
								onchange={(e) => setLayout((e.currentTarget as HTMLSelectElement).value as LayoutMode)}
								class="w-full rounded-md border border-neutral-300 bg-white px-2 py-1.5 text-sm"
							>
								{#each LAYOUT_MODES as mode (mode)}
									<option value={mode}>{mode} — {LAYOUT_HINT[mode]}</option>
								{/each}
							</select>
							<span class="mt-1 block text-xs text-neutral-500">Collapses to a single column on mobile.</span>
						</label>
						<label class="block rounded-lg border border-neutral-200 bg-white p-3">
							<span class="mb-1 block text-sm font-medium text-neutral-800">Page width</span>
							<select
								value={getWidth()}
								onchange={(e) => setWidth((e.currentTarget as HTMLSelectElement).value as ContentWidth)}
								class="w-full rounded-md border border-neutral-300 bg-white px-2 py-1.5 text-sm"
							>
								{#each CONTENT_WIDTHS as w (w)}
									<option value={w}>{WIDTH_HINT[w]}</option>
								{/each}
							</select>
							<span class="mt-1 block text-xs text-neutral-500">Article ≈ 60ch best practice; narrow measures collapse breakouts.</span>
						</label>
					</div>
				{/if}
			</div>

		</main>

		<section aria-label="Markdown preview" style={getVarStyle()} class="w-full">
			<div class="mx-auto flex max-w-6xl items-center justify-between gap-2 px-4 py-3 sm:px-8">
				<h2 class="text-xs font-semibold tracking-widest uppercase" style="color:var(--prose-700)">Markdown preview</h2>
				<p class="font-mono text-[11px]" style="color:var(--prose-500)">
					{getLayout()} · {getWidth()} · isolated document
				</p>
			</div>
			<div class="px-2 pb-12 sm:px-4">
				<div class="overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-xl">
					<div class="flex items-center gap-2 border-b border-neutral-200 bg-neutral-100 px-3 py-2">
						<span class="flex gap-1.5" aria-hidden="true">
							<span class="inline-block h-3 w-3 rounded-full bg-[#ff5f57]"></span>
							<span class="inline-block h-3 w-3 rounded-full bg-[#febc2e]"></span>
							<span class="inline-block h-3 w-3 rounded-full bg-[#28c840]"></span>
						</span>
						<span class="mx-auto hidden w-full max-w-md truncate rounded-md bg-white px-3 py-1 text-center font-mono text-[11px] text-neutral-500 sm:block">
							tsup-system.preview/{getLayout()}/{getWidth()}
						</span>
						<span class="w-14 shrink-0" aria-hidden="true"></span>
					</div>
					<iframe
						bind:this={frame}
						title="Theme preview document"
						onload={fitFrame}
						class="block w-full"
						style="border:0;background:var(--base-50);height:900px"
					></iframe>
				</div>
			</div>
		</section>

		<footer class="{footerVisible ? 'relative' : 'sticky bottom-0'} z-10 border-t border-neutral-200 bg-white/95 px-4 py-3 shadow-[0_-4px_16px_rgba(0,0,0,0.08)] backdrop-blur">
			<div class="mx-auto flex max-w-6xl flex-col gap-2 sm:flex-row sm:px-8">
				<code class="min-w-0 flex-1 overflow-x-auto rounded-md bg-neutral-900 p-3 font-mono text-xs break-all text-neutral-100">{getBunxCommand()}</code>
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
		</footer>
		<div id="site-footer">
			<Footer />
		</div>
	</div>

	<aside
		aria-label="CSS preview"
		aria-hidden={!cssPanelOpen}
		class="fixed top-14 right-0 bottom-0 z-20 w-[26rem] max-w-[92vw] border-l border-neutral-200 bg-white transition-transform duration-300 {cssPanelOpen ? 'translate-x-0 shadow-2xl' : 'translate-x-full'}"
	>
		<div class="flex h-full flex-col">
			<div class="border-b border-neutral-200 px-4 py-3">
				<h2 class="text-sm font-semibold">CSS preview</h2>
				<p class="text-xs text-neutral-500">Live values from your theme — this is what the CLI ships.</p>
			</div>
			<div class="min-h-0 flex-1 overflow-y-auto bg-neutral-950 p-4 font-mono text-[11px] leading-relaxed text-neutral-200">
				<pre class="text-neutral-400">{TREE}</pre>
				<p class="mt-4 text-emerald-400">/* root.css — live */</p>
				<p>{':root {'}</p>
				{#each SCALE_GROUPS as g (g.sem)}
					<p class="mt-2 text-emerald-400">/* {g.label} · anchor {theme.colors[g.anchor]} */</p>
					{#each SCALE_STEPS as step (step)}
						{@const v = getGenerated().scales[g.sem][step]}
						<p class="flex items-center gap-1.5 pl-2">
							<span class="inline-block h-3 w-3 shrink-0 rounded-sm border border-white/20" style:background={v}></span>
							<span class="text-sky-300">--{g.sem}-{step}</span><span>: {v};</span>
						</p>
					{/each}
				{/each}
				<p>{'}'}</p>
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
