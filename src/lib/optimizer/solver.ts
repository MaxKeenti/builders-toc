import type { Highs } from 'highs';

export type SolveResult =
	| { status: 'optimal'; objective: number; values: Record<string, number> }
	| { status: 'infeasible' }
	| { status: 'unbounded' };

/** Anything that can solve a CPLEX LP-format model. The engine depends only on this. */
export interface MilpSolver {
	solve(lp: string, variableNames: string[]): SolveResult;
}

export class SolverError extends Error {
	constructor(message: string) {
		super(message);
		this.name = 'SolverError';
	}
}

/**
 * Exact optimality: no relative or absolute MIP gap, so every stage optimum is proven.
 * Tolerances are tightened because big-M rows multiply them (see ADR 0002).
 */
const HIGHS_OPTIONS = {
	output_flag: false,
	mip_rel_gap: 0,
	mip_abs_gap: 0,
	mip_feasibility_tolerance: 1e-9,
	primal_feasibility_tolerance: 1e-9,
	threads: 1,
	random_seed: 0
} as const;

/** Wraps a loaded HiGHS module. Each `solve` call uses a fresh native solver instance. */
export function highsSolver(highs: Highs): MilpSolver {
	return {
		solve(lp, variableNames) {
			const result = highs.solve(lp, HIGHS_OPTIONS);
			switch (result.Status) {
				case 'Optimal': {
					const values: Record<string, number> = {};
					for (const name of variableNames) {
						const column = result.Columns[name];
						if (!column) throw new SolverError(`Solver returned no value for ${name}`);
						values[name] = column.Primal;
					}
					return { status: 'optimal', objective: result.ObjectiveValue, values };
				}
				case 'Infeasible':
					return { status: 'infeasible' };
				case 'Unbounded':
				case 'Primal infeasible or unbounded':
					return { status: 'unbounded' };
				default:
					throw new SolverError(`Solver stopped with status: ${result.Status}`);
			}
		}
	};
}
