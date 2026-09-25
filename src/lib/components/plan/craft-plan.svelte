<script lang="ts">
	import HammerIcon from '@lucide/svelte/icons/hammer';
	import ColorSwatch from '$lib/components/common/color-swatch.svelte';
	import SectionCard from '$lib/components/common/section-card.svelte';
	import * as Item from '$lib/components/ui/item';
	import type { ColorId } from '$lib/data/colors';
	import { RECIPE_SET } from '$lib/data/recipes';
	import { formatCount, formatNumber } from '$lib/i18n/format';
	import { recipeName } from '$lib/i18n/names';
	import type { OptimizeResult } from '$lib/optimizer/types';
	import { m } from '$lib/paraglide/messages';
	import RecipeDetails from './recipe-details.svelte';
	import { formatRecipeIo } from './recipe-io';

	interface Props {
		result: OptimizeResult;
	}

	let { result }: Props = $props();

	const steps = $derived(
		result.plan.recipes.flatMap((step) => {
			const recipe = RECIPE_SET.dyeRecipes.find((r) => r.id === step.recipeId);
			return recipe ? [{ step, recipe, output: Object.keys(recipe.outputs)[0] as ColorId }] : [];
		})
	);
</script>

<SectionCard
	id="craft"
	title={m.section_craft()}
	description={m.section_craft_description()}
	icon={HammerIcon}
>
	{#if steps.length === 0}
		<p class="text-muted-foreground">{m.plan_no_recipes()}</p>
	{:else}
		<ol class="flex flex-col gap-2">
			{#each steps as { step, recipe, output } (step.recipeId)}
				<li>
					<Item.Root variant="outline" size="sm">
						<Item.Media><ColorSwatch color={output} size="lg" /></Item.Media>
						<Item.Content>
							<Item.Title class="tabular-nums">
								{m.plan_recipe_step({
									executions: formatNumber(step.executions),
									recipe: recipeName(step.recipeId)
								})}
							</Item.Title>
							<Item.Description class="tabular-nums">
								{formatRecipeIo(step.consumed, step.produced)}
							</Item.Description>
						</Item.Content>
						<Item.Actions>
							<RecipeDetails {step} {recipe} recipeDataVersion={result.recipeDataVersion} />
						</Item.Actions>
					</Item.Root>
				</li>
			{/each}
		</ol>
		<p class="mt-3 text-sm text-muted-foreground tabular-nums">
			{m.plan_total_executions({
				executions: formatCount(result.summary.recipeExecutions, 'executions')
			})}
		</p>
	{/if}
</SectionCard>
