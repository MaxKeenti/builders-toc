import { beforeAll, describe, expect, it } from 'vitest';
import { RECIPE_SET } from '$lib/data/recipes';
import { SCREENSHOT_SAMPLE } from '$lib/data/samples';
import { optimize } from './optimize';
import { nodeSolver } from './testing/node-solver';
import { assertPlanInvariants, counts, finalCounts, problem } from './testing/fixtures';
import { PlanValidationError, ProblemError, evaluatePlan } from './validate';
import type { MilpSolver } from './solver';
import type { OptimizeProblem } from './types';

let solver: MilpSolver;
beforeAll(async () => {
	solver = await nodeSolver();
});

function solve(p: OptimizeProblem) {
	const r = optimize(p, solver);
	assertPlanInvariants(p, r);
	return r;
}

describe('invariants', () => {
	/** Small deterministic PRNG so the inventories are varied but reproducible. */
	function* inventories(n: number) {
		let seed = 42;
		const next = () => (seed = (seed * 1103515245 + 12345) % 2 ** 31) / 2 ** 31;
		const colors = Object.keys(counts()) as (keyof ReturnType<typeof counts>)[];
		for (let i = 0; i < n; i++) {
			const dye: Record<string, number> = {};
			const glass: Record<string, number> = {};
			for (const c of colors) {
				if (next() < 0.4) dye[c] = Math.floor(next() * 200);
				if (next() < 0.2) glass[c] = Math.floor(next() * 100);
			}
			yield problem(dye, glass);
		}
	}

	it('conserves inventory, keeps dye non-negative, uses integers and preserves existing glass', () => {
		for (const p of inventories(12)) {
			const r = solve(p);
			for (const o of r.colors) {
				expect(o.finalGlass).toBeGreaterThanOrEqual(o.existingGlass);
				expect(o.leftoverDye).toBe(
					o.startingDye + o.producedByRecipes - o.consumedByRecipes - o.dyeOnGlass
				);
			}
		}
	});
});

describe('plain glass', () => {
	it('uses as much plain glass as needed when unlimited', () => {
		const r = solve(problem({ white: 3 }));
		expect(r.summary.plainGlassUsed).toBe(24);
	});

	it('respects a finite plain-glass limit', () => {
		const p = problem(SCREENSHOT_SAMPLE.dye, SCREENSHOT_SAMPLE.stainedGlass, {
			plainGlass: { kind: 'finite', quantity: 800 }
		});
		const r = solve(p);
		expect(r.summary.plainGlassUsed).toBeLessThanOrEqual(800);
		expect(r.summary.variety).toBe(9);
	});

	it('keeps only existing glass when there is no plain glass', () => {
		const p = problem(SCREENSHOT_SAMPLE.dye, SCREENSHOT_SAMPLE.stainedGlass, {
			plainGlass: { kind: 'finite', quantity: 0 }
		});
		const r = solve(p);
		expect(r.summary.newGlass).toBe(0);
		expect(finalCounts(r)).toEqual({ orange: 9, red: 49, purple: 101, magenta: 25, pink: 12 });
		expect(r.summary.balanceFloor).toBe(9);
		if (r.bottleneck?.kind !== 'found') throw new Error('expected a bottleneck');
		expect(r.bottleneck.increase.increases.map((i) => i.resource)).toContain('plain_glass');
	});
});

describe('recipes', () => {
	it('chains recipes: gray is crafted before the light gray that consumes it', () => {
		const r = solve(problem({ black: 2, white: 3 }));
		expect(r.summary.variety).toBe(4);
		const order = r.plan.recipes.map((s) => s.recipeId);
		expect(order).toContain('light_gray_dye_from_gray_white_dye');
		expect(order.indexOf('gray_dye')).toBeLessThan(
			order.indexOf('light_gray_dye_from_gray_white_dye')
		);
	});

	it('picks the better light gray recipe for the inventory', () => {
		const r = solve(
			problem(
				{ black: 1, white: 2 },
				{},
				{ mode: 'target', target: 24, targetColors: ['light_gray'] }
			)
		);
		expect(r.target?.met).toEqual(['light_gray']);
		expect(r.plan.recipes.map((s) => s.recipeId)).toEqual(['light_gray_dye_from_black_white_dye']);
	});

	it('picks the better magenta recipe for the inventory', () => {
		const r = solve(
			problem(
				{ blue: 1, red: 1, pink: 1 },
				{},
				{ mode: 'target', target: 24, targetColors: ['magenta'] }
			)
		);
		expect(r.target?.met).toEqual(['magenta']);
		expect(r.plan.recipes.map((s) => s.recipeId)).toEqual(['magenta_dye_from_blue_red_pink']);
	});

	it('never needs optimizer changes to use a different recipe set', () => {
		const onlyPurple = {
			...RECIPE_SET,
			dyeRecipes: RECIPE_SET.dyeRecipes.filter((r) => r.id === 'purple_dye')
		};
		const r = solve(problem({ blue: 1, red: 1 }, {}, {}, onlyPurple));
		expect(r.summary.variety).toBe(2);
	});

	it('rejects recipe data that creates dye from nothing', () => {
		const broken = {
			...RECIPE_SET,
			dyeRecipes: [{ id: 'dupe', inputs: { red: 1 }, outputs: { red: 2 }, source: 'test' }]
		};
		expect(() => optimize(problem({ red: 1 }, {}, {}, broken), solver)).toThrow(ProblemError);
	});
});

describe('edge inventories', () => {
	it('lists unreachable colors and what they are missing', () => {
		const r = solve(problem(SCREENSHOT_SAMPLE.dye, SCREENSHOT_SAMPLE.stainedGlass));
		const lime = r.unreachable.find((u) => u.color === 'lime');
		expect(lime?.recipes).toEqual([{ recipeId: 'lime_dye', missing: ['green'] }]);
		expect(r.unreachable.map((u) => u.color).sort()).toEqual(
			['black', 'brown', 'cyan', 'gray', 'green', 'light_gray', 'lime'].sort()
		);
	});

	it('handles an all-zero inventory', () => {
		const r = solve(problem({}));
		expect(r.summary).toMatchObject({ variety: 0, balanceFloor: null, spread: null, newGlass: 0 });
		expect(r.plan).toEqual({ recipes: [], glass: [] });
		expect(r.bottleneck).toEqual({ kind: 'none', reason: 'no-colors' });
	});

	it('leaves an already-balanced inventory alone', () => {
		const all64 = Object.fromEntries(Object.keys(counts()).map((c) => [c, 64]));
		const r = solve(problem({}, all64));
		expect(r.summary).toMatchObject({ variety: 16, balanceFloor: 64, spread: 0, newGlass: 0 });
		if (r.bottleneck?.kind !== 'found') throw new Error('expected a bottleneck');
		expect(r.bottleneck.nextLevels.every((l) => l.nextLevel === 72)).toBe(true);
	});

	it('balances very asymmetric inventories instead of spending everything', () => {
		const r = solve(problem({ yellow: 10_000, white: 1 }));
		expect(finalCounts(r)).toEqual({ white: 8, yellow: 8 });
		expect(r.colors.find((o) => o.color === 'yellow')?.leftoverDye).toBe(9_999);
		expect(r.leftoverNotes.find((n) => n.color === 'yellow')).toEqual({
			color: 'yellow',
			leftover: 9_999,
			finalGlass: 8,
			finalIfOneMore: 16
		});
	});

	it('rejects negative or fractional inventory', () => {
		expect(() => optimize(problem({ red: -1 }), solver)).toThrow(ProblemError);
		expect(() => optimize(problem({ red: 1.5 }), solver)).toThrow(ProblemError);
	});
});

describe('determinism', () => {
	it('returns the identical plan across runs and regardless of recipe order', () => {
		const p = problem({ white: 40, red: 30, blue: 12, black: 5, green: 9, yellow: 7 }, { cyan: 3 });
		const first = solve(p);
		expect(solve(p)).toEqual(first);
		const reversed = { ...RECIPE_SET, dyeRecipes: [...RECIPE_SET.dyeRecipes].reverse() };
		const other = solve({ ...p, recipes: reversed });
		expect(other.plan).toEqual(first.plan);
		expect(other.colors).toEqual(first.colors);
	});
});

describe('modes', () => {
	it('Maximum output spends every dye unit it can', () => {
		const r = solve(
			problem(SCREENSHOT_SAMPLE.dye, SCREENSHOT_SAMPLE.stainedGlass, { mode: 'maximum-output' })
		);
		expect(r.summary.leftoverDye).toBe(0);
		expect(r.summary.totalFinal).toBe(196 + 734 * 8);
		expect(r.summary.variety).toBe(9);
		expect(r.bottleneck).toBeNull();
	});

	it('Maximum output is capped by finite plain glass', () => {
		const r = solve(
			problem(
				{ white: 100 },
				{},
				{ mode: 'maximum-output', plainGlass: { kind: 'finite', quantity: 83 } }
			)
		);
		expect(r.summary.newGlass).toBe(80);
	});

	it('Target reports met and unmet colors and one smallest increase', () => {
		const r = solve(
			problem(SCREENSHOT_SAMPLE.dye, SCREENSHOT_SAMPLE.stainedGlass, {
				mode: 'target',
				target: 64,
				targetColors: ['white', 'blue', 'lime']
			})
		);
		expect(r.target?.met).toEqual(['white', 'blue']);
		expect(r.target?.unmet).toEqual([
			{ color: 'lime', finalGlass: 0, shortfall: 64, reachable: false }
		]);
		// 4 Green Dye + 4 White Dye → 8 Lime Dye → 64 blocks; basic Green beats 8 craftable Lime.
		expect(r.target?.increase?.increases).toEqual([
			{ resource: 'green', available: 0, required: 4, extra: 4 }
		]);
		// Target doesn't spend dye beyond what the targets need.
		expect(finalCounts(r)).toMatchObject({ white: 64, blue: 64 });
		expect(r.bottleneck).toBeNull();
	});
});

describe('bottleneck', () => {
	it('proves uniqueness when only one smallest increase exists', () => {
		const r = solve(problem({ white: 8 }));
		if (r.bottleneck?.kind !== 'found') throw new Error('expected a bottleneck');
		expect(r.bottleneck.increase).toEqual({
			increases: [{ resource: 'white', available: 8, required: 9, extra: 1 }],
			size: 1,
			unique: true,
			alternatives: []
		});
	});

	it('does not claim uniqueness when several smallest increases exist', () => {
		// 1 Purple Dye makes 8 blocks; 16 need 2. Either +1 Red (Blue + Red → 2 Purple) or
		// +1 Purple fixes it. Red is basic, so it's reported first; Purple is an alternative.
		const r = solve(
			problem({ blue: 1, purple: 1 }, {}, { mode: 'target', target: 16, targetColors: ['purple'] })
		);
		expect(r.target?.unmet).toEqual([
			{ color: 'purple', finalGlass: 8, shortfall: 8, reachable: true }
		]);
		expect(r.target?.increase).toEqual({
			increases: [{ resource: 'red', available: 0, required: 1, extra: 1 }],
			size: 1,
			unique: false,
			alternatives: [[{ resource: 'purple', available: 1, required: 2, extra: 1 }]]
		});
	});
});

describe('evaluatePlan', () => {
	const p = problem({ red: 1, white: 1 });
	const pink = RECIPE_SET.dyeRecipes.findIndex((r) => r.id === 'pink_dye_from_red_white_dye');
	const none = RECIPE_SET.dyeRecipes.map(() => 0);

	it('rejects plans that would need negative dye', () => {
		const twice = none.map((_, i) => (i === pink ? 2 : 0));
		expect(() => evaluatePlan(p, twice, counts())).toThrow(PlanValidationError);
		expect(() => evaluatePlan(p, none, counts({ red: 2 }))).toThrow(PlanValidationError);
	});

	it('rejects fractional or negative quantities', () => {
		expect(() => evaluatePlan(p, none, counts({ red: 0.5 }))).toThrow(PlanValidationError);
		expect(() => evaluatePlan(p, none, counts({ red: -1 }))).toThrow(PlanValidationError);
	});

	it('rejects plans over the plain-glass limit', () => {
		const limited = problem({ red: 2 }, {}, { plainGlass: { kind: 'finite', quantity: 8 } });
		expect(() => evaluatePlan(limited, none, counts({ red: 2 }))).toThrow(PlanValidationError);
	});
});
