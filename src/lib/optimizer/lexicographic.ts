import { evaluate, type LinearExpr, type LpModel, type Objective } from './lp-model';
import { SolverError, type MilpSolver } from './solver';

/** How far a solver value may sit from an integer before it's rejected. */
const INTEGRALITY_TOLERANCE = 1e-6;

export function roundIntegral(values: Record<string, number>): Record<string, number> {
	const rounded: Record<string, number> = {};
	for (const [name, v] of Object.entries(values)) {
		const r = Math.round(v);
		if (Math.abs(v - r) > INTEGRALITY_TOLERANCE) {
			throw new SolverError(`Non-integral value for ${name}: ${v}`);
		}
		rounded[name] = r === 0 ? 0 : r;
	}
	return rounded;
}

/**
 * Lexicographic optimization: each stage solves one objective, then fixes its optimum as a
 * constraint before the next stage. Every objective is an integer combination of integer
 * variables, so the fixed value is exact.
 */
export class Lexicographic {
	#values: Record<string, number> | null = null;

	constructor(
		readonly model: LpModel,
		readonly solver: MilpSolver
	) {}

	/** Rounded values from the most recent solve. */
	get values(): Record<string, number> {
		if (!this.#values) throw new SolverError('No stage has been solved');
		return this.#values;
	}

	/** Solves one stage. Returns null when the model is infeasible. */
	tryStage(name: string, objective: Objective): number | null {
		const result = this.solver.solve(this.model.toLp(objective), this.model.variableNames);
		if (result.status === 'infeasible') return null;
		if (result.status !== 'optimal') throw new SolverError(`Stage ${name}: ${result.status}`);
		this.#values = roundIntegral(result.values);
		const value = evaluate(objective.expr, this.#values);
		this.model.addConstraint(
			`fix_${name}`,
			objective.expr,
			objective.direction === 'maximize' ? '>=' : '<=',
			value
		);
		return value;
	}

	stage(name: string, objective: Objective): number {
		const value = this.tryStage(name, objective);
		if (value === null) throw new SolverError(`Stage ${name} is infeasible`);
		return value;
	}

	maximize(name: string, expr: LinearExpr): number {
		return this.stage(name, { direction: 'maximize', expr });
	}

	minimize(name: string, expr: LinearExpr): number {
		return this.stage(name, { direction: 'minimize', expr });
	}

	/**
	 * Deterministic tie-breaking: minimizes each variable in the given order and fixes it.
	 * A variable already at 0 in the current solution is fixed without a solve.
	 */
	fixInOrder(variables: string[]): void {
		for (const name of variables) {
			let value = this.values[name];
			if (value !== 0) {
				value = this.stage(`min_${name}`, { direction: 'minimize', expr: { terms: { [name]: 1 }, constant: 0 } });
			}
			this.model.setBounds(name, value, value);
		}
	}
}
