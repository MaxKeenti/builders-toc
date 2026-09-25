<script lang="ts">
	import InfoIcon from '@lucide/svelte/icons/info';
	import DetailsDialog from '$lib/components/common/details-dialog.svelte';
	import { Button } from '$lib/components/ui/button';
	import type { Recipe } from '$lib/data/recipes';
	import { formatCount } from '$lib/i18n/format';
	import { recipeName } from '$lib/i18n/names';
	import type { RecipeStep } from '$lib/optimizer/types';
	import { m } from '$lib/paraglide/messages';
	import { formatRecipeIo } from './recipe-io';

	interface Props {
		step: RecipeStep;
		recipe: Recipe;
		recipeDataVersion: string;
	}

	let { step, recipe, recipeDataVersion }: Props = $props();

	const name = $derived(recipeName(step.recipeId));
</script>

<DetailsDialog
	title={name}
	description={formatCount(step.executions, 'executions')}
	triggerLabel={m.action_details()}
	triggerAriaLabel={m.recipe_dialog_open({ recipe: name })}
>
	{#snippet triggerIcon()}
		<InfoIcon data-icon="inline-start" aria-hidden="true" />
	{/snippet}
	<dl class="flex flex-col gap-4">
		<div>
			<dt class="font-medium">{m.recipe_dialog_per_execution()}</dt>
			<dd class="text-muted-foreground">{formatRecipeIo(recipe.inputs, recipe.outputs)}</dd>
		</div>
		<div>
			<dt class="font-medium">{m.recipe_dialog_total()}</dt>
			<dd class="text-muted-foreground">{formatRecipeIo(step.consumed, step.produced)}</dd>
		</div>
		<div>
			<dt class="font-medium">{m.recipe_dialog_source()}</dt>
			<dd class="break-all">
				<Button
					variant="link"
					class="h-auto p-0 whitespace-normal"
					href={recipe.source}
					target="_blank"
					rel="noreferrer"
				>
					{recipe.source}
				</Button>
			</dd>
			<dd class="text-xs text-muted-foreground">
				{m.recipe_dialog_recipe_version({ version: recipeDataVersion })}
			</dd>
		</div>
	</dl>
</DetailsDialog>
