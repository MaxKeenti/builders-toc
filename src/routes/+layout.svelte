<script lang="ts">
	import { ModeWatcher } from 'mode-watcher';
	import favicon from '$lib/assets/favicon.svg';
	import { Toaster } from '$lib/components/ui/sonner';
	import { m } from '$lib/paraglide/messages';
	import './layout.css';

	let { children } = $props();
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	<title>{m.app_title()}</title>
	<meta name="description" content={m.app_meta_description()} />
</svelte:head>

<ModeWatcher />
<Toaster richColors={false} closeButton />
{@render children()}
