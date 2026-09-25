import { PersistedState } from 'runed';
import { COLOR_IDS, type ColorId } from '$lib/data/colors';
import type { Mode } from '$lib/optimizer/types';
import { defaultOptions, OPTIONS_KEY, optionsSerializer, type StoredOptions } from './schema';

/** Optimization options, persisted under `dye-optimizer:v1:options`. */
export class OptionsState {
	#store = new PersistedState<StoredOptions>(OPTIONS_KEY, defaultOptions(), {
		serializer: optionsSerializer
	});

	get current(): StoredOptions {
		return this.#store.current;
	}

	get snapshot(): StoredOptions {
		const o = this.#store.current;
		return { ...o, targetColors: [...o.targetColors] };
	}

	#update(change: Partial<StoredOptions>): void {
		this.#store.current = { ...this.snapshot, ...change };
	}

	setMode(mode: Mode): void {
		this.#update({ mode });
	}

	setPlainGlassUnlimited(unlimited: boolean): void {
		this.#update({ plainGlassUnlimited: unlimited });
	}

	setPlainGlassQuantity(quantity: number): void {
		this.#update({ plainGlassQuantity: quantity });
	}

	setTarget(target: number): void {
		this.#update({ target });
	}

	setTargetColors(colors: ColorId[]): void {
		this.#update({ targetColors: COLOR_IDS.filter((c) => colors.includes(c)) });
	}

	replace(options: StoredOptions): void {
		this.#store.current = { ...options, targetColors: [...options.targetColors] };
	}

	reset(): void {
		this.replace(defaultOptions());
	}
}
