import { emptyColorCounts, type ColorCounts, type ColorId } from '$lib/data/colors';
import { RECIPE_SET, type RecipeSet } from '$lib/data/recipes';
import type { OptimizeOptions, OptimizeProblem, OptimizeResult } from '../types';

export function counts(values: Partial<ColorCounts> = {}): ColorCounts {
	return { ...emptyColorCounts(), ...values };
}

export function problem(
	dye: Partial<ColorCounts>,
	stainedGlass: Partial<ColorCounts> = {},
	options: Partial<OptimizeOptions> = {},
	recipes: RecipeSet = RECIPE_SET
): OptimizeProblem {
	return {
		inventory: { dye: counts(dye), stainedGlass: counts(stainedGlass) },
		recipes,
		options: { mode: 'balanced', plainGlass: { kind: 'unlimited' }, ...options } as OptimizeOptions
	};
}

/**
 * Re-checks a result from scratch, without the engine's own validator: integer counts,
 * conservation per color, no negative dye while following the plan in order, existing glass
 * preserved and the plain-glass limit.
 */
export function assertPlanInvariants(p: OptimizeProblem, r: OptimizeResult): void {
	const glass = p.recipes.stainedGlass;
	const dye: Record<string, number> = { ...p.inventory.dye };
	for (const step of r.plan.recipes) {
		const recipe = p.recipes.dyeRecipes.find((x) => x.id === step.recipeId);
		if (!recipe) throw new Error(`unknown recipe ${step.recipeId}`);
		if (!Number.isInteger(step.executions) || step.executions <= 0) {
			throw new Error(`bad executions ${step.executions}`);
		}
		for (const [c, q] of Object.entries(recipe.inputs)) {
			dye[c] -= q * step.executions;
			if (dye[c] < 0) throw new Error(`negative ${c} at ${step.recipeId}`);
		}
		for (const [c, q] of Object.entries(recipe.outputs)) dye[c] += q * step.executions;
	}
	let plain = 0;
	for (const step of r.plan.glass) {
		dye[step.color] -= step.dyeUnits;
		if (dye[step.color] < 0) throw new Error(`negative ${step.color} on glass`);
		plain += step.plainGlass;
		if (step.stainedGlassBlocks !== (step.dyeUnits / glass.dyeUnits) * glass.stainedGlassBlocks) {
			throw new Error('glass recipe mismatch');
		}
	}
	for (const o of r.colors) {
		const c = o.color as ColorId;
		if (o.leftoverDye !== dye[c]) throw new Error(`leftover mismatch for ${c}`);
		if (o.finalGlass !== p.inventory.stainedGlass[c] + (o.dyeOnGlass / glass.dyeUnits) * glass.stainedGlassBlocks) {
			throw new Error(`S != E + 8G for ${c}`);
		}
		for (const v of Object.values(o)) {
			if (typeof v === 'number' && (!Number.isInteger(v) || v < 0)) {
				throw new Error(`non-integer or negative value for ${c}`);
			}
		}
	}
	if (r.summary.plainGlassUsed !== plain) throw new Error('plain glass mismatch');
	if (p.options.plainGlass.kind === 'finite' && plain > p.options.plainGlass.quantity) {
		throw new Error('plain glass limit exceeded');
	}
}

export function finalCounts(r: OptimizeResult): Partial<Record<ColorId, number>> {
	return Object.fromEntries(r.colors.filter((o) => o.finalGlass > 0).map((o) => [o.color, o.finalGlass]));
}
