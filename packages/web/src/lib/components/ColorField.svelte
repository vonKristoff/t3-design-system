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
	<div class="mb-1.5 grid grid-cols-2 items-center gap-2">
		<span>
			<span class="block text-sm font-medium text-neutral-800">{label}</span>
			{#if hint}
				<span class="block text-xs text-neutral-500">{hint}</span>
			{/if}
		</span>
		<span
			class="inline-block h-9 w-full rounded-md border border-black/20"
			style:background={selectedHex}
			title={`${value} · ${selectedHex}`}
			aria-hidden="true"
		></span>
	</div>

	<label class="mb-1.5 block">
		<span class="mb-1 block text-xs font-medium text-neutral-600">Family</span>
		<select
			value={family}
			onchange={(e) => pickFamily((e.currentTarget as HTMLSelectElement).value)}
			class="w-full rounded-md border border-neutral-300 bg-white px-2 py-1.5 text-sm"
		>
			{#each PALETTE_FAMILIES as fam (fam)}
				<option value={fam} selected={fam === family}>
					{fam} · {TAILWIND_PALETTE[fam]['500']}
				</option>
			{/each}
		</select>
	</label>

	<StrengthSelect {family} {step} onpick={pickStep} />
</fieldset>
