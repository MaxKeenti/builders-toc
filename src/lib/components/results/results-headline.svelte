<script lang="ts">
	import CircleAlertIcon from '@lucide/svelte/icons/circle-alert';
	import RefreshCwIcon from '@lucide/svelte/icons/refresh-cw';
	import SparklesIcon from '@lucide/svelte/icons/sparkles';
	import StackCount from '$lib/components/common/stack-count.svelte';
	import * as Alert from '$lib/components/ui/alert';
	import { Badge } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import * as Empty from '$lib/components/ui/empty';
	import { Spinner } from '$lib/components/ui/spinner';
	import { formatNumber } from '$lib/i18n/format';
	import type { Mode } from '$lib/optimizer/types';
	import { m } from '$lib/paraglide/messages';
	import { inventory, optimizer, options } from '$lib/state';
	import MetricTile from './metric-tile.svelte';

	const result = $derived(optimizer.result);
	const summary = $derived(result?.summary);

	const modeLabels: Record<Mode, () => string> = {
		balanced: m.mode_balanced,
		'maximum-output': m.mode_maximum_output,
		target: m.mode_target
	};

	const errorMessage = $derived.by(() => {
		const error = optimizer.error;
		if (!error) return '';
		if (error.name === 'PlanValidationError') return m.results_error_validation();
		if (error.name === 'WorkerError') return m.results_error_load();
		return m.results_error_solver({ message: error.message });
	});

	const targetInvalid = $derived(
		options.current.mode === 'target' && options.current.targetColors.length === 0
	);
</script>

<section
	aria-labelledby="headline-title"
	aria-live="polite"
	aria-busy={optimizer.status === 'solving'}
>
	<Card.Root>
		<Card.Header>
			<Card.Title>
				<h2 id="headline-title" class="flex items-center gap-2 text-lg">
					<SparklesIcon class="size-5 text-primary" aria-hidden="true" />
					{m.headline_label()}
				</h2>
			</Card.Title>
			<Card.Action class="flex items-center gap-2">
				{#if optimizer.status === 'solving'}
					<Spinner aria-label={m.results_solving()} />
					<span class="text-sm text-muted-foreground">{m.results_solving()}</span>
				{/if}
				<Badge variant="secondary">{modeLabels[options.current.mode]()}</Badge>
			</Card.Action>
		</Card.Header>
		<Card.Content>
			{#if inventory.isEmpty}
				<Empty.Root>
					<Empty.Header>
						<Empty.Title>{m.results_empty_title()}</Empty.Title>
						<Empty.Description>{m.results_empty_description()}</Empty.Description>
					</Empty.Header>
				</Empty.Root>
			{:else if targetInvalid}
				<Alert.Root>
					<CircleAlertIcon aria-hidden="true" />
					<Alert.Title>{m.results_invalid_input()}</Alert.Title>
				</Alert.Root>
			{:else if optimizer.status === 'error'}
				<Alert.Root variant="destructive">
					<CircleAlertIcon aria-hidden="true" />
					<Alert.Title>{m.results_error_title()}</Alert.Title>
					<Alert.Description>{errorMessage}</Alert.Description>
					<Alert.Action>
						<Button variant="outline" size="touch" onclick={() => optimizer.retry()}>
							<RefreshCwIcon data-icon="inline-start" aria-hidden="true" />
							{m.results_retry()}
						</Button>
					</Alert.Action>
				</Alert.Root>
			{:else if summary}
				<div class={optimizer.stale ? 'opacity-60 transition-opacity' : 'transition-opacity'}>
					<p class="mb-4 font-heading text-4xl font-semibold tabular-nums">
						{m.headline_colors({
							achieved: formatNumber(summary.variety),
							total: formatNumber(summary.colorCount)
						})}
					</p>
					<dl class="grid grid-cols-2 gap-3 lg:grid-cols-4">
						<MetricTile label={m.metric_balance_floor()} hint={m.metric_balance_floor_hint()}>
							{#if summary.balanceFloor === null}
								{m.metric_not_applicable()}
							{:else}
								<StackCount count={summary.balanceFloor} unit="stained-glass" variant="stacked" />
							{/if}
						</MetricTile>
						<MetricTile label={m.metric_largest()}>
							{#if summary.largest === null}
								{m.metric_not_applicable()}
							{:else}
								<StackCount count={summary.largest} unit="stained-glass" variant="stacked" />
							{/if}
						</MetricTile>
						<MetricTile label={m.metric_spread()} hint={m.metric_spread_hint()}>
							{#if summary.spread === null}
								{m.metric_not_applicable()}
							{:else}
								<StackCount count={summary.spread} unit="stained-glass" variant="stacked" />
							{/if}
						</MetricTile>
						<MetricTile label={m.metric_new_glass()}>
							<StackCount count={summary.newGlass} unit="stained-glass" variant="stacked" />
						</MetricTile>
						<MetricTile label={m.metric_total_glass()}>
							<StackCount count={summary.totalFinal} unit="stained-glass" variant="stacked" />
						</MetricTile>
						<MetricTile label={m.metric_plain_glass()}>
							<StackCount count={summary.plainGlassUsed} unit="plain-glass" variant="stacked" />
						</MetricTile>
						<MetricTile label={m.metric_dye_used()}>
							<StackCount count={summary.dyeUnitsOnGlass} unit="dye" variant="stacked" />
						</MetricTile>
						<MetricTile label={m.metric_executions()}>
							<StackCount count={summary.recipeExecutions} unit="executions" variant="stacked" />
						</MetricTile>
					</dl>
					{#if optimizer.stale}
						<p class="mt-3 text-sm text-muted-foreground">{m.results_stale()}</p>
					{/if}
				</div>
			{:else}
				<div class="flex items-center gap-2 py-8 text-muted-foreground">
					<Spinner aria-label={m.results_solving()} />
					{m.results_solving()}
				</div>
			{/if}
		</Card.Content>
	</Card.Root>
</section>
