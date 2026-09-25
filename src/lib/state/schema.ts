import {
	COLOR_IDS,
	emptyColorCounts,
	isColorId,
	type ColorCounts,
	type ColorId
} from '$lib/data/colors';
import { RECIPE_DATA_VERSION } from '$lib/data/recipes';
import { MAX_COUNT } from '$lib/optimizer/validate';
import type { Mode } from '$lib/optimizer/types';

/**
 * Persistence and import/export shapes (ADR 0004). Pure TypeScript so it can be tested in node.
 * A breaking change to these shapes bumps SCHEMA_VERSION and the storage keys.
 */
export const SCHEMA_VERSION = 1;
export const INVENTORY_KEY = `dye-optimizer:v${SCHEMA_VERSION}:inventory`;
export const OPTIONS_KEY = `dye-optimizer:v${SCHEMA_VERSION}:options`;

/** Recipe data versions an import may come from. Add older ones here when bumping the data. */
export const SUPPORTED_RECIPE_DATA_VERSIONS: readonly string[] = [RECIPE_DATA_VERSION];

export const MODES: readonly Mode[] = ['balanced', 'maximum-output', 'target'];

export interface StoredInventory {
	dye: ColorCounts;
	stainedGlass: ColorCounts;
}

export interface StoredOptions {
	mode: Mode;
	/** Plain glass: unlimited, or `plainGlassQuantity` blocks. */
	plainGlassUnlimited: boolean;
	plainGlassQuantity: number;
	target: number;
	targetColors: ColorId[];
}

export interface ExportFile {
	schemaVersion: number;
	recipeDataVersion: string;
	inventory: StoredInventory;
	options: StoredOptions;
}

export function defaultInventory(): StoredInventory {
	return { dye: emptyColorCounts(), stainedGlass: emptyColorCounts() };
}

export function defaultOptions(): StoredOptions {
	return {
		mode: 'balanced',
		plainGlassUnlimited: true,
		plainGlassQuantity: 1024,
		target: 64,
		targetColors: [...COLOR_IDS]
	};
}

export type ImportIssue =
	| { code: 'json' }
	| { code: 'shape' }
	| { code: 'schema-version'; value: unknown }
	| { code: 'recipe-version'; value: unknown }
	| { code: 'unknown-color'; path: string; color: string }
	| { code: 'count'; path: string; value: unknown }
	| { code: 'missing'; path: string }
	| { code: 'invalid'; path: string; value: unknown };

export type ParseResult<T> = { ok: true; value: T } | { ok: false; issues: ImportIssue[] };

const isRecord = (v: unknown): v is Record<string, unknown> =>
	typeof v === 'object' && v !== null && !Array.isArray(v);

const isCount = (v: unknown): v is number =>
	typeof v === 'number' && Number.isSafeInteger(v) && v >= 0 && v <= MAX_COUNT;

/** Missing colors count as 0; unknown colors and invalid counts are errors. */
function parseCounts(value: unknown, path: string, issues: ImportIssue[]): ColorCounts {
	const counts = emptyColorCounts();
	if (!isRecord(value)) {
		issues.push(value === undefined ? { code: 'missing', path } : { code: 'invalid', path, value });
		return counts;
	}
	for (const [key, v] of Object.entries(value)) {
		if (!isColorId(key)) issues.push({ code: 'unknown-color', path, color: key });
		else if (!isCount(v)) issues.push({ code: 'count', path: `${path}.${key}`, value: v });
		else counts[key] = v;
	}
	return counts;
}

export function parseInventory(
	value: unknown,
	path: string,
	issues: ImportIssue[]
): StoredInventory {
	if (!isRecord(value)) {
		issues.push(value === undefined ? { code: 'missing', path } : { code: 'invalid', path, value });
		return defaultInventory();
	}
	return {
		dye: parseCounts(value.dye, `${path}.dye`, issues),
		stainedGlass: parseCounts(value.stainedGlass, `${path}.stainedGlass`, issues)
	};
}

export function parseOptions(value: unknown, path: string, issues: ImportIssue[]): StoredOptions {
	const options = defaultOptions();
	if (!isRecord(value)) {
		issues.push(value === undefined ? { code: 'missing', path } : { code: 'invalid', path, value });
		return options;
	}
	if (MODES.includes(value.mode as Mode)) options.mode = value.mode as Mode;
	else issues.push({ code: 'invalid', path: `${path}.mode`, value: value.mode });

	if (typeof value.plainGlassUnlimited === 'boolean') {
		options.plainGlassUnlimited = value.plainGlassUnlimited;
	} else {
		issues.push({
			code: 'invalid',
			path: `${path}.plainGlassUnlimited`,
			value: value.plainGlassUnlimited
		});
	}
	for (const key of ['plainGlassQuantity', 'target'] as const) {
		if (isCount(value[key])) options[key] = value[key];
		else issues.push({ code: 'count', path: `${path}.${key}`, value: value[key] });
	}
	if (options.target < 1) issues.push({ code: 'count', path: `${path}.target`, value: 0 });

	if (Array.isArray(value.targetColors)) {
		const colors: ColorId[] = [];
		for (const c of value.targetColors) {
			if (!isColorId(c)) {
				issues.push({ code: 'unknown-color', path: `${path}.targetColors`, color: String(c) });
			} else if (!colors.includes(c)) colors.push(c);
		}
		options.targetColors = COLOR_IDS.filter((c) => colors.includes(c));
	} else {
		issues.push({ code: 'invalid', path: `${path}.targetColors`, value: value.targetColors });
	}
	return options;
}

/**
 * Validates an import file. Anything invalid rejects the whole file: the caller applies
 * `value` only when `ok` is true, so a file is never partially applied.
 */
export function parseExportFile(text: string): ParseResult<ExportFile> {
	let data: unknown;
	try {
		data = JSON.parse(text);
	} catch {
		return { ok: false, issues: [{ code: 'json' }] };
	}
	if (!isRecord(data) || !('schemaVersion' in data)) {
		return { ok: false, issues: [{ code: 'shape' }] };
	}
	if (data.schemaVersion !== SCHEMA_VERSION) {
		return { ok: false, issues: [{ code: 'schema-version', value: data.schemaVersion }] };
	}
	const issues: ImportIssue[] = [];
	if (
		typeof data.recipeDataVersion !== 'string' ||
		!SUPPORTED_RECIPE_DATA_VERSIONS.includes(data.recipeDataVersion)
	) {
		issues.push({ code: 'recipe-version', value: data.recipeDataVersion });
	}
	const inventory = parseInventory(data.inventory, 'inventory', issues);
	const options = parseOptions(data.options, 'options', issues);
	if (issues.length > 0) return { ok: false, issues };
	return {
		ok: true,
		value: {
			schemaVersion: SCHEMA_VERSION,
			recipeDataVersion: data.recipeDataVersion as string,
			inventory,
			options
		}
	};
}

export function toExportFile(inventory: StoredInventory, options: StoredOptions): ExportFile {
	return {
		schemaVersion: SCHEMA_VERSION,
		recipeDataVersion: RECIPE_DATA_VERSION,
		inventory: structuredClone(inventory),
		options: structuredClone(options)
	};
}

/** Storage serializers: anything unreadable in localStorage falls back to the defaults. */
export const inventorySerializer = {
	serialize: (v: StoredInventory) => JSON.stringify(v),
	deserialize: (text: string): StoredInventory => {
		const issues: ImportIssue[] = [];
		let data: unknown;
		try {
			data = JSON.parse(text);
		} catch {
			return defaultInventory();
		}
		const value = parseInventory(data, 'inventory', issues);
		return issues.length === 0 ? value : defaultInventory();
	}
};

export const optionsSerializer = {
	serialize: (v: StoredOptions) => JSON.stringify(v),
	deserialize: (text: string): StoredOptions => {
		const issues: ImportIssue[] = [];
		let data: unknown;
		try {
			data = JSON.parse(text);
		} catch {
			return defaultOptions();
		}
		const value = parseOptions(data, 'options', issues);
		return issues.length === 0 ? value : defaultOptions();
	}
};

export function sameInventory(a: StoredInventory, b: StoredInventory): boolean {
	return COLOR_IDS.every((c) => a.dye[c] === b.dye[c] && a.stainedGlass[c] === b.stainedGlass[c]);
}
