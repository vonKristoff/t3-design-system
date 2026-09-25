<script lang="ts">
	import Icon from './Icon.svelte';
</script>

<footer class="bg-highlight px-8 py-16">
	<div class="flex items-center justify-between gap-2">
		<Icon src="shapes" ctx="hand-1" size="5em" />
		<div class="flex flex-col items-center gap-3">
			<span class="">&copy; {new Date().getFullYear()} DSB. All rights reserved.</span>
			<a href="https://www.buymeacoffee.com/threejjjs" target="_blank"><img src="https://cdn.buymeacoffee.com/buttons/v2/default-yellow.png" alt="Buy Me A Coffee" style="height: 60px; width: 217px;" /></a>
		</div>
		<aside class="flex flex-col justify-end text-right text-sm text-neutral-700">
			<span>Built by humans</span>
			<a href="https://threejjjs.xyz">
				<h5
					class="m-0 text-right text-xl md:text-3xl"
					style="font-family:'Chewy', system-ui, sans-serif;"
				>
					three<span class="opacity-55">jjj</span>s
					<br />
				</h5>
			</a>
			<span class="text-xs">Interactive Tech</span>
		</aside>
	</div>
</footer>
