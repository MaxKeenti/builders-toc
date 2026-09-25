import { InventoryState } from './inventory.svelte';
import { OptimizerState } from './optimizer.svelte';
import { OptionsState } from './options.svelte';

export { toProblem } from './problem';
export type { InventoryField } from './inventory.svelte';

/** App-wide state. The app is a single static page, so module singletons are enough. */
export const inventory = new InventoryState();
export const options = new OptionsState();
export const optimizer = new OptimizerState();
