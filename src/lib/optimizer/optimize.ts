import { COLOR_IDS, type ColorCounts, type ColorId } from '$lib/data/colors';
import { analyzeBottleneck, analyzeTarget } from './bottleneck';
import { buildFormulation, sumColors, type Formulation } from './formulation';
import { Lexicographic } from './lexicographic';
import { linear, scale, sum, type LinearExpr } from './lp-model';
import { SolverError, type MilpSolver } from './solver';
import { unreachableColors } from './analysis';
import { assertValidProblem, evaluatePlan, PlanValidationError, ProblemError } from './validate';
import type {
	ColorOutcome,
	CraftingPlan,
	LeftoverNote,
	OptimizeProblem,
	OptimizeResult,
	StageOptima,
	Summary
} from './types';

/**
 * Solves an optimization problem end to end: lexicographic stages for the chosen mode,
 * deterministic tie-breaking, independent integer validation and explanations.
 *
 * Pure: everything comes from `problem`, and all solving goes through `solver`.
 */
export function optimize(problem: OptimizeProblem, solver: MilpSolver): OptimizeResult {
	assertValidProblem(problem);
	const { options, recipes } = problem;
	const f = buildFormulation(problem);
	const lex = new Lexicographic(f.model, solver);
	const expected: Partial<StageOptima> = {};

	const leftoverTotal = sumColors(f.leftover);
	const executionTotal = linear(Object.fromEntries(f.recipeVars.map((v) => [v, 1])));

	if (options.mode === 'target') {
		const requested = COLOR_IDS.filter((c) => options.targetColors.includes(c));
		// y_c = 1 when color c reaches the target; s_c is how far below the target it ends.
		const met: LinearExpr[] = [];
		const shortfall: LinearExpr[] = [];
		for (const c of requested) {
			const y = f.model.addVar(`y_${c}`, 'binary');
			const s = f.model.addVar(`s_${c}`, 'integer');
			f.model.addConstraint(
				`meets_${c}`,
				sum(f.finalGlass(c), linear({ [y]: -options.target })),
				'>=',
				0
			);
			f.model.addConstraint(`shortfall_${c}`, sum(f.finalGlass(c), linear({ [s]: 1 })), '>=', options.target);
			met.push(linear({ [y]: 1 }));
			shortfall.push(linear({ [s]: 1 }));
		}
		lex.maximize('met', sum(...met));
		lex.minimize('shortfall', sum(...shortfall));
		lex.minimize('dye_on_glass', sumColors(f.dyeOnGlass));
		expected.recipeExecutions = lex.minimize('executions', executionTotal);
	} else {
		const balance = addBalanceVars(f, finalGlassBound(problem, solver));
		if (options.mode === 'maximum-output') {
			expected.totalFinal = lex.maximize('total', sumColors(f.finalGlass));
		}
		expected.variety = lex.maximize('variety', balance.variety);
		if (expected.variety > 0) {
			expected.balanceFloor = lex.maximize('floor', balance.floor);
			expected.spread = lex.minimize('spread', balance.spread);
		} else {
			expected.balanceFloor = null;
			expected.spread = null;
		}
		expected.leftoverDye = lex.minimize('leftover', leftoverTotal);
		expected.recipeExecutions = lex.minimize('executions', executionTotal);
	}

	// Tie-break: recipes in id order, then glass dyeing in color order (ADR 0002).
	const recipeOrder = recipes.dyeRecipes
		.map((r, i) => ({ id: r.id, v: f.recipeVars[i] }))
		.sort((a, b) => a.id.localeCompare(b.id))
		.map((r) => r.v);
	lex.fixInOrder([...recipeOrder, ...COLOR_IDS.map((c) => f.glassVars[c])]);

	const values = lex.values;
	const executions = f.recipeVars.map((v) => values[v]);
	const glassDyeings = Object.fromEntries(
		COLOR_IDS.map((c) => [c, values[f.glassVars[c]]])
	) as ColorCounts;

	const evaluated = evaluatePlan(problem, executions, glassDyeings);
	const summary = summarize(evaluated.colors, evaluated.plan, executions);
	const stageOptima: StageOptima = {
		variety: summary.variety,
		balanceFloor: summary.balanceFloor,
		spread: summary.spread,
		leftoverDye: summary.leftoverDye,
		recipeExecutions: summary.recipeExecutions,
		totalFinal: summary.totalFinal
	};
	for (const [key, value] of Object.entries(expected)) {
		if (stageOptima[key as keyof StageOptima] !== value) {
			throw new PlanValidationError('stage-mismatch', `${key}: ${value}`);
		}
	}

	const unreachable = unreachableColors(
		problem.inventory.dye,
		problem.inventory.stainedGlass,
		recipes.dyeRecipes
	);

	return {
		mode: options.mode,
		recipeDataVersion: recipes.version,
		colors: evaluated.colors,
		plan: evaluated.plan,
		summary,
		stageOptima,
		unreachable,
		leftoverNotes: leftoverNotes(problem, evaluated.colors),
		bottleneck:
			options.mode === 'balanced' && summary.balanceFloor !== null
				? analyzeBottleneck(problem, evaluated.colors, summary.balanceFloor, solver)
				: options.mode === 'balanced'
					? { kind: 'none', reason: 'no-colors' }
					: null,
		target:
			options.mode === 'target'
				? analyzeTarget(problem, evaluated.colors, unreachable, solver)
				: null
	};
}

interface BalanceVars {
	variety: LinearExpr;
	floor: LinearExpr;
	spread: LinearExpr;
}

/**
 * z_c = 1 marks a selected color (at least one block): z_c ≤ S_c.
 * T is the balance floor over selected colors: S_c ≥ T − M·(1 − z_c).
 * U is the largest final count: U ≥ S_c. Spread = U − T.
 */
function addBalanceVars(f: Formulation, bigM: number): BalanceVars {
	const { model } = f;
	const floor = model.addVar('T', 'integer', 0, bigM);
	const largest = model.addVar('U', 'integer', 0, bigM);
	const variety: LinearExpr[] = [];
	for (const c of COLOR_IDS) {
		const z = model.addVar(`z_${c}`, 'binary');
		const s = f.finalGlass(c);
		model.addConstraint(`select_${c}`, sum(linear({ [z]: 1 }), scale(s, -1)), '<=', 0);
		model.addConstraint(
			`floor_${c}`,
			sum(s, linear({ [floor]: -1, [z]: -bigM })),
			'>=',
			-bigM
		);
		model.addConstraint(`largest_${c}`, sum(linear({ [largest]: 1 }), scale(s, -1)), '>=', 0);
		variety.push(linear({ [z]: 1 }));
	}
	return {
		variety: sum(...variety),
		floor: linear({ [floor]: 1 }),
		spread: linear({ [largest]: 1, [floor]: -1 })
	};
}

/**
 * An upper bound on any final count, from the LP relaxation of "maximize glass dyeing".
 * It also rejects recipe data that could create dye from nothing (an unbounded LP).
 */
export function finalGlassBound(problem: OptimizeProblem, solver: MilpSolver): number {
	const relaxed = buildFormulation(problem, { continuous: true });
	const objective = sumColors((c) => linear({ [relaxed.glassVars[c]]: 1 }));
	const result = solver.solve(
		relaxed.model.toLp({ direction: 'maximize', expr: objective }),
		relaxed.model.variableNames
	);
	if (result.status === 'unbounded') {
		throw new ProblemError('invalid-recipe', 'recipes can create unlimited dye');
	}
	if (result.status !== 'optimal') throw new SolverError(`Bound: ${result.status}`);
	const maxDyeings = Math.floor(result.objective + 1e-6);
	const blocks = problem.recipes.stainedGlass.stainedGlassBlocks;
	return Math.max(...COLOR_IDS.map((c) => problem.inventory.stainedGlass[c])) + blocks * maxDyeings;
}

function summarize(colors: ColorOutcome[], plan: CraftingPlan, executions: number[]): Summary {
	const present = colors.filter((o) => o.finalGlass > 0).map((o) => o.finalGlass);
	const floor = present.length > 0 ? Math.min(...present) : null;
	const largest = present.length > 0 ? Math.max(...present) : null;
	const total = (key: keyof ColorOutcome) =>
		colors.reduce((acc, o) => acc + (o[key] as number), 0);
	return {
		variety: present.length,
		colorCount: COLOR_IDS.length,
		balanceFloor: floor,
		largest,
		spread: floor !== null && largest !== null ? largest - floor : null,
		newGlass: total('newGlass'),
		existingGlass: total('existingGlass'),
		totalFinal: total('finalGlass'),
		plainGlassUsed: plan.glass.reduce((acc, step) => acc + step.plainGlass, 0),
		dyeUnitsOnGlass: total('dyeOnGlass'),
		leftoverDye: total('leftoverDye'),
		recipeExecutions: executions.reduce((a, b) => a + b, 0)
	};
}

function leftoverNotes(problem: OptimizeProblem, colors: ColorOutcome[]): LeftoverNote[] {
	const glass = problem.recipes.stainedGlass;
	return colors
		.filter((o) => o.leftoverDye >= glass.dyeUnits)
		.map((o) => ({
			color: o.color as ColorId,
			leftover: o.leftoverDye,
			finalGlass: o.finalGlass,
			finalIfOneMore: o.finalGlass + glass.stainedGlassBlocks
		}));
}
