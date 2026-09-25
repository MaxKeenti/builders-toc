import { page, userEvent } from 'vitest/browser';
import { beforeEach, describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { inventory } from '$lib/state';
import InventorySlot from './inventory-slot.svelte';

const dyeField = () => page.getByRole('textbox', { name: 'White: Dye units' });

describe('inventory editor (InventorySlot)', () => {
	beforeEach(() => {
		inventory.reset();
		render(InventorySlot, { color: 'white' });
	});

	it('commits a typed whole number on Enter and shows its stack equivalent', async () => {
		await dyeField().fill('152');
		await userEvent.keyboard('{Enter}');
		expect(inventory.get('dye', 'white')).toBe(152);
		await expect.element(page.getByText('152 dye units · 2 stacks + 24')).toBeInTheDocument();
	});

	it('rejects non-integers with an inline explanation instead of rounding', async () => {
		await dyeField().fill('1.5');
		await userEvent.keyboard('{Enter}');
		expect(inventory.get('dye', 'white')).toBe(0);
		await expect.element(dyeField()).toHaveAttribute('aria-invalid', 'true');
		await expect
			.element(page.getByText('Enter a whole number, like 12. Items can’t be split.'))
			.toBeInTheDocument();
	});

	it('rejects negative values instead of clamping them', async () => {
		await dyeField().fill('-3');
		await userEvent.keyboard('{Enter}');
		expect(inventory.get('dye', 'white')).toBe(0);
		await expect
			.element(page.getByText('Enter 0 or more. Negative amounts aren’t possible.'))
			.toBeInTheDocument();
	});

	it('steps with the +/− buttons and the arrow keys', async () => {
		await page.getByRole('button', { name: 'Add 1 to White: Dye units' }).click();
		await page.getByRole('button', { name: 'Add 1 to White: Dye units' }).click();
		expect(inventory.get('dye', 'white')).toBe(2);
		await page.getByRole('button', { name: 'Subtract 1 from White: Dye units' }).click();
		expect(inventory.get('dye', 'white')).toBe(1);

		await dyeField().click();
		await userEvent.keyboard('{ArrowUp}');
		expect(inventory.get('dye', 'white')).toBe(2);
		await userEvent.keyboard('{Shift>}{ArrowUp}{/Shift}');
		expect(inventory.get('dye', 'white')).toBe(66);
		await userEvent.keyboard('{ArrowDown}');
		expect(inventory.get('dye', 'white')).toBe(65);
	});

	it('sets a field to 0', async () => {
		inventory.set('stainedGlass', 'white', 40);
		await page.getByRole('button', { name: 'Set White: Stained-glass blocks to 0' }).click();
		expect(inventory.get('stainedGlass', 'white')).toBe(0);
		await expect
			.element(page.getByRole('textbox', { name: 'White: Stained-glass blocks' }))
			.toHaveValue('0');
	});

	it('keeps the tab order on the fields, skipping the steppers', async () => {
		await dyeField().click();
		await userEvent.tab();
		await expect
			.element(page.getByRole('textbox', { name: 'White: Stained-glass blocks' }))
			.toHaveFocus();
	});
});
