/// <reference lib="webworker" />
import loadHighs from 'highs';
import wasmUrl from 'highs/runtime?url';
import { optimize } from './optimize';
import { highsSolver, type MilpSolver } from './solver';
import { serializeError, type WorkerRequest, type WorkerResponse } from './protocol';

let solver: Promise<MilpSolver> | undefined;

function loadSolver(): Promise<MilpSolver> {
	solver ??= loadHighs({ locateFile: () => wasmUrl }).then(highsSolver);
	// A failed load is retried on the next request instead of being cached.
	solver.catch(() => (solver = undefined));
	return solver;
}

self.onmessage = async (event: MessageEvent<WorkerRequest>) => {
	const { id, problem } = event.data;
	let response: WorkerResponse;
	try {
		response = { id, ok: true, result: optimize(problem, await loadSolver()) };
	} catch (error) {
		response = { id, ok: false, error: serializeError(error) };
	}
	self.postMessage(response);
};
