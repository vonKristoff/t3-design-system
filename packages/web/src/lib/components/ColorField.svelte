<script lang="ts">
	import { resolveTailwindHex } from '@tsup-system/core';
	import FamilySelect from './FamilySelect.svelte';
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
	<div class="grid grid-cols-2 items-stretch gap-2">
		<span class="min-w-0 space-y-1.5">
			<span class="block">
				<span class="block text-sm font-medium text-neutral-800">{label}</span>
				{#if hint}
					<span class="block text-xs text-neutral-500">{hint}</span>
				{/if}
			</span>
			<span class="block">
				<span class="mb-1 block text-xs font-medium text-neutral-600">Family</span>
				<FamilySelect {family} onpick={pickFamily} />
			</span>
			<StrengthSelect {family} {step} onpick={pickStep} />
		</span>
		<span
			class="inline-block min-h-28 rounded-md border border-black/20"
			style:background={selectedHex}
			title={`${value} · ${selectedHex}`}
			aria-hidden="true"
		></span>
	</div>
</fieldset>
