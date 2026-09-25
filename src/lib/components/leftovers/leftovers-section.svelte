<script lang="ts">
	import HelpCircleIcon from '@lucide/svelte/icons/circle-question-mark';
	import PackageOpenIcon from '@lucide/svelte/icons/package-open';
	import ColorLabel from '$lib/components/common/color-label.svelte';
	import DetailsDialog from '$lib/components/common/details-dialog.svelte';
	import SectionCard from '$lib/components/common/section-card.svelte';
	import StackCount from '$lib/components/common/stack-count.svelte';
	import * as Item from '$lib/components/ui/item';
	import { formatNumber } from '$lib/i18n/format';
	import { dyeName } from '$lib/i18n/names';
	import type { LeftoverNote, Mode, OptimizeResult } from '$lib/optimizer/types';
	import { m } from '$lib/paraglide/messages';

	interface Props {
		result: OptimizeResult;
	}

	let { result }: Props = $props();

	// Every dye the plan touched, including the ones used up (shown as 0).
	const rows = $derived(result.colors.filter((o) => o.startingDye > 0 || o.producedByRecipes > 0));

	const intro: Record<Mode, () => string> = {
		balanced: m.leftovers_intro_balanced,
		'maximum-output': m.leftovers_intro_maximum,
		target: m.leftovers_intro_target
	};

	function explain(note: LeftoverNote): string {
		const largest = result.summary.largest;
		const dye = dyeName(note.color);
		if (largest !== null && note.finalIfOneMore > largest) {
			return m.leftovers_note_spread({
				dye,
				next: formatNumber(note.finalIfOneMore),
				current: formatNumber(note.finalGlass),
				largest: formatNumber(largest)
			});
		}
		return m.leftovers_note_other({ dye });
	}
</script>

<SectionCard
	id="leftovers"
	title={m.section_leftovers()}
	description={m.section_leftovers_description()}
	icon={PackageOpenIcon}
>
	{#if rows.length === 0 || result.summary.leftoverDye === 0}
		<p class="text-muted-foreground">{m.leftovers_none()}</p>
	{/if}
	{#if rows.length > 0}
		<ul class="grid gap-2 sm:grid-cols-2">
			{#each rows as row (row.color)}
				<li>
					<Item.Root variant="muted" size="sm">
						<Item.Content>
							<Item.Title><ColorLabel color={row.color} kind="dye" /></Item.Title>
							<Item.Description>
								<StackCount count={row.leftoverDye} unit="dye" />
							</Item.Description>
						</Item.Content>
					</Item.Root>
				</li>
			{/each}
		</ul>
	{/if}
	{#if result.summary.leftoverDye > 0}
		<div class="mt-4">
			<DetailsDialog title={m.leftovers_dialog_title()} triggerLabel={m.leftovers_why()}>
				{#snippet triggerIcon()}
					<HelpCircleIcon data-icon="inline-start" aria-hidden="true" />
				{/snippet}
				<p>{intro[result.mode]()}</p>
				{#if result.mode === 'balanced'}
					<ul class="flex list-disc flex-col gap-2 pl-5">
						{#each result.leftoverNotes as note (note.color)}
							<li>{explain(note)}</li>
						{/each}
					</ul>
				{/if}
			</DetailsDialog>
		</div>
	{/if}
</SectionCard>
