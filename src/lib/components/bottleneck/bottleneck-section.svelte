<script lang="ts">
	import CalculatorIcon from '@lucide/svelte/icons/calculator';
	import FunnelIcon from '@lucide/svelte/icons/funnel';
	import ColorLabel from '$lib/components/common/color-label.svelte';
	import DetailsDialog from '$lib/components/common/details-dialog.svelte';
	import SectionCard from '$lib/components/common/section-card.svelte';
	import { formatDyeAmount, formatNumber } from '$lib/i18n/format';
	import { dyeName, resourceName } from '$lib/i18n/names';
	import type { OptimizeResult } from '$lib/optimizer/types';
	import { m } from '$lib/paraglide/messages';
	import IncreaseSummary from './increase-summary.svelte';
	import { formatIncrease } from './increase-text';
	import UnreachableColors from './unreachable-colors.svelte';

	interface Props {
		result: OptimizeResult;
	}

	let { result }: Props = $props();

	const bottleneck = $derived(result.bottleneck);
</script>

<SectionCard
	id="bottleneck"
	title={m.section_bottleneck()}
	description={m.section_bottleneck_description()}
	icon={FunnelIcon}
>
	<div class="flex flex-col gap-6">
		{#if bottleneck?.kind === 'none'}
			<p class="text-muted-foreground">{m.bottleneck_none()}</p>
		{:else if bottleneck?.kind === 'found'}
			{@const increase = bottleneck.increase}
			<div class="flex flex-col gap-3">
				<h3 class="font-heading font-medium">
					{increase.unique && increase.increases.length === 1
						? m.bottleneck_unique_heading({
								resource: resourceName(increase.increases[0].resource)
							})
						: m.bottleneck_heading()}
				</h3>
				<IncreaseSummary {increase} requiredLabel={(amount) => m.bottleneck_required({ amount })} />
				<p class="text-sm tabular-nums">
					{m.bottleneck_next_floor({
						current: formatNumber(bottleneck.balanceFloor),
						next: formatNumber(bottleneck.nextFloor)
					})}
				</p>
				<div>
					<DetailsDialog
						title={m.bottleneck_dialog_title({ floor: formatNumber(bottleneck.balanceFloor) })}
						triggerLabel={m.bottleneck_show_math()}
					>
						{#snippet triggerIcon()}
							<CalculatorIcon data-icon="inline-start" aria-hidden="true" />
						{/snippet}
						<p>{m.bottleneck_dialog_intro({ next: formatNumber(bottleneck.nextFloor) })}</p>
						<ul class="flex flex-col gap-1.5 tabular-nums">
							{#each bottleneck.nextLevels as level (level.color)}
								<li class="flex items-start gap-2">
									<ColorLabel color={level.color} size="sm" />
									<span class="text-muted-foreground">
										{m.bottleneck_level_line({
											current: formatNumber(level.finalGlass),
											next: formatNumber(level.nextLevel),
											dye: formatDyeAmount(level.dyeOnGlass, dyeName(level.color))
										})}
									</span>
								</li>
							{/each}
						</ul>
						<p>{m.bottleneck_dialog_conclusion()}</p>
						<ul class="list-disc pl-5 font-medium tabular-nums">
							{#each increase.increases as item (item.resource)}
								<li>{formatIncrease(item)}</li>
							{/each}
						</ul>
						<p class="text-muted-foreground">
							{increase.unique ? m.bottleneck_unique() : m.bottleneck_not_unique()}
						</p>
						{#if !increase.unique}
							<ul class="list-disc pl-5 text-muted-foreground tabular-nums">
								{#each increase.alternatives as alternative, i (i)}
									<li>{alternative.map(formatIncrease).join(m.plan_list_separator())}</li>
								{/each}
							</ul>
						{/if}
					</DetailsDialog>
				</div>
			</div>
		{/if}
		{#if result.unreachable.length > 0}
			<UnreachableColors colors={result.unreachable} />
		{/if}
	</div>
</SectionCard>
