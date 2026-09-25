import { OptimizerClient } from '$lib/optimizer/client';
import { OptimizerError, type SerializedError } from '$lib/optimizer/protocol';
import type { OptimizeProblem, OptimizeResult } from '$lib/optimizer/types';

export type OptimizerStatus = 'idle' | 'solving' | 'ready' | 'error';

/** Debounce between the last edit and a new solve. */
const SOLVE_DELAY_MS = 200;

/**
 * The current result. Solves run in a Web Worker; only the newest request's answer is kept,
 * and the previous result stays visible (marked stale) while a new one is computed.
 */
export class OptimizerState {
	status = $state<OptimizerStatus>('idle');
	result = $state.raw<OptimizeResult | null>(null);
	error = $state.raw<SerializedError | null>(null);

	#client: OptimizerClient | null = null;
	#latest = 0;
	#timer: ReturnType<typeof setTimeout> | undefined;
	#lastProblem: OptimizeProblem | null = null;

	get stale(): boolean {
		return this.status === 'solving' && this.result !== null;
	}

	schedule(problem: OptimizeProblem | null): void {
		clearTimeout(this.#timer);
		this.#lastProblem = problem;
		this.#latest++;
		if (!problem) {
			this.status = 'idle';
			this.result = null;
			this.error = null;
			return;
		}
		this.status = 'solving';
		this.#timer = setTimeout(() => this.#run(problem), SOLVE_DELAY_MS);
	}

	retry(): void {
		this.schedule(this.#lastProblem);
	}

	async #run(problem: OptimizeProblem): Promise<void> {
		const id = this.#latest;
		this.#client ??= new OptimizerClient();
		try {
			const result = await this.#client.solve($state.snapshot(problem) as OptimizeProblem);
			if (id !== this.#latest) return;
			this.result = result;
			this.error = null;
			this.status = 'ready';
		} catch (error) {
			if (id !== this.#latest) return;
			this.result = null;
			this.error =
				error instanceof OptimizerError
					? error.detail
					: { name: 'Error', code: null, message: String(error) };
			this.status = 'error';
		}
	}

	dispose(): void {
		clearTimeout(this.#timer);
		this.#client?.dispose();
		this.#client = null;
	}
}
