import loadHighs from 'highs';
import { highsSolver, type MilpSolver } from '../solver';

let solver: Promise<MilpSolver> | undefined;

/** HiGHS loaded directly in node, for specs. The browser uses the worker instead. */
export function nodeSolver(): Promise<MilpSolver> {
	solver ??= loadHighs().then(highsSolver);
	return solver;
}
