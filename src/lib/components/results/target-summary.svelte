<script lang="ts">
	import TargetIcon from '@lucide/svelte/icons/target';
	import IncreaseSummary from '$lib/components/bottleneck/increase-summary.svelte';
	import ColorLabel from '$lib/components/common/color-label.svelte';
	import SectionCard from '$lib/components/common/section-card.svelte';
	import { Badge } from '$lib/components/ui/badge';
	import { formatCount, formatNumber } from '$lib/i18n/format';
	import { colorName } from '$lib/i18n/names';
	import type { TargetOutcome } from '$lib/optimizer/types';
	import { m } from '$lib/paraglide/messages';

	interface Props {
		target: TargetOutcome;
	}

	let { target }: Props = $props();
</script>

<SectionCard
	id="target-outcome"
	title={m.section_target()}
	description={formatCount(target.target, 'stained-glass')}
	icon={TargetIcon}
>
	<div class="flex flex-col gap-5">
		{#if target.met.length > 0}
			<div class="flex flex-col gap-2">
				<h3 class="font-heading font-medium">{m.target_met_title()}</h3>
				<ul class="flex flex-wrap gap-2">
					{#each target.met as color (color)}
						<li><Badge variant="secondary"><ColorLabel {color} size="sm" /></Badge></li>
					{/each}
				</ul>
			</div>
		{/if}
		{#if target.unmet.length === 0}
			<p>{m.target_all_met({ target: formatNumber(target.target) })}</p>
		{:else}
			<div class="flex flex-col gap-2">
				<h3 class="font-heading font-medium">{m.target_unmet_title()}</h3>
				<ul class="flex flex-col gap-1.5 tabular-nums">
					{#each target.unmet as item (item.color)}
						<li>
							{item.reachable
								? m.target_unmet_short({
										color: colorName(item.color),
										current: formatNumber(item.finalGlass),
										shortfall: formatNumber(item.shortfall)
									})
								: m.target_unmet_unreachable({ color: colorName(item.color) })}
						</li>
					{/each}
				</ul>
			</div>
			{#if target.increase}
				<div class="flex flex-col gap-2">
					<h3 class="font-heading font-medium">{m.target_increase_heading()}</h3>
					<IncreaseSummary
						increase={target.increase}
						requiredLabel={(amount) => m.target_required({ amount })}
					/>
				</div>
			{/if}
		{/if}
	</div>
</SectionCard>
