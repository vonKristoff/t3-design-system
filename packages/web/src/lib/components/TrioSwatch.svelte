<script lang="ts">
	import { luminance, mixSrgb } from '@tsup-system/core';

	interface Props {
		/** Light / anchor / dark rows, each labelled with its emitted variable. */
		rows: { hex: string; name: string }[];
		title?: string;
		/** Layer the transparency grid under each strip (for translucent swatches). */
		checker?: boolean;
	}

	let { rows, title, checker = false }: Props = $props();

	/**
	 * Label ink per strip. Translucent mixes resolve over white (the checker
	 * reads light); anything unparsable falls back to dark.
	 */
	function ink(hex: string): string {
		try {
			const m = /^color-mix\(in srgb,\s*(#[0-9a-f]{6})\s+([\d.]+)%,\s*transparent\)$/i.exec(hex);
			const resolved = m ? mixSrgb(m[1], '#ffffff', parseFloat(m[2]) / 100) : hex;
			return luminance(resolved) > 0.3 ? '#292524' : '#fafaf9';
		} catch {
			return '#292524';
		}
	}
</script>

<span
	class="flex min-h-28 flex-1 flex-col overflow-hidden rounded-md border border-black/20"
	title={title ?? rows.map((r) => `${r.name} ${r.hex}`).join(' / ')}
	aria-hidden="true"
>
	{#each rows as r, i (r.name)}
		<span
			class="relative flex w-full items-center overflow-hidden px-2 font-mono text-[10px] {i === 1 ? 'flex-1' : 'h-8'}"
		>
			{#if checker}
				<span class="checkerboard absolute inset-0" aria-hidden="true"></span>
			{/if}
			<span class="absolute inset-0" style:background={r.hex} aria-hidden="true"></span>
			<span class="relative" style:color={ink(r.hex)}>{r.name}</span>
		</span>
	{/each}
</span>
