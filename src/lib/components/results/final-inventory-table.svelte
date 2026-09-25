<script lang="ts">
	import Grid3x3Icon from '@lucide/svelte/icons/grid-3x3';
	import ColorLabel from '$lib/components/common/color-label.svelte';
	import SectionCard from '$lib/components/common/section-card.svelte';
	import StackCount from '$lib/components/common/stack-count.svelte';
	import * as Table from '$lib/components/ui/table';
	import { formatNumber } from '$lib/i18n/format';
	import type { OptimizeResult } from '$lib/optimizer/types';
	import { m } from '$lib/paraglide/messages';

	interface Props {
		result: OptimizeResult;
	}

	let { result }: Props = $props();

	const rows = $derived(result.colors.filter((o) => o.finalGlass > 0));
</script>

<SectionCard
	id="final-inventory"
	title={m.section_final()}
	description={m.section_final_description()}
	icon={Grid3x3Icon}
>
	<Table.Root>
		<Table.Caption>{m.table_hide_empty()}</Table.Caption>
		<Table.Header class="[&_th]:whitespace-normal">
			<Table.Row>
				<Table.Head>{m.table_color()}</Table.Head>
				<Table.Head class="text-right">{m.table_existing()}</Table.Head>
				<Table.Head class="text-right">{m.table_dye_on_glass()}</Table.Head>
				<Table.Head class="text-right">{m.table_new()}</Table.Head>
				<Table.Head class="text-right">{m.table_final()}</Table.Head>
				<Table.Head class="text-right">{m.table_stacks()}</Table.Head>
			</Table.Row>
		</Table.Header>
		<Table.Body>
			{#each rows as row (row.color)}
				<Table.Row>
					<Table.Cell><ColorLabel color={row.color} /></Table.Cell>
					<Table.Cell class="text-right tabular-nums">{formatNumber(row.existingGlass)}</Table.Cell>
					<Table.Cell class="text-right tabular-nums">{formatNumber(row.dyeOnGlass)}</Table.Cell>
					<Table.Cell class="text-right tabular-nums">{formatNumber(row.newGlass)}</Table.Cell>
					<Table.Cell class="text-right font-medium tabular-nums">
						{formatNumber(row.finalGlass)}
					</Table.Cell>
					<Table.Cell class="text-right">
						<StackCount count={row.finalGlass} unit="stained-glass" variant="stacks" />
					</Table.Cell>
				</Table.Row>
			{/each}
		</Table.Body>
		<Table.Footer>
			<Table.Row>
				<Table.Cell>{m.table_total()}</Table.Cell>
				<Table.Cell class="text-right tabular-nums">
					{formatNumber(result.summary.existingGlass)}
				</Table.Cell>
				<Table.Cell class="text-right tabular-nums">
					{formatNumber(result.summary.dyeUnitsOnGlass)}
				</Table.Cell>
				<Table.Cell class="text-right tabular-nums"
					>{formatNumber(result.summary.newGlass)}</Table.Cell
				>
				<Table.Cell class="text-right tabular-nums">
					{formatNumber(result.summary.totalFinal)}
				</Table.Cell>
				<Table.Cell class="text-right">
					<StackCount count={result.summary.totalFinal} unit="stained-glass" variant="stacks" />
				</Table.Cell>
			</Table.Row>
		</Table.Footer>
	</Table.Root>
</SectionCard>
