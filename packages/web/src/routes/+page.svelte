<script lang="ts">
	import { CURATED_FONTS, LAYOUT_MODES, type FontRole, type LayoutMode } from '@tsup-system/core';
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

	const STEPS: { id: StepId; n: number; short: string; title: string }[] = [
		{ id: 'step-fonts', n: 1, short: 'Font', title: 'Select your font' },
		{ id: 'step-colours', n: 2, short: 'Colours', title: 'Choose your theme colours' },
		{ id: 'step-layout', n: 3, short: 'Layout', title: 'Select your layout' }
	];

	let activeStep = $state<StepId>('step-fonts');
	let openSections = $state<Record<StepId, boolean>>({
		'step-fonts': true,
		'step-colours': true,
		'step-layout': true
	});

	function jumpTo(id: StepId): void {
		openSections[id] = true;
		document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
	}

	$effect(() => {
		const sections = STEPS.map((s) => document.getElementById(s.id)).filter(
			(el): el is HTMLElement => el !== null
		);
		const observer = new IntersectionObserver(
			(entries) => {
				for (const e of entries) {
					if (e.isIntersecting) activeStep = e.target.id as StepId;
				}
			},
			{ rootMargin: '-30% 0px -60% 0px' }
		);
		for (const s of sections) observer.observe(s);
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
</script>

<svelte:head>
	<title>Design System Builder</title>
	{#if getFontHref()}
		<link rel="stylesheet" href={getFontHref()} />
	{/if}
</svelte:head>

{@html '<style>' + STRUCTURAL_CSS + getLayoutCss() + '</style>'}

<div class="flex min-h-screen flex-col bg-neutral-100 text-neutral-900">
	<header class="flex items-center justify-between border-b border-neutral-200 bg-white px-4 py-3">
		<h1 class="text-lg font-semibold">Design System Builder</h1>
		<button
			onclick={resetTheme}
			class="rounded-md border border-neutral-300 px-3 py-1.5 text-sm hover:bg-neutral-50"
		>
			Reset to defaults
		</button>
	</header>

	{#if getWarnings().length > 0}
		<div class="border-b border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-900">
			{#each getWarnings() as w (w.pair)}
				<p>{w.message}</p>
			{/each}
		</div>
	{/if}

	<div class="flex flex-1 flex-col lg:flex-row">
		<aside class="w-full shrink-0 border-b border-neutral-200 bg-white px-4 pb-4 lg:w-80 lg:border-r lg:border-b-0">
			<nav
				aria-label="Builder steps"
				class="sticky top-0 z-10 -mx-4 border-b border-neutral-200 bg-white/95 px-4 py-2 backdrop-blur"
			>
				<ol class="flex gap-1">
					{#each STEPS as s (s.id)}
						<li class="flex-1">
							<button
								type="button"
								onclick={() => jumpTo(s.id)}
								aria-current={activeStep === s.id ? 'step' : undefined}
								class="w-full rounded-md px-2 py-1.5 text-xs font-medium {activeStep === s.id
									? 'bg-neutral-900 text-white'
									: 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'}"
							>
								{s.n} · {s.short}
							</button>
						</li>
					{/each}
				</ol>
			</nav>

			<section id="step-fonts" class="scroll-mt-24 pt-4">
				<button
					type="button"
					onclick={() => (openSections['step-fonts'] = !openSections['step-fonts'])}
					aria-expanded={openSections['step-fonts']}
					aria-controls="step-fonts-body"
					class="mb-3 flex w-full items-center justify-between"
				>
					<h2 class="flex items-center gap-2 text-xs font-semibold tracking-widest text-neutral-500 uppercase">
						<span class="inline-flex h-5 w-5 items-center justify-center rounded-full bg-neutral-900 text-[11px] text-white">1</span>
						Select your font
					</h2>
					<span aria-hidden="true" class="text-neutral-400">{openSections['step-fonts'] ? '−' : '+'}</span>
				</button>
				{#if openSections['step-fonts']}
					<div id="step-fonts-body" class="space-y-3">
						{#each ROLES as role (role)}
							<label class="block">
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
						<div>
							<h3 class="mb-2 text-xs font-semibold tracking-widest text-neutral-500 uppercase">Font assignments</h3>
							<div class="grid grid-cols-2 gap-2">
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
					</div>
				{/if}
			</section>

			<section id="step-colours" class="scroll-mt-24 pt-6">
				<button
					type="button"
					onclick={() => (openSections['step-colours'] = !openSections['step-colours'])}
					aria-expanded={openSections['step-colours']}
					aria-controls="step-colours-body"
					class="mb-3 flex w-full items-center justify-between"
				>
					<h2 class="flex items-center gap-2 text-xs font-semibold tracking-widest text-neutral-500 uppercase">
						<span class="inline-flex h-5 w-5 items-center justify-center rounded-full bg-neutral-900 text-[11px] text-white">2</span>
						Choose your theme colours
					</h2>
					<span aria-hidden="true" class="text-neutral-400">{openSections['step-colours'] ? '−' : '+'}</span>
				</button>
				{#if openSections['step-colours']}
					<div id="step-colours-body" class="space-y-3">
						{#each COLOR_FIELDS as field (field.key)}
							<ColorField label={field.label} hint={field.hint} bind:value={theme.colors[field.key as ColorKey]} />
						{/each}
					</div>
				{/if}
			</section>

			<section id="step-layout" class="scroll-mt-24 pt-6">
				<button
					type="button"
					onclick={() => (openSections['step-layout'] = !openSections['step-layout'])}
					aria-expanded={openSections['step-layout']}
					aria-controls="step-layout-body"
					class="mb-3 flex w-full items-center justify-between"
				>
					<h2 class="flex items-center gap-2 text-xs font-semibold tracking-widest text-neutral-500 uppercase">
						<span class="inline-flex h-5 w-5 items-center justify-center rounded-full bg-neutral-900 text-[11px] text-white">3</span>
						Select your layout
					</h2>
					<span aria-hidden="true" class="text-neutral-400">{openSections['step-layout'] ? '−' : '+'}</span>
				</button>
				{#if openSections['step-layout']}
					<div id="step-layout-body" class="space-y-3">
						<label class="block">
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
							<span class="mt-1 block text-xs text-neutral-500"
								>Type is fluid between 360–1280px viewports. Layout collapses to a single column on mobile.</span
							>
						</label>
					</div>
				{/if}
			</section>
		</aside>

		<main class="min-w-0 flex-1">
			<section style={getVarStyle() + ';background:var(--base-50);color:var(--prose-800)'} class="px-4 py-8 sm:px-8">
				<div class="mx-auto max-w-6xl rounded-xl px-4 py-6 sm:px-8" style="background:var(--base-50)">
					<div class={'markdown tsb-layout tsb-layout-' + getLayout()}>
						<SampleDoc />
					</div>
					<div class="mt-8 flex flex-wrap gap-2">
						<span
							class="rounded-full px-3 py-1 text-xs font-semibold"
							style="background:var(--brand-primary-600);color:white">brand-primary</span
						>
						<span
							class="rounded-full px-3 py-1 text-xs font-semibold"
							style="background:var(--brand-secondary-600);color:white">brand-secondary</span
						>
						<span
							class="rounded-full px-3 py-1 text-xs font-semibold"
							style="background:var(--traffic-stop-100);color:var(--traffic-stop-900)">stop</span
						>
						<span
							class="rounded-full px-3 py-1 text-xs font-semibold"
							style="background:var(--traffic-warning-100);color:var(--traffic-warning-900)">warning</span
						>
						<span
							class="rounded-full px-3 py-1 text-xs font-semibold"
							style="background:var(--traffic-ok-100);color:var(--traffic-ok-900)">ok</span
						>
					</div>
				</div>
			</section>

			<footer class="sticky bottom-0 z-10 border-t border-neutral-200 bg-white/95 px-4 py-4 shadow-[0_-4px_16px_rgba(0,0,0,0.08)] backdrop-blur">
				<h2 class="mb-2 text-xs font-semibold tracking-widest text-neutral-500 uppercase">Generate bunx command</h2>
				<div class="flex flex-col gap-2 sm:flex-row">
					<code class="min-w-0 flex-1 overflow-x-auto rounded-md bg-neutral-900 p-3 font-mono text-xs break-all text-neutral-100"
						>{getBunxCommand()}</code
					>
					<button
						onclick={copyCommand}
						class="shrink-0 rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-700"
					>
						{copied ? 'Copied!' : 'Copy'}
					</button>
				</div>
				<p class="mt-2 text-xs text-neutral-500">
					Run it in any directory to generate <span class="font-mono">theme/</span> with the exact system previewed above.
				</p>
			</footer>
		</main>
	</div>
</div>
