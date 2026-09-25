import { COLOR_IDS, isColorId, type ColorCounts, type ColorId } from '$lib/data/colors';
import type { Recipe, RecipeSet } from '$lib/data/recipes';
import type { ColorOutcome, CraftingPlan, OptimizeProblem, RecipeStep } from './types';

/** Largest count accepted per inventory field. Keeps big-M rows numerically safe. */
export const MAX_COUNT = 1_000_000;

export type ProblemErrorCode =
	| 'invalid-count'
	| 'invalid-plain-glass'
	| 'invalid-target'
	| 'invalid-target-colors'
	| 'invalid-recipe';

export class ProblemError extends Error {
	constructor(
		readonly code: ProblemErrorCode,
		detail: string
	) {
		super(`${code}: ${detail}`);
		this.name = 'ProblemError';
	}
}

export type PlanErrorCode =
	'non-integer' | 'negative' | 'negative-dye' | 'plain-glass-exceeded' | 'stage-mismatch';

/** A solver result that failed independent integer validation. Never shown as a result. */
export class PlanValidationError extends Error {
	constructor(
		readonly code: PlanErrorCode,
		detail: string
	) {
		super(`${code}: ${detail}`);
		this.name = 'PlanValidationError';
	}
}

function isCount(n: unknown): n is number {
	return typeof n === 'number' && Number.isSafeInteger(n) && n >= 0 && n <= MAX_COUNT;
}

export function assertValidRecipes(recipes: RecipeSet): void {
	const ids = new Set<string>();
	for (const r of recipes.dyeRecipes) {
		if (ids.has(r.id)) throw new ProblemError('invalid-recipe', `duplicate id ${r.id}`);
		ids.add(r.id);
		for (const side of [r.inputs, r.outputs]) {
			const entries = Object.entries(side);
			if (entries.length === 0)
				throw new ProblemError('invalid-recipe', `${r.id} has an empty side`);
			for (const [item, q] of entries) {
				if (!isColorId(item) || !Number.isSafeInteger(q) || (q as number) <= 0) {
					throw new ProblemError('invalid-recipe', `${r.id}: ${item} × ${q}`);
				}
			}
		}
	}
	const g = recipes.stainedGlass;
	for (const q of [g.dyeUnits, g.plainGlass, g.stainedGlassBlocks]) {
		if (!Number.isSafeInteger(q) || q <= 0) {
			throw new ProblemError('invalid-recipe', 'stained glass recipe');
		}
	}
}

export function assertValidProblem(problem: OptimizeProblem): void {
	const { inventory, options } = problem;
	for (const c of COLOR_IDS) {
		if (!isCount(inventory.dye[c])) throw new ProblemError('invalid-count', `dye.${c}`);
		if (!isCount(inventory.stainedGlass[c])) {
			throw new ProblemError('invalid-count', `stainedGlass.${c}`);
		}
	}
	if (options.plainGlass.kind === 'finite' && !isCount(options.plainGlass.quantity)) {
		throw new ProblemError('invalid-plain-glass', String(options.plainGlass.quantity));
	}
	if (options.mode === 'target') {
		if (!isCount(options.target) || options.target < 1) {
			throw new ProblemError('invalid-target', String(options.target));
		}
		const seen = new Set<string>();
		for (const c of options.targetColors) {
			if (!isColorId(c) || seen.has(c)) throw new ProblemError('invalid-target-colors', String(c));
			seen.add(c);
		}
	}
	assertValidRecipes(problem.recipes);
}

/**
 * Orders recipes so every recipe runs after the recipes that produce its inputs. Ties keep
 * recipe-id order. Cycles (none exist in vanilla) fall back to id order, and the step-by-step
 * simulation in `evaluatePlan` rejects any order that would go negative.
 */
export function dependencyOrder(recipes: readonly Recipe[], used: number[]): number[] {
	const byId = used.slice().sort((a, b) => recipes[a].id.localeCompare(recipes[b].id));
	const feeds = (from: number, to: number) =>
		Object.keys(recipes[from].outputs).some((c) => (recipes[to].inputs[c as ColorId] ?? 0) > 0);
	const remaining = new Set(byId);
	const order: number[] = [];
	while (remaining.size > 0) {
		const next = byId.find(
			(i) => remaining.has(i) && ![...remaining].some((j) => j !== i && feeds(j, i))
		);
		if (next === undefined) {
			order.push(...byId.filter((i) => remaining.has(i)));
			break;
		}
		order.push(next);
		remaining.delete(next);
	}
	return order;
}

export interface EvaluatedPlan {
	colors: ColorOutcome[];
	plan: CraftingPlan;
}

/**
 * Rebuilds a plan from recipe executions and glass dyeings in pure integer arithmetic and
 * checks it: integers only, no negative dye at any step, existing glass preserved
 * (S = E + 8G), and the plain-glass limit. Throws `PlanValidationError` on any violation.
 */
export function evaluatePlan(
	problem: OptimizeProblem,
	executions: number[],
	glassDyeings: ColorCounts
): EvaluatedPlan {
	const { inventory, recipes, options } = problem;
	const glass = recipes.stainedGlass;
	const all = [...executions, ...COLOR_IDS.map((c) => glassDyeings[c])];
	for (const n of all) {
		if (!Number.isSafeInteger(n)) throw new PlanValidationError('non-integer', String(n));
		if (n < 0) throw new PlanValidationError('negative', String(n));
	}

	const dye: ColorCounts = { ...inventory.dye };
	const produced = Object.fromEntries(COLOR_IDS.map((c) => [c, 0])) as ColorCounts;
	const consumed = Object.fromEntries(COLOR_IDS.map((c) => [c, 0])) as ColorCounts;
	const used = executions.flatMap((n, i) => (n > 0 ? [i] : []));
	const steps: RecipeStep[] = [];

	for (const i of dependencyOrder(recipes.dyeRecipes, used)) {
		const recipe = recipes.dyeRecipes[i];
		const n = executions[i];
		const step: RecipeStep = { recipeId: recipe.id, executions: n, consumed: {}, produced: {} };
		for (const [c, q] of Object.entries(recipe.inputs) as [ColorId, number][]) {
			dye[c] -= q * n;
			consumed[c] += q * n;
			step.consumed[c] = q * n;
			if (dye[c] < 0) throw new PlanValidationError('negative-dye', `${c} at ${recipe.id}`);
		}
		for (const [c, q] of Object.entries(recipe.outputs) as [ColorId, number][]) {
			dye[c] += q * n;
			produced[c] += q * n;
			step.produced[c] = q * n;
		}
		steps.push(step);
	}

	let plainGlassUsed = 0;
	const colors: ColorOutcome[] = COLOR_IDS.map((c) => {
		const dyeOnGlass = glass.dyeUnits * glassDyeings[c];
		dye[c] -= dyeOnGlass;
		if (dye[c] < 0) throw new PlanValidationError('negative-dye', `${c} on glass`);
		plainGlassUsed += glass.plainGlass * glassDyeings[c];
		const newGlass = glass.stainedGlassBlocks * glassDyeings[c];
		return {
			color: c,
			startingDye: inventory.dye[c],
			existingGlass: inventory.stainedGlass[c],
			producedByRecipes: produced[c],
			consumedByRecipes: consumed[c],
			dyeOnGlass,
			newGlass,
			finalGlass: inventory.stainedGlass[c] + newGlass,
			leftoverDye: dye[c]
		};
	});

	// Conservation, checked independently of the step simulation above.
	for (const o of colors) {
		const expected = o.startingDye + o.producedByRecipes - o.consumedByRecipes - o.dyeOnGlass;
		if (expected !== o.leftoverDye || o.finalGlass < o.existingGlass) {
			throw new PlanValidationError('negative-dye', `conservation for ${o.color}`);
		}
	}

	if (options.plainGlass.kind === 'finite' && plainGlassUsed > options.plainGlass.quantity) {
		throw new PlanValidationError('plain-glass-exceeded', String(plainGlassUsed));
	}

	return {
		colors,
		plan: {
			recipes: steps,
			glass: colors
				.filter((o) => o.dyeOnGlass > 0)
				.map((o) => ({
					color: o.color,
					dyeUnits: o.dyeOnGlass,
					plainGlass: glass.plainGlass * glassDyeings[o.color],
					stainedGlassBlocks: o.newGlass
				}))
		}
	};
}
