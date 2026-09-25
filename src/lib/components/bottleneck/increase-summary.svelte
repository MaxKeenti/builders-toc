<script lang="ts">
	import ColorSwatch from '$lib/components/common/color-swatch.svelte';
	import * as Item from '$lib/components/ui/item';
	import { resourceName } from '$lib/i18n/names';
	import type { SmallestIncrease } from '$lib/optimizer/types';
	import { m } from '$lib/paraglide/messages';
	import { formatIncreaseSet, formatResourceAmount } from './increase-text';

	interface Props {
		increase: SmallestIncrease;
		/** Explains what the "required" amount is required for. */
		requiredLabel: (amount: string) => string;
	}

	let { increase, requiredLabel }: Props = $props();
</script>

<div class="flex flex-col gap-3">
	{#each increase.increases as item (item.resource)}
		<Item.Root variant="outline">
			{#if item.resource !== 'plain_glass'}
				<Item.Media><ColorSwatch color={item.resource} size="lg" /></Item.Media>
			{/if}
			<Item.Content>
				<Item.Title class="text-base">{resourceName(item.resource)}</Item.Title>
				<Item.Description class="flex flex-col gap-0.5 tabular-nums">
					<span>
						{m.bottleneck_available({
							amount: formatResourceAmount(item.resource, item.available)
						})}
					</span>
					<span>{requiredLabel(formatResourceAmount(item.resource, item.required))}</span>
					<span class="font-medium text-foreground">
						{m.bottleneck_short({
							count: item.extra,
							amount: formatResourceAmount(item.resource, item.extra)
						})}
					</span>
				</Item.Description>
			</Item.Content>
		</Item.Root>
	{/each}
	{#if increase.unique}
		<p class="text-sm text-muted-foreground">{m.bottleneck_unique()}</p>
	{:else}
		<div class="text-sm text-muted-foreground">
			<p>{m.bottleneck_not_unique()}</p>
			<ul class="mt-1 list-disc pl-5 tabular-nums">
				{#each increase.alternatives as alternative, i (i)}
					<li>{formatIncreaseSet(alternative)}</li>
				{/each}
			</ul>
		</div>
	{/if}
</div>
