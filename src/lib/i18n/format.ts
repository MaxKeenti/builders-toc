import { getLocale } from '$lib/paraglide/runtime';
import { m } from '$lib/paraglide/messages';

type Locale = ReturnType<typeof getLocale>;

/** Minecraft stack size, used only as a display equivalent. */
export const STACK_SIZE = 64;

/** The four units the UI keeps visibly distinct. */
export type CountUnit = 'dye' | 'stained-glass' | 'plain-glass' | 'executions';

/** Units that are items, so they also get a stack equivalent. */
const ITEM_UNITS: ReadonlySet<CountUnit> = new Set(['dye', 'stained-glass', 'plain-glass']);

export function formatNumber(n: number, locale: Locale = getLocale()): string {
	return new Intl.NumberFormat(locale).format(n);
}

export function stackParts(n: number): { stacks: number; remainder: number } {
	return { stacks: Math.floor(n / STACK_SIZE), remainder: n % STACK_SIZE };
}

/** "2 stacks + 24", "2 stacks", or null under one stack (the count already says it all). */
export function formatStacks(n: number, locale: Locale = getLocale()): string | null {
	const { stacks, remainder } = stackParts(n);
	if (stacks === 0) return null;
	const stacksText = formatNumber(stacks, locale);
	return remainder === 0
		? m.stacks_exact({ stacks, stacksText }, { locale })
		: m.stacks_with_remainder(
				{ stacks, stacksText, remainderText: formatNumber(remainder, locale) },
				{ locale }
			);
}

/** "152 stained-glass blocks", "1 dye unit", "4 recipe executions"… */
export function formatAmount(n: number, unit: CountUnit, locale: Locale = getLocale()): string {
	const inputs = { count: n, countText: formatNumber(n, locale) };
	switch (unit) {
		case 'dye':
			return m.unit_dye_units(inputs, { locale });
		case 'stained-glass':
			return m.unit_stained_glass_blocks(inputs, { locale });
		case 'plain-glass':
			return m.unit_plain_glass_blocks(inputs, { locale });
		case 'executions':
			return m.unit_recipe_executions(inputs, { locale });
	}
}

/** "152 stained-glass blocks · 2 stacks + 24". The one shared count formatter. */
export function formatCount(n: number, unit: CountUnit, locale: Locale = getLocale()): string {
	const amount = formatAmount(n, unit, locale);
	const stacks = ITEM_UNITS.has(unit) ? formatStacks(n, locale) : null;
	return stacks ? m.count_with_stacks({ amount, stacks }, { locale }) : amount;
}

/** "19 White Dye" */
export function formatDyeAmount(n: number, dye: string, locale: Locale = getLocale()): string {
	return m.unit_dye_of_color({ count: n, countText: formatNumber(n, locale), dye }, { locale });
}
