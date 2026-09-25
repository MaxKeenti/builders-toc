import { describe, expect, it } from 'vitest';
import en from '../../../messages/en.json';
import es from '../../../messages/es.json';
import { RECIPE_NAMES } from '$lib/i18n/names';
import { COLOR_IDS, COLORS } from './colors';
import { DYE_RECIPES, RECIPE_DATA_VERSION, STAINED_GLASS_RECIPE } from './recipes';

describe('recipe data', () => {
	it('cites a pinned vanilla source for every recipe', () => {
		for (const r of [...DYE_RECIPES, STAINED_GLASS_RECIPE]) {
			expect(r.source).toMatch(/^https:\/\/github\.com\/misode\/mcmeta\/blob\/26\.3-data\//);
		}
		expect(RECIPE_DATA_VERSION).toContain('26.3');
	});

	it('only mixes dyes into dyes, with unique ids', () => {
		expect(new Set(DYE_RECIPES.map((r) => r.id)).size).toBe(DYE_RECIPES.length);
		for (const r of DYE_RECIPES) {
			for (const item of [...Object.keys(r.inputs), ...Object.keys(r.outputs)]) {
				expect(COLOR_IDS).toContain(item);
			}
		}
	});

	it('includes every alternative magenta and light gray recipe', () => {
		const producing = (c: string) => DYE_RECIPES.filter((r) => c in r.outputs).map((r) => r.id);
		expect(producing('magenta')).toHaveLength(3);
		expect(producing('light_gray')).toHaveLength(2);
	});

	it('has a display name for every recipe', () => {
		for (const r of DYE_RECIPES) expect(RECIPE_NAMES[r.id]).toBeTypeOf('function');
	});

	it('has 16 colors, each with a hex swatch', () => {
		expect(COLORS).toHaveLength(16);
		for (const c of COLORS) expect(c.swatch).toMatch(/^#[0-9A-F]{6}$/);
	});
});

describe('messages', () => {
	it('defines every message in both locales', () => {
		expect(Object.keys(es).sort()).toEqual(Object.keys(en).sort());
	});
});
