<script lang="ts">
	import {
		CURATED_FONTS,
		FLUID_SIZES,
		LAYOUT_MODES,
		type FontRole,
		type LayoutMode
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
	import ColorField from '$lib/components/ColorField.svelte';
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
		getLayout,
		setLayout,
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

	type StepId = 'step-fonts' | 'step-colours' | 'step-layout';

	const STEPS: { id: StepId; n: number; short: string; title: string; blurb: string }[] = [
		{ id: 'step-fonts', n: 1, short: 'Font', title: 'Select your font', blurb: 'Pick Google Fonts, assign roles to elements' },
		{ id: 'step-colours', n: 2, short: 'Colours', title: 'Choose your theme colours', blurb: 'Nine semantic anchors, Tailwind palette' },
		{ id: 'step-layout', n: 3, short: 'Layout', title: 'Select your layout', blurb: 'Breakout columns, fluid type included' }
	];

	const STEP_ICON = [Type, Palette, LayoutGrid];

	let activeStep = $state<StepId>('step-fonts');
	let openSections = $state<Record<StepId, boolean>>({
		'step-fonts': true,
		'step-colours': true,
		'step-layout': true
	});
	let cssPanelOpen = $state(false);

	function jumpTo(id: StepId): void {
		openSections[id] = true;
		document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
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

	const EXAMPLE_CSS = `theme/
├── root.css          semantic colour scales
├── fonts.css         Google Fonts + stacks
├── base.css          html / body / links
├── typography.css    fluid Splendor type
├── markdown.css      quotes / tables / code
├── layout.css        breakout grid
├── tailwind.css      @theme bridge
└── index.css         imports all

/* root.css — your anchors, generated */
:root {
  --brand-primary-500: #3b82f6;
  --brand-primary-600: #2563eb;
  --traffic-ok-100: #dcfce7;
  --prose-800: #27272a;
}

/* typography.css — fluid, no breakpoints */
.markdown h1 {
  font-family: var(--font-h1);
  font-size: clamp(2.125rem, 1.431rem + 3.2609vi, 4rem);
}

/* tailwind.css — utilities read your system */
@import "tailwindcss";
@theme inline {
  --color-brand-primary: var(--brand-primary-600);
  --font-primary: var(--font-primary);
}

<!-- use it -->
<div class="bg-brand-primary font-primary">`;
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
			<div id="step-fonts" class="sticky top-14 z-10 -mx-1 scroll-mt-24 rounded-lg border border-neutral-200 bg-white/95 px-3 shadow-sm backdrop-blur">
					<button
						type="button"
						onclick={() => (openSections['step-fonts'] = !openSections['step-fonts'])}
						aria-expanded={openSections['step-fonts']}
						aria-controls="step-fonts-body"
						class="flex w-full items-center justify-between py-2.5"
					>
						<h2 class="flex items-center gap-2 text-sm font-semibold">
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

			<div id="step-colours" class="sticky top-[7.375rem] z-10 -mx-1 scroll-mt-32 rounded-lg border border-neutral-200 bg-white/95 px-3 shadow-sm backdrop-blur">
					<button
						type="button"
						onclick={() => (openSections['step-colours'] = !openSections['step-colours'])}
						aria-expanded={openSections['step-colours']}
						aria-controls="step-colours-body"
						class="flex w-full items-center justify-between py-2.5"
					>
						<h2 class="flex items-center gap-2 text-sm font-semibold">
							<span class="inline-flex h-5 w-5 items-center justify-center rounded-full bg-neutral-900 text-[11px] text-white">2</span>
							Choose your theme colours
						</h2>
						<ChevronDown size={16} class="text-neutral-400 transition-transform {openSections['step-colours'] ? '' : '-rotate-90'}" />
					</button>
				</div>
				{#if openSections['step-colours']}
					<div id="step-colours-body" data-step="step-colours" class="grid gap-3 pt-4 md:grid-cols-2 xl:grid-cols-3">
						{#each COLOR_FIELDS as field (field.key)}
							<div class="rounded-lg border border-neutral-200 bg-white p-3">
								<ColorField label={field.label} hint={field.hint} bind:value={theme.colors[field.key as ColorKey]} />
							</div>
						{/each}
					</div>
				{/if}

			<div id="step-layout" class="sticky top-[11.25rem] z-10 -mx-1 scroll-mt-44 rounded-lg border border-neutral-200 bg-white/95 px-3 shadow-sm backdrop-blur">
					<button
						type="button"
						onclick={() => (openSections['step-layout'] = !openSections['step-layout'])}
						aria-expanded={openSections['step-layout']}
						aria-controls="step-layout-body"
						class="flex w-full items-center justify-between py-2.5"
					>
						<h2 class="flex items-center gap-2 text-sm font-semibold">
							<span class="inline-flex h-5 w-5 items-center justify-center rounded-full bg-neutral-900 text-[11px] text-white">3</span>
							Select your layout
						</h2>
						<ChevronDown size={16} class="text-neutral-400 transition-transform {openSections['step-layout'] ? '' : '-rotate-90'}" />
					</button>
				</div>
				{#if openSections['step-layout']}
					<div id="step-layout-body" data-step="step-layout" class="pt-4">
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
					</div>
				{/if}
			</div>

			<section aria-label="Markdown preview" class="pt-6 pb-8">
				<div style={getVarStyle() + ';background:var(--base-50);color:var(--prose-800)'} class="rounded-xl px-4 py-6 sm:px-8">
					<div class={'markdown tsb-layout tsb-layout-' + getLayout()}>
						<SampleDoc />
					</div>
					<div class="mt-8 flex flex-wrap gap-2">
						<span class="rounded-full px-3 py-1 text-xs font-semibold" style="background:var(--brand-primary-600);color:white">brand-primary</span>
						<span class="rounded-full px-3 py-1 text-xs font-semibold" style="background:var(--brand-secondary-600);color:white">brand-secondary</span>
						<span class="rounded-full px-3 py-1 text-xs font-semibold" style="background:var(--traffic-stop-100);color:var(--traffic-stop-900)">stop</span>
						<span class="rounded-full px-3 py-1 text-xs font-semibold" style="background:var(--traffic-warning-100);color:var(--traffic-warning-900)">warning</span>
						<span class="rounded-full px-3 py-1 text-xs font-semibold" style="background:var(--traffic-ok-100);color:var(--traffic-ok-900)">ok</span>
					</div>
				</div>
			</section>
		</main>

		<footer class="sticky bottom-0 z-10 border-t border-neutral-200 bg-white/95 px-4 py-3 shadow-[0_-4px_16px_rgba(0,0,0,0.08)] backdrop-blur">
			<div class="mx-auto flex max-w-6xl flex-col gap-2 sm:flex-row sm:px-8">
				<code class="min-w-0 flex-1 overflow-x-auto rounded-md bg-neutral-900 p-3 font-mono text-xs break-all text-neutral-100">{getBunxCommand()}</code>
				<button
					type="button"
					onclick={copyCommand}
					class="flex shrink-0 items-center justify-center gap-1.5 rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-700"
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
	</div>

	<aside
		aria-label="CSS preview"
		aria-hidden={!cssPanelOpen}
		class="fixed top-14 right-0 bottom-0 z-20 w-[26rem] max-w-[92vw] border-l border-neutral-200 bg-white transition-transform duration-300 {cssPanelOpen ? 'translate-x-0 shadow-2xl' : 'translate-x-full'}"
	>
		<div class="flex h-full flex-col">
			<div class="border-b border-neutral-200 px-4 py-3">
				<h2 class="text-sm font-semibold">CSS preview</h2>
				<p class="text-xs text-neutral-500">Example scaffold output — your values ship via the bunx command.</p>
			</div>
			<pre class="min-h-0 flex-1 overflow-auto bg-neutral-950 p-4 font-mono text-xs leading-relaxed text-neutral-100"><code>{EXAMPLE_CSS}</code></pre>
		</div>
	</aside>
</div>
