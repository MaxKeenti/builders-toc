import { COLOR_IDS, type ColorId } from '$lib/data/colors';
import { LpModel, linear, sum, scale, type LinearExpr } from './lp-model';
import type { OptimizeProblem } from './types';

/**
 * Optional extra starting resources, used by the bottleneck analysis. Each is a non-negative
 * integer variable capped at `cap` (dye units) or `glassCap` (glass dyeing batches).
 */
export interface ExtraResources {
	cap: number;
	glassCap: number;
}

/**
 * The core integer model shared by every mode:
 *
 * - `x_i`: executions of recipe i
 * - `g_c`: glass dyeings of color c (each uses `dyeUnits` dye and `plainGlass` plain glass)
 * - L[c] = D[c] + Σ A[c,r]·x[r] − dyeUnits·g[c] ≥ 0
 * - S[c] = E[c] + stainedGlassBlocks·g[c]
 * - plainGlass·Σ g ≤ Q when plain glass is finite
 */
export interface Formulation {
	model: LpModel;
	/** Variable name per recipe, index-aligned with `problem.recipes.dyeRecipes`. */
	recipeVars: string[];
	glassVars: Record<ColorId, string>;
	/** Extra dye variable per color, when extras are enabled. */
	extraDyeVars: Record<ColorId, string> | null;
	/** Extra plain glass, in batches of one glass dyeing, when extras are enabled and glass is finite. */
	extraGlassVar: string | null;
	finalGlass(color: ColorId): LinearExpr;
	dyeOnGlass(color: ColorId): LinearExpr;
	leftover(color: ColorId): LinearExpr;
}

export function buildFormulation(
	problem: OptimizeProblem,
	opts: { continuous?: boolean; extras?: ExtraResources } = {}
): Formulation {
	const { inventory, recipes, options } = problem;
	const glass = recipes.stainedGlass;
	const kind = opts.continuous ? 'continuous' : 'integer';
	const model = new LpModel();

	const recipeVars = recipes.dyeRecipes.map((_, i) => model.addVar(`x_${i}`, kind));
	const glassVars = Object.fromEntries(
		COLOR_IDS.map((c) => [c, model.addVar(`g_${c}`, kind)])
	) as Record<ColorId, string>;

	let extraDyeVars: Record<ColorId, string> | null = null;
	let extraGlassVar: string | null = null;
	if (opts.extras) {
		const { cap, glassCap } = opts.extras;
		extraDyeVars = Object.fromEntries(
			COLOR_IDS.map((c) => [c, model.addVar(`a_${c}`, kind, 0, cap)])
		) as Record<ColorId, string>;
		if (options.plainGlass.kind === 'finite') {
			extraGlassVar = model.addVar('a_plain_glass', kind, 0, glassCap);
		}
	}

	const dyeOnGlass = (c: ColorId) => linear({ [glassVars[c]]: glass.dyeUnits });
	const finalGlass = (c: ColorId) =>
		linear({ [glassVars[c]]: glass.stainedGlassBlocks }, inventory.stainedGlass[c]);
	const leftover = (c: ColorId): LinearExpr => {
		const terms: Record<string, number> = {};
		recipes.dyeRecipes.forEach((recipe, i) => {
			const net = (recipe.outputs[c] ?? 0) - (recipe.inputs[c] ?? 0);
			if (net !== 0) terms[recipeVars[i]] = net;
		});
		if (extraDyeVars) terms[extraDyeVars[c]] = 1;
		return sum(linear(terms, inventory.dye[c]), scale(dyeOnGlass(c), -1));
	};

	for (const c of COLOR_IDS) model.addConstraint(`leftover_${c}`, leftover(c), '>=', 0);

	if (options.plainGlass.kind === 'finite') {
		const used = linear(
			Object.fromEntries(COLOR_IDS.map((c) => [glassVars[c], glass.plainGlass]))
		);
		const available = extraGlassVar
			? linear({ [extraGlassVar]: glass.plainGlass }, options.plainGlass.quantity)
			: linear({}, options.plainGlass.quantity);
		model.addConstraint('plain_glass', sum(used, scale(available, -1)), '<=', 0);
	}

	return {
		model,
		recipeVars,
		glassVars,
		extraDyeVars,
		extraGlassVar,
		finalGlass,
		dyeOnGlass,
		leftover
	};
}

/** Σ over all colors. */
export function sumColors(fn: (c: ColorId) => LinearExpr, colors: readonly ColorId[] = COLOR_IDS) {
	return sum(...colors.map(fn));
}
