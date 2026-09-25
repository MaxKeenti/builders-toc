import { RECIPE_SET } from '$lib/data/recipes';
import type { OptimizeProblem } from '$lib/optimizer/types';
import type { StoredInventory, StoredOptions } from './schema';

/** Builds the engine input from UI state. Returns null when the options can't be solved yet. */
export function toProblem(
	inventory: StoredInventory,
	options: StoredOptions
): OptimizeProblem | null {
	const plainGlass = options.plainGlassUnlimited
		? ({ kind: 'unlimited' } as const)
		: ({ kind: 'finite', quantity: options.plainGlassQuantity } as const);
	if (options.mode === 'target') {
		if (options.targetColors.length === 0 || options.target < 1) return null;
		return {
			inventory,
			recipes: RECIPE_SET,
			options: {
				mode: 'target',
				plainGlass,
				target: options.target,
				targetColors: [...options.targetColors]
			}
		};
	}
	return { inventory, recipes: RECIPE_SET, options: { mode: options.mode, plainGlass } };
}
