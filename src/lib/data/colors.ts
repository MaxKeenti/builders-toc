/**
 * The 16 Minecraft colors, in the game's own dye order (DyeColor ids 0–15).
 *
 * `swatch` is the Java Edition dye color code, as listed in the "Color values" table of
 * https://minecraft.wiki/w/Dye. These swatches are the only literal colors allowed in the
 * codebase; render them through `common/color-swatch.svelte`, never ad hoc.
 *
 * Display names are Paraglide messages (`color_<id>`), not stored here.
 */
export const COLOR_IDS = [
	'white',
	'orange',
	'magenta',
	'light_blue',
	'yellow',
	'lime',
	'pink',
	'gray',
	'light_gray',
	'cyan',
	'purple',
	'blue',
	'brown',
	'green',
	'red',
	'black'
] as const;

export type ColorId = (typeof COLOR_IDS)[number];

export interface MinecraftColor {
	id: ColorId;
	/** Display order, 0-based. */
	order: number;
	/** Hex dye color code (Java Edition). */
	swatch: string;
}

const SWATCHES: Record<ColorId, string> = {
	white: '#F9FFFE',
	orange: '#F9801D',
	magenta: '#C74EBD',
	light_blue: '#3AB3DA',
	yellow: '#FED83D',
	lime: '#80C71F',
	pink: '#F38BAA',
	gray: '#474F52',
	light_gray: '#9D9D97',
	cyan: '#169C9C',
	purple: '#8932B8',
	blue: '#3C44AA',
	brown: '#835432',
	green: '#5E7C16',
	red: '#B02E26',
	black: '#1D1D21'
};

export const COLORS: readonly MinecraftColor[] = COLOR_IDS.map((id, order) => ({
	id,
	order,
	swatch: SWATCHES[id]
}));

export function isColorId(value: unknown): value is ColorId {
	return typeof value === 'string' && (COLOR_IDS as readonly string[]).includes(value);
}

/** A per-color count, e.g. dye units or stained-glass blocks. */
export type ColorCounts = Record<ColorId, number>;

export function emptyColorCounts(): ColorCounts {
	return Object.fromEntries(COLOR_IDS.map((id) => [id, 0])) as ColorCounts;
}
