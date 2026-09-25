<script lang="ts">
	import { inventory, optimizer, options, toProblem } from '$lib/state';

	// Renders nothing. Re-solves (debounced, in the worker) whenever the inventory or options change.
	const problem = $derived(
		inventory.isEmpty ? null : toProblem(inventory.snapshot, options.snapshot)
	);

	// A real side effect: it starts an async solve in the worker, so it can't be a $derived.
	$effect(() => {
		optimizer.schedule(problem);
	});
</script>
