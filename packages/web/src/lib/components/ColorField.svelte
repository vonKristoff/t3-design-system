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
	<span class="mb-1.5 block">
		<span class="block text-sm font-medium text-neutral-800">{label}</span>
		{#if hint}
			<span class="block text-xs text-neutral-500">{hint}</span>
		{/if}
	</span>

	<div class="grid grid-cols-2 items-stretch gap-2">
		<div class="min-w-0 space-y-1.5">
			<label class="block">
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
		</div>
		<span
			class="inline-block min-h-28 rounded-md border border-black/20"
			style:background={selectedHex}
			title={`${value} · ${selectedHex}`}
			aria-hidden="true"
		></span>
	</div>
</fieldset>
