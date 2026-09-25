import { formatAmount, formatDyeAmount, formatNumber } from '$lib/i18n/format';
import { dyeName, resourceName } from '$lib/i18n/names';
import type { Resource, ResourceIncrease } from '$lib/optimizer/types';
import { m } from '$lib/paraglide/messages';

/** "1 Blue Dye" or "8 plain glass blocks". */
export function formatResourceAmount(resource: Resource, n: number): string {
	return resource === 'plain_glass'
		? formatAmount(n, 'plain-glass')
		: formatDyeAmount(n, dyeName(resource));
}

/** "+1 Blue Dye (37 → 38)" */
export function formatIncrease(increase: ResourceIncrease): string {
	return m.bottleneck_increase_line({
		extra: formatNumber(increase.extra),
		resource: resourceName(increase.resource),
		available: formatNumber(increase.available),
		required: formatNumber(increase.required)
	});
}

export function formatIncreaseSet(increases: ResourceIncrease[]): string {
	return increases.map(formatIncrease).join(m.plan_list_separator());
}
