<script lang="ts">
	import type { Snippet } from 'svelte';
	import { Button } from '$lib/components/ui/button';
	import * as Dialog from '$lib/components/ui/dialog';
	import { m } from '$lib/paraglide/messages';

	interface Props {
		title: string;
		description?: string;
		/** Visible text of the trigger button. */
		triggerLabel: string;
		/** Accessible name of the trigger when the visible text isn't specific enough. */
		triggerAriaLabel?: string;
		/** Optional icon inside the trigger. */
		triggerIcon?: Snippet;
		children: Snippet;
	}

	let { title, description, triggerLabel, triggerAriaLabel, triggerIcon, children }: Props =
		$props();
</script>

<!-- Expandable detail: the summary stays on the page, the explanation opens here. -->
<Dialog.Root>
	<Dialog.Trigger>
		{#snippet child({ props })}
			<Button {...props} variant="outline" size="touch" aria-label={triggerAriaLabel}>
				{@render triggerIcon?.()}
				{triggerLabel}
			</Button>
		{/snippet}
	</Dialog.Trigger>
	<Dialog.Content showCloseButton={false} class="max-h-[85vh] overflow-y-auto sm:max-w-xl">
		<Dialog.Header>
			<Dialog.Title>{title}</Dialog.Title>
			{#if description}
				<Dialog.Description>{description}</Dialog.Description>
			{/if}
		</Dialog.Header>
		{@render children()}
		<Dialog.Footer>
			<Dialog.Close>
				{#snippet child({ props })}
					<Button {...props} variant="secondary" size="touch">{m.action_close()}</Button>
				{/snippet}
			</Dialog.Close>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>
