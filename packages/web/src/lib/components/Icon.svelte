<script lang="ts">
	import hand from '$lib/assets/hand.svg';

	interface Props {
		src?: string;
		ctx?: string;
		size?: string;
	}

	let { src = 'shapes', ctx = '', size = '1em' }: Props = $props();
</script>

<img src={hand} alt={`${src} ${ctx}`.trim()} style={`width:${size};height:auto;vertical-align:middle;`} />
