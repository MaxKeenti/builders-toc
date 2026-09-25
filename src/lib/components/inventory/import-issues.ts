import { MAX_COUNT } from '$lib/optimizer/validate';
import { m } from '$lib/paraglide/messages';
import { RECIPE_DATA_VERSION } from '$lib/data/recipes';
import { formatNumber } from '$lib/i18n/format';
import { SCHEMA_VERSION, type ImportIssue } from '$lib/state/schema';

/** Localized explanation for one import problem. */
export function describeIssue(issue: ImportIssue): string {
	switch (issue.code) {
		case 'json':
			return m.import_error_json();
		case 'shape':
			return m.import_error_shape();
		case 'schema-version':
			return m.import_error_schema_version({
				version: String(issue.value),
				expected: String(SCHEMA_VERSION)
			});
		case 'recipe-version':
			return m.import_error_recipe_version({
				version: String(issue.value),
				expected: RECIPE_DATA_VERSION
			});
		case 'unknown-color':
			return m.import_error_unknown_color({ color: issue.color, path: issue.path });
		case 'count':
			return m.import_error_count({
				path: issue.path,
				max: formatNumber(MAX_COUNT),
				value: JSON.stringify(issue.value) ?? 'undefined'
			});
		case 'missing':
			return m.import_error_missing({ path: issue.path });
		case 'invalid':
			return m.import_error_invalid({
				path: issue.path,
				value: JSON.stringify(issue.value) ?? 'undefined'
			});
	}
}

/** The first few issues, then "…and N more", for a toast description. */
export function summarizeIssues(issues: ImportIssue[], shown = 3): string {
	const lines = issues.slice(0, shown).map(describeIssue);
	const rest = issues.length - shown;
	if (rest > 0) lines.push(m.import_more_errors({ count: rest, countText: formatNumber(rest) }));
	return lines.join('\n');
}
