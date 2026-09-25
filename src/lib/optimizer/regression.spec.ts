import { beforeAll, describe, expect, it } from 'vitest';
import { RECIPE_DATA_VERSION } from '$lib/data/recipes';
import { SCREENSHOT_SAMPLE } from '$lib/data/samples';
import { optimize } from './optimize';
import { nodeSolver } from './testing/node-solver';
import { assertPlanInvariants, finalCounts, problem } from './testing/fixtures';
import type { MilpSolver } from './solver';
import type { OptimizeResult } from './types';

/**
 * LOCKED BEHAVIOR (docs/build-prompt.md §12, ADR 0003). These expectations may change only
 * with a RECIPE_DATA_VERSION bump and a note explaining which verified recipe forced it.
 */
describe('locked regression fixture: screenshot sample, Balanced', () => {
	const sample = problem(SCREENSHOT_SAMPLE.dye, SCREENSHOT_SAMPLE.stainedGlass);
	let solver: MilpSolver;
	let result: OptimizeResult;

	beforeAll(async () => {
		solver = await nodeSolver();
		result = optimize(sample, solver);
	});

	it('was computed with the locked recipe data version', () => {
		expect(RECIPE_DATA_VERSION).toBe('java-26.3 / verified 2026-09');
		expect(result.recipeDataVersion).toBe(RECIPE_DATA_VERSION);
	});

	it('reaches K = 9, T* = 152, spread = 5', () => {
		expect(result.summary.variety).toBe(9);
		expect(result.summary.balanceFloor).toBe(152);
		expect(result.summary.largest).toBe(157);
		expect(result.summary.spread).toBe(5);
	});

	it('meets all five stage optima', () => {
		expect(result.stageOptima).toEqual({
			variety: 9,
			balanceFloor: 152,
			spread: 5,
			leftoverDye: 586,
			recipeExecutions: 31,
			totalFinal: 1380
		});
	});

	it('produces the expected final inventory and totals', () => {
		expect(finalCounts(result)).toEqual({
			white: 152,
			yellow: 152,
			blue: 152,
			red: 153,
			orange: 153,
			pink: 156,
			light_blue: 152,
			purple: 157,
			magenta: 153
		});
		expect(result.summary).toMatchObject({
			newGlass: 1184,
			existingGlass: 196,
			totalFinal: 1380,
			plainGlassUsed: 1184,
			dyeUnitsOnGlass: 148
		});
		const onGlass = Object.fromEntries(
			result.colors.filter((o) => o.dyeOnGlass > 0).map((o) => [o.color, o.dyeOnGlass])
		);
		expect(onGlass).toEqual({
			white: 19,
			yellow: 19,
			blue: 19,
			red: 13,
			orange: 18,
			pink: 18,
			light_blue: 19,
			purple: 7,
			magenta: 16
		});
	});

	it('returns a valid plan', () => {
		expect(() => assertPlanInvariants(sample, result)).not.toThrow();
	});

	it('is deterministic across runs', () => {
		const again = optimize(sample, solver);
		expect(again).toEqual(result);
	});

	it('finds Blue Dye as one smallest increase (37 available, 38 required), not unique', () => {
		expect(result.bottleneck?.kind).toBe('found');
		if (result.bottleneck?.kind !== 'found') return;
		expect(result.bottleneck.nextFloor).toBe(153);
		expect(result.bottleneck.increase.increases).toEqual([
			{ resource: 'blue', available: 37, required: 38, extra: 1 }
		]);
		expect(result.bottleneck.increase.size).toBe(1);
		// One extra Purple Dye also works (3 purple executions instead of 4), so Blue is not unique.
		expect(result.bottleneck.increase.unique).toBe(false);
		expect(result.bottleneck.increase.alternatives).toContainEqual([
			{ resource: 'purple', available: 0, required: 1, extra: 1 }
		]);
	});

	it('explains the next level per color (§13)', () => {
		if (result.bottleneck?.kind !== 'found') throw new Error('expected a bottleneck');
		const levels = Object.fromEntries(
			result.bottleneck.nextLevels.map((l) => [l.color, [l.nextLevel, l.dyeOnGlass]])
		);
		expect(levels).toEqual({
			white: [160, 20],
			orange: [153, 18],
			magenta: [153, 16],
			light_blue: [160, 20],
			yellow: [160, 20],
			pink: [156, 18],
			purple: [157, 7],
			blue: [160, 20],
			red: [153, 13]
		});
	});
});
