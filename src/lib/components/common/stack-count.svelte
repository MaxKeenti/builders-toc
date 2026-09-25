<script lang="ts">
	import {
		formatAmount,
		formatCount,
		formatNumber,
		formatStacks,
		type CountUnit
	} from '$lib/i18n/format';

	interface Props {
		count: number;
		unit: CountUnit;
		/**
		 * `full`: "152 stained-glass blocks · 2 stacks + 24" on one line.
		 * `stacked`: the number, with the unit and stack equivalent underneath.
		 * `stacks`: only the stack equivalent (the number itself when under one stack).
		 */
		variant?: 'full' | 'stacked' | 'stacks';
	}

	let { count, unit, variant = 'full' }: Props = $props();

	const stacks = $derived(formatStacks(count));
</script>

{#if variant === 'full'}
	<span class="tabular-nums">{formatCount(count, unit)}</span>
{:else if variant === 'stacks'}
	<span class="text-muted-foreground tabular-nums">{stacks ?? formatNumber(count)}</span>
{:else}
	<span class="flex flex-col">
		<span class="font-heading text-2xl leading-tight font-semibold tabular-nums">
			{formatNumber(count)}
		</span>
		<span class="text-xs text-muted-foreground tabular-nums">
			{unit === 'executions' || !stacks ? formatAmount(count, unit) : formatCount(count, unit)}
		</span>
	</span>
{/if}
