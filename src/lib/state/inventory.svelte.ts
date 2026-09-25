import { PersistedState } from 'runed';
import { COLOR_IDS, type ColorId } from '$lib/data/colors';
import {
	defaultInventory,
	INVENTORY_KEY,
	inventorySerializer,
	sameInventory,
	type StoredInventory
} from './schema';

export type InventoryField = 'dye' | 'stainedGlass';

/** The player's starting inventory, persisted under `dye-optimizer:v1:inventory`. */
export class InventoryState {
	#store = new PersistedState<StoredInventory>(INVENTORY_KEY, defaultInventory(), {
		serializer: inventorySerializer
	});

	get(field: InventoryField, color: ColorId): number {
		return this.#store.current[field][color];
	}

	set(field: InventoryField, color: ColorId, value: number): void {
		const next = this.snapshot;
		next[field][color] = value;
		this.#store.current = next;
	}

	/** A plain copy, safe to send to the worker or compare. */
	get snapshot(): StoredInventory {
		const { dye, stainedGlass } = this.#store.current;
		return { dye: { ...dye }, stainedGlass: { ...stainedGlass } };
	}

	get isEmpty(): boolean {
		const { dye, stainedGlass } = this.#store.current;
		return COLOR_IDS.every((c) => dye[c] === 0 && stainedGlass[c] === 0);
	}

	equals(other: StoredInventory): boolean {
		return sameInventory(this.snapshot, other);
	}

	replace(inventory: StoredInventory): void {
		this.#store.current = {
			dye: { ...inventory.dye },
			stainedGlass: { ...inventory.stainedGlass }
		};
	}

	reset(): void {
		this.replace(defaultInventory());
	}
}
