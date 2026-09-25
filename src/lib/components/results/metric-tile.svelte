<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		label: string;
		/** Short explanation under the label. */
		hint?: string;
		children: Snippet;
	}

	let { label, hint, children }: Props = $props();
</script>

<div class="flex flex-col gap-1 rounded-2xl bg-muted/50 p-4">
	<dt class="text-sm text-muted-foreground">
		{label}
		{#if hint}<span class="sr-only">: {hint}</span>{/if}
	</dt>
	<dd>{@render children()}</dd>
</div>
