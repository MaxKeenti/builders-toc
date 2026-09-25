import { COLOR_IDS, type ColorId } from '$lib/data/colors';
import { craftableColors } from './analysis';
import { buildFormulation, type Formulation } from './formulation';
import { Lexicographic, roundIntegral } from './lexicographic';
import { linear } from './lp-model';
import { SolverError, type MilpSolver } from './solver';
import type {
	Bottleneck,
	ColorOutcome,
	NextLevel,
	OptimizeProblem,
	ResourceIncrease,
	SmallestIncrease,
	TargetOutcome,
	UnreachableColor
} from './types';

/** Glass dyeings needed to lift a color with `existing` blocks to at least `level`. */
function dyeingsToReach(problem: OptimizeProblem, existing: number, level: number): number {
	const blocks = problem.recipes.stainedGlass.stainedGlassBlocks;
	return Math.max(0, Math.ceil((level - existing) / blocks));
}

/**
 * Why the balance floor can't go higher. Every color in the final inventory would need to reach
 * T* + 1; since S = E + 8G, its next level can be well above T* + 1. The auxiliary problem
 * adds non-negative extra starting resources and finds one smallest set that makes it feasible.
 */
export function analyzeBottleneck(
	problem: OptimizeProblem,
	colors: ColorOutcome[],
	balanceFloor: number,
	solver: MilpSolver
): Bottleneck {
	const selected = colors.filter((o) => o.finalGlass > 0);
	if (selected.length === 0) return { kind: 'none', reason: 'no-colors' };
	const glass = problem.recipes.stainedGlass;
	const nextFloor = balanceFloor + 1;
	const nextLevels: NextLevel[] = selected.map((o) => {
		const dyeings = dyeingsToReach(problem, o.existingGlass, nextFloor);
		return {
			color: o.color,
			finalGlass: o.finalGlass,
			nextLevel: o.existingGlass + dyeings * glass.stainedGlassBlocks,
			dyeOnGlass: dyeings * glass.dyeUnits
		};
	});
	const increase = smallestIncrease(
		problem,
		solver,
		nextLevels.reduce((acc, l) => acc + l.dyeOnGlass, 0),
		(f) => {
			for (const o of selected) {
				f.model.addConstraint(`next_${o.color}`, f.finalGlass(o.color), '>=', nextFloor);
			}
		}
	);
	if (!increase) throw new SolverError('No resource increase raises the balance floor');
	return { kind: 'found', balanceFloor, nextFloor, nextLevels, increase };
}

/** Which requested colors meet the target, and one smallest increase that would meet them all. */
export function analyzeTarget(
	problem: OptimizeProblem,
	colors: ColorOutcome[],
	unreachable: UnreachableColor[],
	solver: MilpSolver
): TargetOutcome {
	const { options } = problem;
	if (options.mode !== 'target') throw new Error('analyzeTarget needs target mode');
	const { target } = options;
	const requested = COLOR_IDS.filter((c) => options.targetColors.includes(c));
	const byColor = new Map(colors.map((o) => [o.color, o]));
	const met = requested.filter((c) => byColor.get(c)!.finalGlass >= target);
	const unmet = requested
		.filter((c) => !met.includes(c))
		.map((c) => ({
			color: c,
			finalGlass: byColor.get(c)!.finalGlass,
			shortfall: target - byColor.get(c)!.finalGlass,
			reachable: !unreachable.some((u) => u.color === c)
		}));
	const glass = problem.recipes.stainedGlass;
	const cap = requested.reduce(
		(acc, c) =>
			acc + dyeingsToReach(problem, problem.inventory.stainedGlass[c], target) * glass.dyeUnits,
		0
	);
	const increase =
		unmet.length === 0
			? null
			: smallestIncrease(problem, solver, cap, (f) => {
					for (const c of requested) {
						f.model.addConstraint(`target_${c}`, f.finalGlass(c), '>=', target);
					}
				});
	return { target, requested, met, unmet, increase };
}

/**
 * Finds one smallest set of extra starting resources (dye units, plus plain glass in batches of
 * one glass dyeing when it's finite) that makes `require` feasible.
 *
 * Tie-breaking (ADR 0002): fewest extra units, then fewest extra units of craftable dyes (so
 * a basic dye like Blue is preferred over Purple, which is made from it), then color order.
 *
 * Uniqueness is proven, not assumed: any other smallest solution must use less of some
 * resource r in the found set, so for each r we re-solve with that resource capped one below.
 */
export function smallestIncrease(
	problem: OptimizeProblem,
	solver: MilpSolver,
	cap: number,
	require: (f: Formulation) => void
): SmallestIncrease | null {
	const glass = problem.recipes.stainedGlass;
	const f = buildFormulation(problem, {
		extras: { cap, glassCap: Math.ceil(cap / glass.dyeUnits) }
	});
	require(f);
	const dyeVars = f.extraDyeVars!;
	const vars: { resource: ColorId | 'plain_glass'; name: string }[] = [
		...COLOR_IDS.map((c) => ({ resource: c, name: dyeVars[c] })),
		...(f.extraGlassVar ? [{ resource: 'plain_glass' as const, name: f.extraGlassVar }] : [])
	];
	const size = linear(Object.fromEntries(vars.map((v) => [v.name, 1])));

	const lex = new Lexicographic(f.model, solver);
	const smallest = lex.tryStage('size', { direction: 'minimize', expr: size });
	if (smallest === null) return null;
	const sizeFixed = f.model.clone();

	const craftable = craftableColors(problem.recipes.dyeRecipes);
	lex.minimize(
		'craftable',
		linear(Object.fromEntries(COLOR_IDS.filter((c) => craftable.has(c)).map((c) => [dyeVars[c], 1])))
	);
	lex.fixInOrder(vars.map((v) => v.name));

	const toIncreases = (values: Record<string, number>): ResourceIncrease[] =>
		vars
			.filter((v) => values[v.name] > 0)
			.map((v) => {
				const units = values[v.name];
				if (v.resource === 'plain_glass') {
					const available =
						problem.options.plainGlass.kind === 'finite' ? problem.options.plainGlass.quantity : 0;
					const extra = units * glass.plainGlass;
					return { resource: v.resource, available, required: available + extra, extra };
				}
				const available = problem.inventory.dye[v.resource];
				return { resource: v.resource, available, required: available + units, extra: units };
			});

	const chosen = lex.values;
	const alternatives: ResourceIncrease[][] = [];
	for (const v of vars.filter((v) => chosen[v.name] > 0)) {
		const model = sizeFixed.clone();
		model.setBounds(v.name, 0, chosen[v.name] - 1);
		const result = solver.solve(
			model.toLp({ direction: 'minimize', expr: size }),
			model.variableNames
		);
		if (result.status === 'optimal') alternatives.push(toIncreases(roundIntegral(result.values)));
		else if (result.status !== 'infeasible') throw new SolverError(`Uniqueness: ${result.status}`);
	}

	return {
		increases: toIncreases(chosen),
		size: smallest,
		unique: alternatives.length === 0,
		alternatives
	};
}
