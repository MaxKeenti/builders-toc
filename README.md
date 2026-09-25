# Minecraft Dye & Stained Glass Optimizer

Enter your Minecraft dye units and existing stained-glass blocks; the app computes the
mathematically optimal way to mix dyes and dye glass. By default (**Balanced**) it maximizes
the number of stained-glass colors, then makes their final counts as even as possible. There
are also **Maximum output** and **Target** modes. It explains the plan, the leftovers, and
what's limiting the result. English and Spanish; everything runs in your browser.

## Running it

This project uses **bun**.

```sh
bun install
bun run dev     # dev server
bun run test    # Vitest: optimizer/format/schema specs (node) + component specs (browser)
bun run check   # svelte-check (strict)
bun run lint    # prettier + eslint
bun run build   # static, fully prerendered build in ./build
bun run preview # serve the production build
```

Browser specs need Playwright's Chromium (`bun x playwright install chromium`).

## How the optimization works

It's an integer program (MILP), not a set of greedy rules. Per color `c`:

- `x[r]`: executions of recipe `r`; `G[c]`: dye units spent on glass (all non-negative integers)
- leftover dye `L[c] = D[c] + Σ A[c,r]·x[r] − G[c] ≥ 0`
- final stained glass `S[c] = E[c] + 8·G[c]`, and `8·ΣG ≤ Q` if plain glass is finite

Balanced mode solves five stages in order, fixing each optimum before the next:
**maximize variety (K) → maximize the balance floor (T\*) → minimize spread → minimize leftover
dye → minimize recipe executions**. A final pass fixes recipe executions in recipe-id order and
glass dyeing in color order, so the same input always gives the same plan. Every solver answer
is re-checked in integer arithmetic (conservation, no negative dye at any step, `S = E + 8G`,
plain-glass limit) before it's shown.

The **bottleneck** analysis asks what it would take for every color to reach the next level.
It solves an auxiliary MILP for one smallest set of extra starting resources, and it proves
whether that set is unique before calling it "the" limiting resource.

Details: [ADR 0002](docs/adr/0002-lexicographic-objective-and-determinism.md).

## Solver

[HiGHS](https://highs.dev) compiled to WebAssembly (`highs` on npm), run in a Web Worker that's
loaded lazily on the first solve, never during prerendering. See
[ADR 0001](docs/adr/0001-solver-choice-and-loading.md).

## Recipes

Recipes live in [`src/lib/data/recipes.ts`](src/lib/data/recipes.ts) as plain data, verified
against the Java Edition 26.3 vanilla data pack (`RECIPE_DATA_VERSION =
"java-26.3 / verified 2026-09"`). Each recipe cites its source file. See
[ADR 0003](docs/adr/0003-recipe-dataset-and-version.md).

### Adding or modifying a recipe

1. Verify it against the current vanilla data (`data/minecraft/recipe/<id>.json`) and edit
   the `DYE_RECIPES` entry: `id` (the vanilla file name), `inputs`, `outputs`, `source`.
2. Add a `recipe_<id>` message to **both** `messages/en.json` and `messages/es.json`, and
   register it in `RECIPE_NAMES` (`src/lib/i18n/names.ts`).
3. Bump `RECIPE_DATA_VERSION`, and keep the old value in `SUPPORTED_RECIPE_DATA_VERSIONS`
   (`src/lib/state/schema.ts`) so older exports still import.
4. Run `bun run test`. The optimizer itself never needs changes.

**Locked behavior:** the built-in sample (`src/lib/data/samples.ts`) must keep its Balanced
optimum: K = 9, T\* = 152, spread = 5, with Blue Dye as one smallest bottleneck (37 available,
38 required). It may change only with a `RECIPE_DATA_VERSION` bump and a note here and in
ADR 0003 naming the recipe that forced it. No change so far: verification against 26.3
reproduces it exactly.

## Deploying

`bun run build` writes a fully static site to `build/`: `index.html`, `es/index.html` and
hashed assets, including the solver's `.wasm`. Serve that folder from any static host. On
Vercel, import the repo and set the build command to `bun run build` and the output directory
to `build`. No server, environment variables or rewrites are needed.

## Project docs

- [`AI_RULES.md`](AI_RULES.md): conventions and definition of done
- [`CONTEXT.md`](CONTEXT.md): domain glossary (English and Spanish)
- [`docs/adr/`](docs/adr/): architecture decisions
