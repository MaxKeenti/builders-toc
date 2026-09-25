<script lang="ts">
	import PaintBucketIcon from '@lucide/svelte/icons/paint-bucket';
	import ColorSwatch from '$lib/components/common/color-swatch.svelte';
	import SectionCard from '$lib/components/common/section-card.svelte';
	import * as Item from '$lib/components/ui/item';
	import { formatAmount, formatCount, formatDyeAmount } from '$lib/i18n/format';
	import { dyeName, glassName } from '$lib/i18n/names';
	import type { OptimizeResult } from '$lib/optimizer/types';
	import { m } from '$lib/paraglide/messages';

	interface Props {
		result: OptimizeResult;
	}

	let { result }: Props = $props();
</script>

<SectionCard
	id="glass"
	title={m.section_glass()}
	description={m.section_glass_description()}
	icon={PaintBucketIcon}
>
	{#if result.plan.glass.length === 0}
		<p class="text-muted-foreground">{m.plan_no_glass()}</p>
	{:else}
		<ol class="flex flex-col gap-2">
			{#each result.plan.glass as step (step.color)}
				<li>
					<Item.Root variant="outline" size="sm">
						<Item.Media><ColorSwatch color={step.color} size="lg" /></Item.Media>
						<Item.Content>
							<Item.Title>{glassName(step.color)}</Item.Title>
							<Item.Description class="tabular-nums">
								{m.plan_glass_step({
									dye: formatDyeAmount(step.dyeUnits, dyeName(step.color)),
									plainGlass: formatAmount(step.plainGlass, 'plain-glass'),
									result: formatCount(step.stainedGlassBlocks, 'stained-glass')
								})}
							</Item.Description>
						</Item.Content>
					</Item.Root>
				</li>
			{/each}
		</ol>
	{/if}
</SectionCard>
