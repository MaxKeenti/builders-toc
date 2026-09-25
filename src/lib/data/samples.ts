import { emptyColorCounts, type ColorCounts } from './colors';

/** A starting inventory: dye units (D) and existing stained-glass blocks (E) per color. */
export interface SampleInventory {
	id: string;
	dye: ColorCounts;
	stainedGlass: ColorCounts;
	/** `null` means unlimited plain glass. */
	plainGlass: number | null;
}

/**
 * The built-in sample, taken from a player's screenshot. It's editable in the UI, but it's
 * also the locked regression fixture: its Balanced optimum (K = 9, T* = 152, spread = 5,
 * Blue Dye bottleneck at 37 available / 38 required) may only change with a
 * RECIPE_DATA_VERSION bump and a note in ADR 0003 and the README.
 */
export const SCREENSHOT_SAMPLE: SampleInventory = {
	id: 'screenshot',
	dye: { ...emptyColorCounts(), white: 144, yellow: 491, blue: 37, red: 52, orange: 10 },
	stainedGlass: {
		...emptyColorCounts(),
		orange: 9,
		red: 49,
		purple: 101,
		magenta: 25,
		pink: 12
	},
	plainGlass: null
};
