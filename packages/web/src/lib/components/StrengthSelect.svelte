<script lang="ts">
	import { TAILWIND_PALETTE } from '@tsup-system/core';

	interface Props {
		family: string;
		step: string;
		onpick: (step: string) => void;
	}

	let { family, step, onpick }: Props = $props();

	const STEPS = ['50', '100', '200', '300', '400', '500', '600', '700', '800', '900', '950'];

	let open = $state(false);
	let box: HTMLDivElement | undefined = $state(undefined);

	const currentHex = $derived(TAILWIND_PALETTE[family]?.[step as '500'] ?? '#888888');

	function toggle(): void {
		open = !open;
	}

	function pick(s: string): void {
		onpick(s);
		open = false;
	}
</script>

<svelte:window
	onclick={(e) => {
		if (open && box && !box.contains(e.target as Node)) open = false;
	}}
	onkeydown={(e) => {
		if (e.key === 'Escape') open = false;
	}}
/>

<div class="relative" bind:this={box}>
	<button
		type="button"
		onclick={toggle}
		aria-haspopup="listbox"
		aria-expanded={open}
		class="flex w-full items-center gap-2 rounded-md border border-neutral-300 bg-white px-2 py-1.5 text-sm"
	>
		<span
			class="inline-block h-4 w-4 shrink-0 rounded-full border border-black/20"
			style:background={currentHex}
			aria-hidden="true"
		></span>
		<span class="flex-1 text-left">{family}-{step}</span>
		<span aria-hidden="true" class="text-neutral-400">{open ? '▲' : '▼'}</span>
	</button>

	{#if open}
		<ul
			role="listbox"
			aria-label="Strength"
			class="absolute z-20 mt-1 max-h-64 w-full overflow-auto rounded-md border border-neutral-300 bg-white py-1 shadow-lg"
		>
			{#each STEPS as s (s)}
				{@const hex = TAILWIND_PALETTE[family]?.[s as '500'] ?? '#888888'}
				<li role="option" aria-selected={s === step}>
					<button
						type="button"
						onclick={() => pick(s)}
						class="flex w-full items-center gap-2 px-2 py-1.5 text-left text-sm hover:bg-neutral-100 {s === step
							? 'bg-neutral-100 font-semibold'
							: ''}"
					>
						<span
							class="inline-block h-5 w-5 shrink-0 rounded border border-black/20"
							style:background={hex}
							aria-hidden="true"
						></span>
						<span class="flex-1">{family}-{s}</span>
						<span class="font-mono text-xs text-neutral-500">{hex}</span>
					</button>
				</li>
			{/each}
		</ul>
	{/if}
</div>
