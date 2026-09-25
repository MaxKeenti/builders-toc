import type { ColorCounts, ColorId } from '$lib/data/colors';
import { formatDyeAmount } from '$lib/i18n/format';
import { dyeName } from '$lib/i18n/names';
import { m } from '$lib/paraglide/messages';

/** "4 Red Dye + 4 Yellow Dye" from a partial count map, in the recipe's own order. */
export function formatDyeList(items: Partial<ColorCounts>): string {
	return (Object.entries(items) as [ColorId, number][])
		.map(([color, n]) => formatDyeAmount(n, dyeName(color)))
		.join(m.plan_list_separator());
}

/** "4 Red Dye + 4 Yellow Dye → 8 Orange Dye" */
export function formatRecipeIo(
	inputs: Partial<ColorCounts>,
	outputs: Partial<ColorCounts>
): string {
	return m.plan_recipe_io({ inputs: formatDyeList(inputs), outputs: formatDyeList(outputs) });
}
