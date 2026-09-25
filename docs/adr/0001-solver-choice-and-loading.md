# 0001: HiGHS (WASM) as the solver, loaded lazily in a Web Worker

**Status:** Accepted

## Context

The optimizer is an integer program: recipe executions, glass dyeings and color-selection flags
must be whole numbers, and the objective is lexicographic (several stages, each solved exactly).
Greedy rules can't guarantee optimality, so a real MILP solver is required. Constraints:

- It runs in the browser: there's no backend (`AI_RULES.md`).
- The build is static and fully prerendered, so nothing solver-related may run at build time.
- The UI must stay responsive while solving.
- Results must be exact and reproducible.

Candidates considered: `highs` (HiGHS compiled to WebAssembly, 1.15.x) and `glpk.js` (GLPK
compiled to WebAssembly, 5.0.x).

## Decision

Use **`highs`** (highs-js, HiGHS 1.15).

- HiGHS is a modern, actively developed MILP solver with exact branch-and-bound
  (`mip_rel_gap = 0`, `mip_abs_gap = 0`), and it outperforms GLPK on MILP benchmarks.
- Its legacy `solve(lpText, options)` API creates a fresh native solver per call, so a failed
  solve can't poison later ones, and there's no basis or clock state shared between stages.
- It reads CPLEX LP text, which our own small model builder (`src/lib/optimizer/lp-model.ts`)
  writes. The engine depends only on a `MilpSolver` interface (`solver.ts`), so the solver
  could be swapped (e.g. for `glpk.js`) without touching the formulation.
- Options: `threads = 1`, `random_seed = 0` for reproducibility; feasibility tolerances
  tightened to `1e-9` because big-M rows multiply them (see ADR 0002).

**Loading.** The solver lives only in `src/lib/optimizer/worker.ts`, which imports
`highs` and its WASM (`highs/runtime?url`). `OptimizerClient` (`client.ts`) creates that worker
with a **dynamic** `import('./worker?worker')` on the first `solve()` call. Consequences:

- Prerendering never imports the solver: the client module is inert until `solve()` runs, and
  `solve()` is only called from a browser `$effect`.
- The ~3.5 MB (1.2 MB gzipped) WASM is fetched only when the player has something to optimize,
  not on first paint.
- All solving happens off the main thread; the UI keeps a stale result visible while a new one
  is computed, and only the newest request's answer is applied.

Node specs load HiGHS directly (`optimizer/testing/node-solver.ts`) and call the same engine.

## Consequences

- One heavy asset (the WASM) is served from `_app/immutable/workers/assets/`; static hosts
  serve it like any other file.
- Solver numerics are floating point, so every solver answer is rounded (rejecting values more
  than `1e-6` from an integer) and then re-validated in pure integer arithmetic before it's
  shown (`validate.ts`). A failed validation is an error, never a displayed result.
- Inventory fields are capped at 1,000,000 so big-M coefficients stay within the solver's
  numerically safe range.
