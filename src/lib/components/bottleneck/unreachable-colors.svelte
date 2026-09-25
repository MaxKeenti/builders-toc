<script lang="ts">
	import InfoIcon from '@lucide/svelte/icons/info';
	import ColorLabel from '$lib/components/common/color-label.svelte';
	import DetailsDialog from '$lib/components/common/details-dialog.svelte';
	import { Badge } from '$lib/components/ui/badge';
	import type { UnreachableColor } from '$lib/optimizer/types';
	import { dyeName, recipeName } from '$lib/i18n/names';
	import { m } from '$lib/paraglide/messages';

	interface Props {
		colors: UnreachableColor[];
	}

	let { colors }: Props = $props();
</script>

<div class="flex flex-col gap-3">
	<h3 class="font-heading font-medium">{m.unreachable_title()}</h3>
	<ul class="flex flex-wrap gap-2">
		{#each colors as { color } (color)}
			<li><Badge variant="outline"><ColorLabel {color} size="sm" /></Badge></li>
		{/each}
	</ul>
	<div>
		<DetailsDialog
			title={m.unreachable_title()}
			description={m.unreachable_description()}
			triggerLabel={m.action_details()}
		>
			{#snippet triggerIcon()}
				<InfoIcon data-icon="inline-start" aria-hidden="true" />
			{/snippet}
			<dl class="flex flex-col gap-3">
				{#each colors as { color, recipes } (color)}
					<div>
						<dt class="font-medium"><ColorLabel {color} kind="dye" /></dt>
						{#each recipes as recipe (recipe.recipeId)}
							<dd class="text-muted-foreground">
								{m.unreachable_recipe_missing({
									recipe: recipeName(recipe.recipeId),
									missing: recipe.missing.map(dyeName).join(m.plan_list_separator())
								})}
							</dd>
						{:else}
							<dd class="text-muted-foreground">{m.unreachable_no_recipe()}</dd>
						{/each}
					</div>
				{/each}
			</dl>
		</DetailsDialog>
	</div>
</div>
