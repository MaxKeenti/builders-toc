import type { ColorId } from './colors';

/**
 * Identifies the verified recipe dataset. Bump it whenever a recipe is added, removed or
 * changed, and record why in docs/adr (see ADR 0003).
 */
export const RECIPE_DATA_VERSION = 'java-26.3 / verified 2026-09';

/** Every recipe here was checked against the vanilla data pack of this release. */
const SOURCE_BASE = 'https://github.com/misode/mcmeta/blob/26.3-data/data/minecraft/recipe';

/**
 * A dye-mixing recipe: dye units in, dye units out. Only dye-to-dye recipes are modeled
 * (no flowers, ink sacs, lapis, bone meal, smelting…).
 *
 * `id` is the vanilla recipe file name. Its display name is the Paraglide message
 * `recipe_<id>`.
 */
export interface Recipe {
	id: string;
	inputs: Partial<Record<ColorId, number>>;
	outputs: Partial<Record<ColorId, number>>;
	/** URL of the vanilla recipe file it was verified against. */
	source: string;
}

/**
 * Glass dyeing: 8 plain glass around 1 dye unit gives 8 stained-glass blocks of that color.
 * Same shape for all 16 colors, e.g. `white_stained_glass.json`.
 */
export interface StainedGlassRecipe {
	dyeUnits: number;
	plainGlass: number;
	stainedGlassBlocks: number;
	source: string;
}

export interface RecipeSet {
	version: string;
	dyeRecipes: readonly Recipe[];
	stainedGlass: StainedGlassRecipe;
}

function source(id: string): string {
	return `${SOURCE_BASE}/${id}.json`;
}

export const DYE_RECIPES: readonly Recipe[] = [
	{
		id: 'cyan_dye',
		inputs: { blue: 1, green: 1 },
		outputs: { cyan: 2 },
		source: source('cyan_dye')
	},
	{
		id: 'gray_dye',
		inputs: { black: 1, white: 1 },
		outputs: { gray: 2 },
		source: source('gray_dye')
	},
	{
		id: 'light_blue_dye_from_blue_white_dye',
		inputs: { blue: 1, white: 1 },
		outputs: { light_blue: 2 },
		source: source('light_blue_dye_from_blue_white_dye')
	},
	{
		id: 'light_gray_dye_from_black_white_dye',
		inputs: { black: 1, white: 2 },
		outputs: { light_gray: 3 },
		source: source('light_gray_dye_from_black_white_dye')
	},
	{
		id: 'light_gray_dye_from_gray_white_dye',
		inputs: { gray: 1, white: 1 },
		outputs: { light_gray: 2 },
		source: source('light_gray_dye_from_gray_white_dye')
	},
	{
		id: 'lime_dye',
		inputs: { green: 1, white: 1 },
		outputs: { lime: 2 },
		source: source('lime_dye')
	},
	{
		id: 'magenta_dye_from_blue_red_pink',
		inputs: { blue: 1, red: 1, pink: 1 },
		outputs: { magenta: 3 },
		source: source('magenta_dye_from_blue_red_pink')
	},
	{
		id: 'magenta_dye_from_blue_red_white_dye',
		inputs: { blue: 1, red: 2, white: 1 },
		outputs: { magenta: 4 },
		source: source('magenta_dye_from_blue_red_white_dye')
	},
	{
		id: 'magenta_dye_from_purple_and_pink',
		inputs: { purple: 1, pink: 1 },
		outputs: { magenta: 2 },
		source: source('magenta_dye_from_purple_and_pink')
	},
	{
		id: 'orange_dye_from_red_yellow',
		inputs: { red: 1, yellow: 1 },
		outputs: { orange: 2 },
		source: source('orange_dye_from_red_yellow')
	},
	{
		id: 'pink_dye_from_red_white_dye',
		inputs: { red: 1, white: 1 },
		outputs: { pink: 2 },
		source: source('pink_dye_from_red_white_dye')
	},
	{
		id: 'purple_dye',
		inputs: { blue: 1, red: 1 },
		outputs: { purple: 2 },
		source: source('purple_dye')
	}
];

export const STAINED_GLASS_RECIPE: StainedGlassRecipe = {
	dyeUnits: 1,
	plainGlass: 8,
	stainedGlassBlocks: 8,
	source: source('white_stained_glass')
};

export const RECIPE_SET: RecipeSet = {
	version: RECIPE_DATA_VERSION,
	dyeRecipes: DYE_RECIPES,
	stainedGlass: STAINED_GLASS_RECIPE
};
