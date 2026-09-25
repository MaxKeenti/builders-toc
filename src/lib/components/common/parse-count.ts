export type CountError = 'empty' | 'negative' | 'integer' | 'too-large' | 'minimum';

export type ParsedCount = { ok: true; value: number } | { ok: false; error: CountError };

/**
 * Parses a typed item count. Only plain non-negative integers are accepted; anything else is
 * an error to explain inline, never silently clamped or rounded.
 */
export function parseCount(text: string, min: number, max: number): ParsedCount {
	const trimmed = text.trim();
	if (trimmed === '') return { ok: false, error: 'empty' };
	if (/^-\s*\d/.test(trimmed)) return { ok: false, error: 'negative' };
	if (!/^\d+$/.test(trimmed)) return { ok: false, error: 'integer' };
	const value = Number(trimmed);
	if (!Number.isSafeInteger(value) || value > max) return { ok: false, error: 'too-large' };
	if (value < min) return { ok: false, error: 'minimum' };
	return { ok: true, value };
}
