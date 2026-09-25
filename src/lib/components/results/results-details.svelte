<script lang="ts">
	import BottleneckSection from '$lib/components/bottleneck/bottleneck-section.svelte';
	import LeftoversSection from '$lib/components/leftovers/leftovers-section.svelte';
	import CraftPlan from '$lib/components/plan/craft-plan.svelte';
	import GlassPlan from '$lib/components/plan/glass-plan.svelte';
	import { inventory, optimizer } from '$lib/state';
	import FinalInventoryTable from './final-inventory-table.svelte';
	import TargetSummary from './target-summary.svelte';

	const result = $derived(inventory.isEmpty ? null : optimizer.result);
</script>

{#if result}
	<div class={['flex flex-col gap-6 transition-opacity', optimizer.stale && 'opacity-60']}>
		{#if result.target}
			<TargetSummary target={result.target} />
		{/if}
		<CraftPlan {result} />
		<GlassPlan {result} />
		<FinalInventoryTable {result} />
		<LeftoversSection {result} />
		<BottleneckSection {result} />
	</div>
{/if}
