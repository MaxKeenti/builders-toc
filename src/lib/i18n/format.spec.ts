import { describe, expect, it } from 'vitest';
import { formatCount, formatStacks } from './format';

describe('stack formatter', () => {
	it.each([
		['en', 0, '0 stained-glass blocks'],
		['en', 1, '1 stained-glass block'],
		['en', 24, '24 stained-glass blocks'],
		['en', 64, '64 stained-glass blocks · 1 stack'],
		['en', 128, '128 stained-glass blocks · 2 stacks'],
		['en', 65, '65 stained-glass blocks · 1 stack + 1'],
		['en', 152, '152 stained-glass blocks · 2 stacks + 24'],
		['en', 1184, '1,184 stained-glass blocks · 18 stacks + 32'],
		['es', 0, '0 bloques de cristal tintado'],
		['es', 1, '1 bloque de cristal tintado'],
		['es', 24, '24 bloques de cristal tintado'],
		['es', 64, '64 bloques de cristal tintado · 1 pila'],
		['es', 128, '128 bloques de cristal tintado · 2 pilas'],
		['es', 152, '152 bloques de cristal tintado · 2 pilas + 24'],
		['es', 12_345, '12.345 bloques de cristal tintado · 192 pilas + 57']
	] as const)('%s %i → %s', (locale, n, expected) => {
		expect(formatCount(n, 'stained-glass', locale)).toBe(expected);
	});

	it('keeps the four units distinct', () => {
		expect(formatCount(1, 'dye', 'en')).toBe('1 dye unit');
		expect(formatCount(8, 'plain-glass', 'en')).toBe('8 plain glass blocks');
		expect(formatCount(4, 'executions', 'en')).toBe('4 recipe executions');
		expect(formatCount(1, 'executions', 'es')).toBe('1 ejecución de receta');
		expect(formatCount(19, 'dye', 'es')).toBe('19 unidades de tinte');
	});

	it('never shows stacks for recipe executions', () => {
		expect(formatCount(200, 'executions', 'en')).toBe('200 recipe executions');
	});

	it('handles Spanish plural categories beyond one/other', () => {
		expect(formatCount(1_000_000, 'dye', 'es')).toBe('1.000.000 unidades de tinte · 15.625 pilas');
		expect(formatStacks(64_000_000, 'es')).toBe('1.000.000 pilas');
	});
});
