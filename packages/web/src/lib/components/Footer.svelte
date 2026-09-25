<script lang="ts">
	import Icon from './Icon.svelte';
</script>

<svelte:head>
	<link rel="preconnect" href="https://fonts.googleapis.com" />
	<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="anonymous" />
	<link
		rel="stylesheet"
		href="https://fonts.googleapis.com/css2?family=Chewy&display=swap"
	/>
</svelte:head>

<footer class="bg-amber-300 px-8 py-16">
	<div class="flex items-center justify-between gap-2">
		<Icon src="shapes" ctx="hand-1" size="5em" />
		<span class="">&copy; {new Date().getFullYear()} whatarewebuilding. All rights reserved.</span>
		<aside class="flex flex-col justify-end text-right text-sm text-neutral-700">
			<span>Built by humans</span>
			<a href="https://threejjjs.xyz">
				<h5 class="m-0 text-right text-xl md:text-3xl" style="font-family:'Chewy', system-ui, sans-serif;">
					three<span class="opacity-55">jjj</span>s
					<br />
				</h5>
			</a>
			<span class="text-xs">Interactive Tech</span>
		</aside>
	</div>
</footer>
