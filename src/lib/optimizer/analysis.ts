import { COLOR_IDS, type ColorId, type ColorCounts } from '$lib/data/colors';
import type { Recipe } from '$lib/data/recipes';
import type { UnreachableColor } from './types';

/** Dye colors that can be obtained from the starting dye by some sequence of recipes. */
export function obtainableDyes(dye: ColorCounts, recipes: readonly Recipe[]): Set<ColorId> {
	const obtainable = new Set(COLOR_IDS.filter((c) => dye[c] > 0));
	let changed = true;
	while (changed) {
		changed = false;
		for (const recipe of recipes) {
			const inputs = Object.keys(recipe.inputs) as ColorId[];
			if (!inputs.every((c) => obtainable.has(c))) continue;
			for (const c of Object.keys(recipe.outputs) as ColorId[]) {
				if (!obtainable.has(c)) {
					obtainable.add(c);
					changed = true;
				}
			}
		}
	}
	return obtainable;
}

/** Colors that can't appear in the final inventory: no existing glass and no way to get the dye. */
export function unreachableColors(
	dye: ColorCounts,
	stainedGlass: ColorCounts,
	recipes: readonly Recipe[]
): UnreachableColor[] {
	const obtainable = obtainableDyes(dye, recipes);
	return COLOR_IDS.filter((c) => stainedGlass[c] === 0 && !obtainable.has(c)).map((color) => ({
		color,
		recipes: recipes
			.filter((r) => (r.outputs[color] ?? 0) > 0)
			.map((r) => ({
				recipeId: r.id,
				missing: (Object.keys(r.inputs) as ColorId[]).filter((c) => !obtainable.has(c))
			}))
	}));
}

/** Colors produced by at least one recipe. Extra units of these are a less basic fix. */
export function craftableColors(recipes: readonly Recipe[]): Set<ColorId> {
	return new Set(recipes.flatMap((r) => Object.keys(r.outputs) as ColorId[]));
}
