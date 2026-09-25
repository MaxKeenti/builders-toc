<script lang="ts">
	import type { Component, Snippet } from 'svelte';
	import * as Card from '$lib/components/ui/card';

	interface Props {
		/** Used for the heading id and in-page anchors. */
		id: string;
		title: string;
		description?: string;
		/** A Lucide icon component, shown before the title. */
		icon: Component<{ class?: string; 'aria-hidden'?: boolean | 'true' | 'false' }>;
		/** Controls shown at the top-right of the card. */
		action?: Snippet;
		children: Snippet;
	}

	let { id, title, description, icon: Icon, action, children }: Props = $props();
</script>

<section {id} aria-labelledby="{id}-title" class="scroll-mt-4">
	<Card.Root>
		<Card.Header>
			<Card.Title>
				<h2 id="{id}-title" class="flex items-center gap-2 text-lg">
					<Icon class="size-5 text-primary" aria-hidden="true" />
					{title}
				</h2>
			</Card.Title>
			{#if description}
				<Card.Description>{description}</Card.Description>
			{/if}
			{#if action}
				<Card.Action>{@render action()}</Card.Action>
			{/if}
		</Card.Header>
		<Card.Content>
			{@render children()}
		</Card.Content>
	</Card.Root>
</section>
