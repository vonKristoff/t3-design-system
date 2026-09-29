<script lang="ts">
	import { resolveTailwindHex } from '@tsup-system/core';
	import TrioSwatch from './TrioSwatch.svelte';
	import FamilySelect from './FamilySelect.svelte';
	import StrengthSelect from './StrengthSelect.svelte';

	interface Props {
		label: string;
		hint?: string;
		value: string;
		/** Live light / anchor / dark trio; renders as three labelled strips when set. */
		trio?: { light: string; base: string; dark: string; sem: string };
	}

	let { label, hint, value = $bindable(), trio }: Props = $props();

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
	<div class="grid grid-cols-[3fr_2fr] items-stretch gap-2">
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
		{#if trio}
			<TrioSwatch
				rows={[
					{ hex: trio.light, name: `--${trio.sem}-light` },
					{ hex: trio.base, name: `--${trio.sem}` },
					{ hex: trio.dark, name: `--${trio.sem}-dark` }
				]}
				title={`${value} · --${trio.sem}-light ${trio.light} / --${trio.sem} ${trio.base} / --${trio.sem}-dark ${trio.dark}`}
				checker={trio.sem === 'glass'}
			/>
		{:else}
			<span
				class="inline-block min-h-28 overflow-hidden rounded-md border border-black/20"
				title={`${value} · ${selectedHex}`}
				aria-hidden="true"
			>
				<span class="block h-full min-h-28 w-full" style:background={selectedHex}></span>
			</span>
		{/if}
	</div>
</fieldset>
