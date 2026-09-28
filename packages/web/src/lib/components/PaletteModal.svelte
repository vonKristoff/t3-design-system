<script lang="ts">
	import {
		READABLE_PAIRS,
		SCALE_STEPS,
		SEMANTIC_NAMES,
		type GeneratedTheme,
		type SemanticName
	} from '@tsup-system/core';

	interface Props {
		open: boolean;
		gen: GeneratedTheme;
		onclose: () => void;
	}

	let { open, gen, onclose }: Props = $props();

	const hoverBg = $derived(gen.scales['base']['50']);

	const LABELS: Record<SemanticName, string> = {
		base: 'Base',
		alt: 'Alt',
		glass: 'Glass',
		prose: 'Prose',
		muted: 'Muted',
		accent: 'Accent',
		pop: 'Pop',
		inverse: 'Inverse',
		'traffic-stop': 'Stop',
		'traffic-warning': 'Warning',
		'traffic-ok': 'OK'
	};

	const RELATIVE_ORDER = ['light', 'base', 'dark'] as const;
</script>

<svelte:window
	onkeydown={(e) => {
		if (open && e.key === 'Escape') onclose();
	}}
/>

{#if open}
	<div
		class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
		role="presentation"
		onclick={(e) => {
			if (e.target === e.currentTarget) onclose();
		}}
	>
		<div
			role="dialog"
			aria-modal="true"
			aria-label="Generated colour palette"
			class="max-h-[85vh] w-full max-w-3xl overflow-auto rounded-xl bg-white p-5 shadow-2xl"
		>
			<div class="mb-4 flex items-center justify-between">
				<div>
					<h2 class="text-lg font-semibold">Generated palette</h2>
					<p class="text-xs text-neutral-500">
						Live engine output — anchors, relative states, full rungs and readable pairs.
					</p>
				</div>
				<button
					type="button"
					onclick={onclose}
					class="rounded-md border border-neutral-300 px-3 py-1.5 text-sm hover:bg-neutral-50"
				>
					Close
				</button>
			</div>

			<div class="space-y-5">
				{#each SEMANTIC_NAMES as sem (sem)}
					<section aria-label={LABELS[sem]}>
						<div class="mb-1.5 flex items-center gap-2">
							<span
								class="inline-block h-5 w-5 rounded border border-black/20"
								style:background={gen.anchors[sem]}
								title={`--${sem}: ${gen.anchors[sem]}`}
							></span>
							<h3 class="text-sm font-semibold">{LABELS[sem]}</h3>
							<span class="font-mono text-[11px] text-neutral-500">{gen.anchors[sem]}</span>
						</div>
						<div class="mb-1 flex gap-0.5" aria-label={`${LABELS[sem]} relative scale`}>
							{#each RELATIVE_ORDER as key (key)}
								{@const hex = key === 'base' ? gen.anchors[sem] : gen.relative[sem][key]}
								<span
									title={`--${sem}${key === 'base' ? '' : '-' + key}: ${hex}`}
									style:background={hex}
									class="h-7 flex-1 border border-black/10 first:rounded-l-md last:rounded-r-md"
								></span>
							{/each}
						</div>
						<div class="flex gap-0.5" aria-label={`${LABELS[sem]} rungs`}>
							{#each SCALE_STEPS as step (step)}
								<span class="flex-1">
									<span
										title={`--${sem}-${step}: ${gen.scales[sem][step]}`}
										style:background={gen.scales[sem][step]}
										class="block h-7 rounded-[3px] border border-black/10"
									></span>
									<span class="mt-0.5 block text-center font-mono text-[9px] text-neutral-400">{step}</span>
								</span>
							{/each}
						</div>
					</section>
				{/each}

				<section aria-label="Twist">
					<div class="mb-1.5 flex items-center gap-2">
						<span
							class="inline-block h-5 w-5 rounded border border-black/20"
							style:background={gen.variables["--pop-twist"]}
							title={`--pop-twist: ${gen.variables["--pop-twist"]}`}
						></span>
						<h3 class="text-sm font-semibold">Twist</h3>
						<span class="font-mono text-[11px] text-neutral-500">{gen.variables["--pop-twist"]}</span>
					</div>
					<div class="flex gap-0.5" aria-label="Twist light and dark">
						{#each [{ k: 'light', v: gen.variables["--pop-twist-light"] }, { k: 'base', v: gen.variables["--pop-twist"] }, { k: 'dark', v: gen.variables["--pop-twist-dark"] }] as s (s.k)}
							<span
								title={`--pop-twist${s.k === 'base' ? '' : '-' + s.k}: ${s.v}`}
								style:background={s.v}
								class="h-7 flex-1 border border-black/10 first:rounded-l-md last:rounded-r-md"
							></span>
						{/each}
					</div>
				</section>

				<section aria-label="Readable pairs">
					<h3 class="mb-1.5 text-sm font-semibold">Readable pairs <span class="font-normal text-neutral-500">(≥ 4.5:1, auto-derived)</span></h3>
					<div class="flex flex-wrap gap-1.5">
						{#each READABLE_PAIRS as spec (spec.varName)}
							{@const bg = gen.scales[spec.bgSem][spec.bgStep]}
							<span
								title={`${spec.varName}: ${gen.pairs[spec.varName]} on ${bg}`}
								style:background={bg}
								style:color={gen.pairs[spec.varName]}
								class="rounded-md border border-black/15 px-2.5 py-1 font-mono text-[11px]"
							>
								{spec.varName}
							</span>
						{/each}
						<span
							title={`--accent-hover-on-base: ${gen.pairs['--accent-hover-on-base']} on ${hoverBg}`}
							style:background={hoverBg}
							style:color={gen.pairs['--accent-hover-on-base']}
							class="rounded-md border border-black/15 px-2.5 py-1 font-mono text-[11px] underline"
						>
							--accent-hover-on-base
						</span>
					</div>
				</section>
			</div>
		</div>
	</div>
{/if}
