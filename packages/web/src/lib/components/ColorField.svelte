<script lang="ts">
	import { PALETTE_FAMILIES, TAILWIND_PALETTE, resolveTailwindHex } from '@tsup-system/core';
	import StrengthSelect from './StrengthSelect.svelte';

	interface Props {
		label: string;
		hint?: string;
		value: string;
	}

	let { label, hint, value = $bindable() }: Props = $props();

	const family = $derived(value.split('-')[0] ?? '');
	const step = $derived(value.split('-').at(-1) ?? '600');

	const selectedHex = $derived.by(() => {
		try {
			return resolveTailwindHex(value);
		} catch {
			return '#888888';
		}
	});

	function pickFamily(f: string): void {
		value = `${f}-${step}`;
	}

	function pickStep(s: string): void {
		value = `${family}-${s}`;
	}
</script>

<fieldset class="block">
	<span class="mb-1 flex items-center gap-2 text-sm font-medium text-neutral-800">
		<span
			class="inline-block h-4 w-4 shrink-0 rounded-full border border-black/20"
			style:background={selectedHex}
			aria-hidden="true"
		></span>
		{label}
	</span>
	{#if hint}
		<span class="mb-1 block text-xs text-neutral-500">{hint}</span>
	{/if}

	<div role="radiogroup" aria-label={label + ' family'} class="mb-1.5 grid grid-cols-11 gap-1">
		{#each PALETTE_FAMILIES as fam (fam)}
			{@const hex = TAILWIND_PALETTE[fam]['500']}
			<button
				type="button"
				role="radio"
				aria-checked={fam === family}
				title={fam}
				onclick={() => pickFamily(fam)}
				class="flex items-center justify-center rounded-md p-1 {fam === family
					? 'ring-2 ring-neutral-900 ring-offset-1'
					: 'hover:bg-neutral-100'}"
			>
				<span
					class="inline-block h-4 w-4 rounded-full border border-black/20"
					style:background={hex}
					aria-hidden="true"
				></span>
			</button>
		{/each}
	</div>

	<StrengthSelect {family} {step} onpick={pickStep} />
</fieldset>
