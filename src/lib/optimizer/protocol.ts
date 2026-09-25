import type { OptimizeProblem, OptimizeResult } from './types';

export interface WorkerRequest {
	id: number;
	problem: OptimizeProblem;
}

/** Errors cross the worker boundary as plain data; `code` is set for engine errors. */
export interface SerializedError {
	name: string;
	code: string | null;
	message: string;
}

export type WorkerResponse =
	| { id: number; ok: true; result: OptimizeResult }
	| { id: number; ok: false; error: SerializedError };

export function serializeError(error: unknown): SerializedError {
	if (error instanceof Error) {
		const code = 'code' in error && typeof error.code === 'string' ? error.code : null;
		return { name: error.name, code, message: error.message };
	}
	return { name: 'Error', code: null, message: String(error) };
}

export class OptimizerError extends Error {
	constructor(readonly detail: SerializedError) {
		super(detail.message);
		this.name = detail.name;
	}
}
