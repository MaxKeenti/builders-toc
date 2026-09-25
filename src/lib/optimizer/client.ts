import {
	OptimizerError,
	serializeError,
	type WorkerRequest,
	type WorkerResponse
} from './protocol';
import type { OptimizeProblem, OptimizeResult } from './types';

/**
 * Runs the optimizer in a Web Worker. The worker, HiGHS and its WASM are loaded lazily on the
 * first `solve`, so nothing solver-related runs during prerendering or blocks first paint.
 */
export class OptimizerClient {
	#worker: Promise<Worker> | null = null;
	#nextId = 1;
	#pending = new Map<
		number,
		{ resolve: (r: OptimizeResult) => void; reject: (e: OptimizerError) => void }
	>();

	solve(problem: OptimizeProblem): Promise<OptimizeResult> {
		const id = this.#nextId++;
		return new Promise((resolve, reject) => {
			this.#pending.set(id, { resolve, reject });
			this.#getWorker().then(
				(worker) => worker.postMessage({ id, problem } satisfies WorkerRequest),
				(error) => {
					this.#pending.delete(id);
					reject(new OptimizerError(serializeError(error)));
				}
			);
		});
	}

	dispose(): void {
		this.#worker?.then((w) => w.terminate());
		this.#worker = null;
		for (const { reject } of this.#pending.values()) {
			reject(new OptimizerError({ name: 'AbortError', code: null, message: 'disposed' }));
		}
		this.#pending.clear();
	}

	#getWorker(): Promise<Worker> {
		this.#worker ??= import('./worker?worker').then(({ default: OptimizerWorker }) => {
			const worker = new OptimizerWorker();
			worker.onmessage = (event: MessageEvent<WorkerResponse>) => {
				const data = event.data;
				const pending = this.#pending.get(data.id);
				if (!pending) return;
				this.#pending.delete(data.id);
				if (data.ok) pending.resolve(data.result);
				else pending.reject(new OptimizerError(data.error));
			};
			worker.onerror = (event) => {
				for (const { reject } of this.#pending.values()) {
					reject(
						new OptimizerError({ name: 'WorkerError', code: null, message: event.message })
					);
				}
				this.#pending.clear();
				this.#worker = null;
			};
			return worker;
		});
		return this.#worker;
	}
}
