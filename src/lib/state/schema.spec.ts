import { describe, expect, it } from 'vitest';
import { RECIPE_DATA_VERSION } from '$lib/data/recipes';
import { SCREENSHOT_SAMPLE } from '$lib/data/samples';
import {
	defaultOptions,
	inventorySerializer,
	parseExportFile,
	toExportFile,
	type ExportFile
} from './schema';

const sample = { dye: SCREENSHOT_SAMPLE.dye, stainedGlass: SCREENSHOT_SAMPLE.stainedGlass };
const valid = (): ExportFile => toExportFile(sample, defaultOptions());
// Tests poke at arbitrary JSON paths, including invalid ones.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type LooseJson = Record<string, any>;
const withChange = (change: (f: LooseJson) => void) => {
	const file = structuredClone(valid()) as unknown as LooseJson;
	change(file);
	return JSON.stringify(file);
};

describe('JSON import validation', () => {
	it('accepts a valid export and round-trips it', () => {
		const result = parseExportFile(JSON.stringify(valid()));
		expect(result).toEqual({ ok: true, value: valid() });
		expect(valid().recipeDataVersion).toBe(RECIPE_DATA_VERSION);
	});

	it('treats missing colors as 0', () => {
		const result = parseExportFile(withChange((f) => (f.inventory.dye = { red: 3 })));
		expect(result.ok && result.value.inventory.dye.red).toBe(3);
		expect(result.ok && result.value.inventory.dye.white).toBe(0);
	});

	it('rejects negative counts', () => {
		const result = parseExportFile(withChange((f) => (f.inventory.dye.red = -1)));
		expect(result).toEqual({
			ok: false,
			issues: [{ code: 'count', path: 'inventory.dye.red', value: -1 }]
		});
	});

	it('rejects non-integer counts', () => {
		const result = parseExportFile(withChange((f) => (f.inventory.stainedGlass.blue = 2.5)));
		expect(result).toEqual({
			ok: false,
			issues: [{ code: 'count', path: 'inventory.stainedGlass.blue', value: 2.5 }]
		});
		expect(parseExportFile(withChange((f) => (f.inventory.dye.red = '3'))).ok).toBe(false);
	});

	it('rejects unknown colors', () => {
		const result = parseExportFile(withChange((f) => (f.inventory.dye.teal = 1)));
		expect(result).toEqual({
			ok: false,
			issues: [{ code: 'unknown-color', path: 'inventory.dye', color: 'teal' }]
		});
	});

	it('rejects unsupported schema and recipe data versions', () => {
		expect(parseExportFile(withChange((f) => (f.schemaVersion = 2)))).toEqual({
			ok: false,
			issues: [{ code: 'schema-version', value: 2 }]
		});
		expect(parseExportFile(withChange((f) => (f.recipeDataVersion = 'java-1.12')))).toEqual({
			ok: false,
			issues: [{ code: 'recipe-version', value: 'java-1.12' }]
		});
	});

	it('rejects invalid JSON and foreign files', () => {
		expect(parseExportFile('{nope')).toEqual({ ok: false, issues: [{ code: 'json' }] });
		expect(parseExportFile('[1,2]')).toEqual({ ok: false, issues: [{ code: 'shape' }] });
	});

	it('reports every problem at once, and never returns a partial value', () => {
		const result = parseExportFile(
			withChange((f) => {
				f.inventory.dye.red = -1;
				f.options.mode = 'fastest';
			})
		);
		expect(result.ok).toBe(false);
		expect(!result.ok && result.issues).toHaveLength(2);
		expect('value' in result).toBe(false);
	});
});

describe('storage serializers', () => {
	it('fall back to defaults for unreadable stored data', () => {
		expect(inventorySerializer.deserialize('{"dye":{"red":-4}}').dye.red).toBe(0);
		expect(inventorySerializer.deserialize('garbage').dye.red).toBe(0);
	});
});
