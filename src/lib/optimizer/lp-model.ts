/**
 * A small mixed-integer linear model, serialized to CPLEX LP text for the solver.
 * Keeping our own representation lets the engine stay solver-agnostic and testable.
 */

export type Terms = Record<string, number>;

/** `Σ terms + constant`. */
export interface LinearExpr {
	terms: Terms;
	constant: number;
}

export type VarKind = 'continuous' | 'integer' | 'binary';
export type Sense = '<=' | '>=' | '=';

interface Variable {
	kind: VarKind;
	lower: number;
	upper: number;
}

interface Constraint {
	name: string;
	terms: Terms;
	sense: Sense;
	rhs: number;
}

export interface Objective {
	direction: 'maximize' | 'minimize';
	expr: LinearExpr;
}

export function linear(terms: Terms = {}, constant = 0): LinearExpr {
	return { terms: { ...terms }, constant };
}

export function sum(...exprs: LinearExpr[]): LinearExpr {
	const result = linear();
	for (const e of exprs) {
		result.constant += e.constant;
		for (const [name, coef] of Object.entries(e.terms)) {
			result.terms[name] = (result.terms[name] ?? 0) + coef;
		}
	}
	return result;
}

export function scale(e: LinearExpr, factor: number): LinearExpr {
	return linear(
		Object.fromEntries(Object.entries(e.terms).map(([name, coef]) => [name, coef * factor])),
		e.constant * factor
	);
}

/** Evaluates an expression against solver values (already rounded to integers). */
export function evaluate(e: LinearExpr, values: Record<string, number>): number {
	let total = e.constant;
	for (const [name, coef] of Object.entries(e.terms)) total += coef * (values[name] ?? 0);
	return total;
}

export class LpModel {
	#vars = new Map<string, Variable>();
	#constraints: Constraint[] = [];

	addVar(name: string, kind: VarKind, lower = 0, upper = Infinity): string {
		if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(name)) throw new Error(`Invalid variable name: ${name}`);
		if (this.#vars.has(name)) throw new Error(`Duplicate variable: ${name}`);
		this.#vars.set(name, { kind, lower, upper: kind === 'binary' ? Math.min(upper, 1) : upper });
		return name;
	}

	hasVar(name: string): boolean {
		return this.#vars.has(name);
	}

	get variableNames(): string[] {
		return [...this.#vars.keys()];
	}

	/** Adds `expr sense rhs`. The expression's constant is moved to the right-hand side. */
	addConstraint(name: string, expr: LinearExpr, sense: Sense, rhs = 0): void {
		const terms = Object.fromEntries(Object.entries(expr.terms).filter(([, coef]) => coef !== 0));
		for (const v of Object.keys(terms)) {
			if (!this.#vars.has(v)) throw new Error(`Unknown variable in ${name}: ${v}`);
		}
		const bound = rhs - expr.constant;
		if (Object.keys(terms).length === 0) {
			const ok = sense === '<=' ? 0 <= bound : sense === '>=' ? 0 >= bound : bound === 0;
			if (!ok) throw new InfeasibleConstantError(name);
			return;
		}
		this.#constraints.push({ name, terms, sense, rhs: bound });
	}

	/** Changes a variable's bounds, e.g. to fix a stage optimum. */
	setBounds(name: string, lower: number, upper: number): void {
		const v = this.#vars.get(name);
		if (!v) throw new Error(`Unknown variable: ${name}`);
		v.lower = lower;
		v.upper = upper;
	}

	clone(): LpModel {
		const copy = new LpModel();
		for (const [name, v] of this.#vars) copy.#vars.set(name, { ...v });
		copy.#constraints = this.#constraints.map((c) => ({ ...c, terms: { ...c.terms } }));
		return copy;
	}

	/** Returns the same model with every variable relaxed to continuous. */
	relaxed(): LpModel {
		const copy = this.clone();
		for (const v of copy.#vars.values()) v.kind = 'continuous';
		return copy;
	}

	toLp(objective: Objective): string {
		const names = this.variableNames;
		if (names.length === 0) throw new Error('Model has no variables');
		const lines: string[] = [];
		lines.push(objective.direction === 'maximize' ? 'Maximize' : 'Minimize');
		const objTerms = Object.entries(objective.expr.terms).filter(([, c]) => c !== 0);
		lines.push(
			` obj: ${objTerms.length > 0 ? formatTerms(Object.fromEntries(objTerms)) : `0 ${names[0]}`}`
		);
		lines.push('Subject To');
		for (const c of this.#constraints) {
			lines.push(` ${c.name}: ${formatTerms(c.terms)} ${c.sense} ${formatNumber(c.rhs)}`);
		}
		lines.push('Bounds');
		for (const [name, v] of this.#vars) {
			if (v.kind === 'binary') continue;
			const upper = v.upper === Infinity ? '+inf' : formatNumber(v.upper);
			lines.push(` ${formatNumber(v.lower)} <= ${name} <= ${upper}`);
		}
		const generals = names.filter((n) => this.#vars.get(n)!.kind === 'integer');
		const binaries = names.filter((n) => this.#vars.get(n)!.kind === 'binary');
		if (generals.length > 0) lines.push('Generals', ...chunk(generals));
		if (binaries.length > 0) lines.push('Binaries', ...chunk(binaries));
		lines.push('End');
		return lines.join('\n');
	}
}

export class InfeasibleConstantError extends Error {
	constructor(constraint: string) {
		super(`Constraint ${constraint} has no variables and is never satisfied`);
		this.name = 'InfeasibleConstantError';
	}
}

function formatNumber(n: number): string {
	if (!Number.isFinite(n)) throw new Error(`Non-finite coefficient: ${n}`);
	return String(n);
}

/** One term per 8 on a line keeps LP lines short; continuation lines are valid LP. */
function formatTerms(terms: Terms): string {
	const parts = Object.entries(terms).map(([name, coef], i) => {
		const sign = coef < 0 ? '-' : i === 0 ? '' : '+';
		return `${sign} ${formatNumber(Math.abs(coef))} ${name}`.trim();
	});
	const rows: string[] = [];
	for (let i = 0; i < parts.length; i += 8) rows.push(parts.slice(i, i + 8).join(' '));
	return rows.join('\n   ');
}

function chunk(names: string[]): string[] {
	const rows: string[] = [];
	for (let i = 0; i < names.length; i += 10) rows.push(` ${names.slice(i, i + 10).join(' ')}`);
	return rows;
}
