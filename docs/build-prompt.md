Build a polished web app called "Minecraft Dye & Stained Glass Optimizer" in this repository.

The app takes a player's current Minecraft dye inventory and existing stained-glass inventory, and calculates the mathematically optimal way to craft dyes and stained glass.

This must NOT be a hard-coded calculator for one inventory. Build a reusable optimization engine based on recipes and integer constraints.

================================================== 0. REPOSITORY CONVENTIONS (READ FIRST)
==================================================

This repo already has its standards. Before writing code, read:

- `AI_RULES.md`: tooling, structure, UI, i18n, persistence and the definition of done. It takes precedence over any suggestion in this prompt.
- `CONTEXT.md`: the domain glossary. Use its terms (dye unit, recipe execution, plain glass, stained-glass block, balance floor, spread, bottleneck…) in code, tests and UI copy in both languages.
- `docs/adr/README.md`: ADR format.

The stack is already scaffolded: SvelteKit + Svelte 5 runes, TypeScript, bun, Tailwind v4, shadcn-svelte (luma / taupe), Paraglide (en base, es), Vitest (node + browser projects), `adapter-static` with full prerendering and URL-based locales, and `runed`. Use the Svelte MCP tools as `AI_RULES.md` describes, and run `svelte-autofixer` on every component.

Remove the scaffold demo (`src/routes/demo/`, `src/lib/vitest-examples/`, the `hello_world` message) once real code replaces it.

If this prompt conflicts with an ADR or `AI_RULES.md`, say so explicitly rather than silently picking one.

==================================================

1. CORE GOAL
   \==================================================

The default optimization priority is lexicographic:

1. Maximize the number of different stained-glass colors in the final inventory (variety, K).
2. Among those solutions, maximize the smallest final count among the selected colors (balance floor, T*, "max-min fairness").
3. Among those solutions, minimize the spread (largest selected count minus smallest).
4. Among those solutions, minimize leftover dye / maximize useful dye utilization.
5. If several solutions are still equivalent, minimize the number of recipe executions so the result is deterministic and easy to follow.

In shorthand:

maximize variety
→ maximize balance floor
→ minimize spread
→ minimize leftovers
→ minimize crafting complexity

The user's intent:

"I want as many different stained-glass colors as possible, and then I want the final quantities of those colors to be as equal as possible."

================================================== 2. COLORS
==================================================

Support all 16 Minecraft colors:

white, orange, magenta, light_blue, yellow, lime, pink, gray, light_gray, cyan, purple, blue, brown, green, red, black

For every color c, store:

D[c] = starting dye units
E[c] = existing stained-glass blocks

All inventories are non-negative integers.

Existing stained glass is fixed inventory. It cannot be converted back into dye.

The colors live in `src/lib/data/colors.ts`: id, display order, and a swatch value per color. These swatches are the ONLY literal colors allowed in the codebase (see `AI_RULES.md`). Color display names are Paraglide messages, not hard-coded strings.

================================================== 3. STAINED-GLASS RECIPE
==================================================

Minecraft stained glass is produced as:

1 dye unit + 8 plain glass → 8 stained-glass blocks

Let:

G[c] = dye units of color c spent on glass dyeing

Then:

S[c] = E[c] + 8 * G[c]

where:

S[c] = final stained-glass blocks of color c
G[c] ∈ non-negative integers

If plain glass is unlimited, do not constrain it.

If the user gives a finite quantity Q of plain glass, enforce:

8 * sum(G[c]) <= Q

Always show plain-glass consumption in the result.

================================================== 4. DYE RECIPES
==================================================

Recipes are DATA, not procedural special cases. They live in `src/lib/data/recipes.ts`:

Recipe {
id,
inputs: { item: quantity },
outputs: { item: quantity },
source // URL or citation it was verified against
}

The recipe display name is a Paraglide message keyed by recipe id.

Export `RECIPE_DATA_VERSION` (identifying the Minecraft version the data was verified against, e.g. "java-1.21.x / verified 2026-09") from the same file.

A recipe count x[r] is the number of times recipe r is executed.

For each dye c:

L[c] = D[c] + Σ(A[c,r] * x[r]) - G[c]

where A[c,r] = output quantity of dye c from recipe r minus input quantity of dye c consumed by recipe r.

Require:

L[c] >= 0
x[r] ∈ non-negative integers
G[c] ∈ non-negative integers

L[c] is leftover dye.

Only model dye-to-dye mixing recipes. Do NOT model flowers, cactus, ink sacs, lapis, bone meal, etc.

Include the current vanilla dye-mixing recipes, and VERIFY every recipe against reliable current Minecraft sources before finalizing the dataset. Nothing about Minecraft behavior may be inferred; cite each recipe's source in its `source` field.

The set should include at least:

red + yellow -> orange
red + white -> pink
blue + white -> light blue
blue + red -> purple
blue + green -> cyan
green + white -> lime
black + white -> gray
gray + white -> light gray

Also include every valid alternative recipe, especially for magenta and light gray. The optimizer must be free to pick whichever recipe is optimal for the current inventory.

Record the recipe-data version decision in an ADR.

================================================== 5. MATHEMATICAL OPTIMIZATION
==================================================

This is an INTEGER optimization problem.

Use a real MILP/ILP solver that runs in the browser (for example HiGHS/WASM or GLPK.js). Don't fake the optimization with greedy rules. Write an ADR recording which solver was chosen and why, and how it's loaded in a static, prerendered build (e.g. lazily and/or in a Web Worker so the UI stays responsive). Solver work must never run during prerendering.

---

STAGE 1 — VARIETY
--------------------

Binary z[c]: z[c] = 1 when S[c] > 0, else 0.

Maximize Σ z[c], with proper MILP linking constraints between z[c] and S[c]. The theoretical maximum is 16. Existing stained glass counts toward variety.

---

STAGE 2 — BALANCE FLOOR
--------------------

Fix K from stage 1. Maximize T subject to S[c] >= T for every selected color (z[c] = 1), not for unreachable colors with zero stock.

---

STAGE 3 — MINIMIZE SPREAD
--------------------

Fix T*. With U = max selected S[c], minimize U − T*.

---

STAGE 4 — RESOURCE UTILIZATION
--------------------

Fix the previous optima. Minimize Σ L[c].

---

STAGE 5 — SIMPLE PLAN
--------------------

Minimize Σ x[r] as the final deterministic tie-breaker. If ties remain after stage 5, break them with a documented deterministic rule (e.g. lexicographic order of recipe ids) so identical input always produces an identical plan.

The optimizer must NEVER:

- produce negative inventory
- use fractional recipe executions or fractional dye
- destroy existing stained glass
- silently create resources

Validate every solver result independently in integer arithmetic (conservation, non-negativity, S = E + 8G, glass limit) before returning it. A failed validation is an error, not a displayed result.

The engine in `src/lib/optimizer/` takes the inventory, the recipe set and the options as explicit arguments. It must not import Svelte, Paraglide, `$lib/state` or `$lib/components`. It returns structured data (numbers and ids), never localized text.

================================================== 6. OPTIMIZATION MODES
==================================================

BALANCED (default): the full lexicographic objective above.

MAXIMUM OUTPUT: maximize Σ S[c], for players who want the most stained glass and don't care about balance. Use the same determinism tie-breakers.

TARGET: the player enters a target per color (e.g. 64 blocks) and picks which colors it applies to. Maximize how many requested colors reach S[c] >= target, then apply sensible tie-breakers. Explain which colors meet the target and which cannot, and why.

================================================== 7. USER INPUT
==================================================

An inventory editor for all 16 colors. For each color, the player enters:

- dye units owned
- stained-glass blocks owned

Plus a plain glass setting: Unlimited or a finite quantity.

Inputs accept integers only and reject negative values, with an inline explanation instead of silent clamping.

Editing many values must be fast and keyboard-friendly: logical tab order, arrow up/down to step, Enter to commit.

Build it primitives-first (see `AI_RULES.md`):

- +/- steppers and "set to 0" → `ButtonGroup` (icon buttons with `aria-label`)
- numeric fields → `InputGroup` / `Field`, with label, hint and error
- Unlimited / finite plain glass → `ToggleGroup` or `Switch` + field
- mode selection → `ToggleGroup` or `Tabs`
- every interactive target at least 44px

Next to every count, show its Minecraft stack equivalent (see section 8).

================================================== 8. NUMBERS AND UNITS
==================================================

All user-facing numbers are formatted with `Intl.NumberFormat` using the active Paraglide locale. Never hard-code separators or locales.

Every user-facing item count also shows its Minecraft stack equivalent (64 per stack):

152 blocks · 2 stacks + 24

(and the Spanish equivalent). Build this as ONE shared formatter and component, with pluralized Paraglide messages for both parts. Handle the edge cases: 0, exactly N stacks, under 64.

Always distinguish these four units, visually and in wording, in both languages:

- dye units
- recipe executions
- plain glass blocks
- stained-glass blocks

1 dye unit is NOT 1 stained-glass block: 1 dye unit + 8 plain glass = 8 stained-glass blocks.

================================================== 9. RESULTS
==================================================

The result must be understandable without knowing optimization theory.

Headline (immediately visible):

- colors achieved, e.g. 9 / 16
- balance floor (smallest final count)
- largest final count
- spread
- new stained-glass blocks
- total final stained-glass blocks
- plain glass required
- dye units used

FINAL INVENTORY (shadcn `Table`, per color):

Color · Existing glass · Dye units on glass · New glass · Final glass · Stacks + remainder

CRAFTING PLAN, dependency-safe order:

Craft:
4× Orange Dye recipe
9× Pink Dye recipe
10× Light Blue Dye recipe
4× Purple Dye recipe
4× Magenta Dye recipe

Then:
Use 19 White Dye on 152 plain glass → 152 White Stained Glass
Use 19 Yellow Dye on 152 plain glass → 152 Yellow Stained Glass
...

Detailed explanations (why a color is unreachable, the bottleneck math, per-recipe input/output breakdowns, the "why leave leftovers" explanation) open in a `Dialog`. The summary stays on the page.

================================================== 10. LEFTOVERS
==================================================

Show all dye units left after the plan, e.g.:

White Dye: 102
Yellow Dye: 468
Blue Dye: 0
...

Explain that large leftovers can be intentional. For example, spending hundreds of extra yellow would greatly increase yellow glass but ruin the balance, so the balanced optimizer leaves it unused.

================================================== 11. BOTTLENECK — "WHY CAN'T I GET MORE?"
==================================================

This is an important feature.

After finding T*, determine why the next balance floor is infeasible. Because S[c] = E[c] + 8G[c], the next achievable count for a color may be above T* + 1. Compute the next level per color correctly.

If the next level is infeasible, solve an auxiliary optimization with non-negative "additional starting resource" variables to find a smallest extra resource set that makes it feasible. Show something like:

Limiting resource: Blue Dye
37 available
38 required to raise every reachable color beyond the current balanced level
You are 1 Blue Dye short.

If several minimal solutions exist, say "One smallest resource increase that would improve the result is…". Never claim a unique bottleneck unless it's mathematically proven (e.g. by re-solving with that resource excluded).

================================================== 12. REGRESSION TEST (LOCKED BEHAVIOR)
==================================================

Include this as the built-in sample in `src/lib/data/samples.ts` and as a locked test fixture.

These values came from a screenshot, so the sample is editable data in the UI, but the fixture and its expected optimum are locked. They may change only with a `RECIPE_DATA_VERSION` bump plus a note (in the ADR and README) explaining which verified recipe forced the change.

Unlimited plain glass.

STARTING DYE:
white = 144, yellow = 491, blue = 37, red = 52, orange = 10, all others 0

EXISTING STAINED GLASS:
orange = 9, red = 49, purple = 101, magenta = 25, pink = 12, all others 0

Expected BALANCED result:

K = 9 colors

white = 152, yellow = 152, blue = 152, red = 153, orange = 153, pink = 156, light_blue = 152, purple = 157, magenta = 153

minimum = 152, maximum = 157, spread = 5
new stained glass = 1184
existing stained glass = 196
total final = 1380
plain glass required = 1184

Dye units on glass:
white 19, yellow 19, blue 19, red 13, orange 18, pink 18, light_blue 19, purple 7, magenta 16

One optimal crafting plan:
Orange: 4 executions (4 red + 4 yellow → 8 orange)
Pink: 9 executions (9 red + 9 white → 18 pink)
Light Blue: 10 executions (10 blue + 10 white → 20 light_blue)
Purple: 4 executions (4 blue + 4 red → 8 purple)
Magenta: 4 executions of 1 blue + 2 red + 1 white → 4 magenta (16 magenta)

Leftovers for that plan:
white 102, yellow 468, blue 0, red 14, orange 0, pink 0, light_blue 1, purple 1, magenta 0

The locked facts are: K = 9, T* = 152, spread = 5, and bottleneck = Blue Dye (37 available, 38 required).
The per-recipe plan may differ if an equally optimal one exists, but the test must assert that the plan is valid, deterministic across runs, and meets all five stage optima.

The solver must DERIVE this. Do not hard-code the answer.

================================================== 13. WHY T* = 152 IS EXPECTED TO BE OPTIMAL
==================================================

Use this as a solver-validation case (and as the text behind the bottleneck dialog for the sample).

To push the floor above 152:

Colors with zero existing glass follow S = 8G, so they cannot end at 153 and must jump to at least 160.

- Blue: 20 blue dye.
- Light Blue: 160 blocks = 20 light-blue dye = 10 blue + white recipe executions = 10 blue dye.
- Purple starts at 101: 101 + 8G >= 153 → G >= 7 → 4 blue + red executions → 4 blue dye.
- Magenta starts at 25: 25 + 8G >= 153 → G >= 16 → 4 executions of the 4-magenta recipe → 4 blue dye.

Blue required: 20 + 10 + 4 + 4 = 38. Available: 37. The next balanced level is infeasible, and Blue Dye is the expected limiting resource.

================================================== 14. ARCHITECTURE
==================================================

Follow `AI_RULES.md`:

- `src/lib/data/`: `colors.ts`, `recipes.ts` (+ `RECIPE_DATA_VERSION`), `samples.ts`
- `src/lib/optimizer/`: model building, lexicographic solving, validation, bottleneck analysis, solver loading/worker. Pure TypeScript with explicit inputs.
- `src/lib/state/`: `.svelte.ts` rune classes (inventory, options, current result)
- `src/lib/components/<feature>/`: `inventory/`, `options/`, `results/`, `plan/`, `leftovers/`, `bottleneck/`; shared pieces (swatch, stack-count, section header) in `common/`
- `src/lib/components/ui/`: shadcn only, added through the CLI
- `src/routes/+page.svelte`: puts sections together only; no visual utilities on bare elements

UI components never do recipe math. They call the optimizer through state.

Client-side only. The build is static and prerendered; it must work served from any static host (e.g. Vercel) with no server.

================================================== 15. PERSISTENCE / IMPORT / EXPORT
==================================================

Persist the player's inventory and options with `runed`'s `PersistedState`, under versioned keys (`dye-optimizer:v1:inventory`, `dye-optimizer:v1:options`). A breaking shape change bumps the version.

Add:

- automatic save / load
- Reset (with `AlertDialog` confirmation)
- Load Sample Inventory (with `AlertDialog` confirmation if it would overwrite edits)
- Export inventory/configuration as JSON, including `schemaVersion` and `recipeDataVersion`
- Import JSON, validated against a schema: known colors, non-negative integers, supported versions. Invalid input is rejected whole with a clear explanation (toast via `svelte-sonner` + details), never partially applied.

Shareable URL state is optional future work. Don't build it now.

================================================== 16. DESIGN
==================================================

A useful modern tool, not a spreadsheet. Use the existing shadcn theme (luma, taupe, Outfit headings, Inter body, `tabular-nums` for figures). Light and dark mode must both work.

Colour rules (from `AI_RULES.md`): theme tokens only; the 16 Minecraft swatches from `colors.ts` are the single exception and are rendered through one swatch component. A swatch is never the only identifier; always show the color name.

Minecraft inventory inspiration is welcome (slot-grid feel, stack counts) but done with tokens and primitives, not copied game assets.

Mobile and desktop: stack below `md`, columns from `md` up.

The most important result is immediately visible, e.g.:

9 / 16 colors · Balance floor 152 · Spread 5 · 1,184 new blocks (2 stacks + … equivalents where relevant)

Clearly distinguish these sections (headings, icons, `Card`/`Badge` variants using semantic tones, not ad-hoc colors):

Starting Inventory · Craft These Dyes · Make This Glass · Final Inventory · Leftovers · Bottleneck

================================================== 17. i18n
==================================================

All interface copy is in Paraglide messages, in both `messages/en.json` and `messages/es.json`, added in the same change. This includes color names, recipe names, units, errors, explanations and the bottleneck text. No hard-coded user-facing strings in components. Use `CONTEXT.md` terms consistently in both languages. Provide a locale switcher (en / es) using Paraglide's `localizeHref`; locales are URL-based (`/` and `/es/`).

================================================== 18. TESTING
==================================================

Automated tests (Vitest). Optimizer tests are `*.spec.ts` in the node project. Component tests are `*.svelte.spec.ts` in the browser project.

Optimizer, at minimum:

- inventory conservation
- no negative dye
- integer decision variables
- existing stained glass is preserved
- finite plain-glass constraint
- unlimited-glass mode
- recipe dependencies (dye produced by one recipe consumed by another)
- alternative recipes (optimizer picks the better magenta / light gray path)
- unreachable colors
- all-zero inventory
- already-balanced inventory
- very asymmetric inventories
- determinism: same input → identical plan across repeated runs
- each mode (Balanced, Maximum output, Target)
- bottleneck analysis, including a case with multiple minimal solutions (must not claim uniqueness)
- the locked regression fixture (section 12)

Also:

- stack formatter (0, <64, exact stacks, remainder) in en and es
- JSON import validation (valid, negative, non-integer, unknown color, wrong version)
- at least one component test for the inventory editor (integer-only input, stepper, set to 0)

================================================== 19. IMPLEMENTATION PRINCIPLES
==================================================

- Do not solve only the sample.
- Do not hard-code combinations around red/blue/yellow.
- Do not assume every dye is directly craftable.
- Do not use floating point where integer quantities matter.
- Keep recipes data-driven and the engine reusable.
- Make results explainable.
- If you find an inconsistency in this specification, prefer mathematical correctness and explain the adjustment instead of silently working around it.

================================================== 20. DOCUMENTATION
==================================================

- Extend `CONTEXT.md` if you introduce a domain term that isn't there.
- ADRs in `docs/adr/`, at least:
  - 0001: solver choice and loading strategy (WASM, worker, prerender-safety)
  - 0002: lexicographic objective design and determinism tie-breaking
  - 0003: recipe dataset, `RECIPE_DATA_VERSION` and verification sources
  - 0004: persistence shape and versioning (PersistedState keys, JSON schema)
- Replace the scaffold `README.md` with a concise README covering: how to run it (bun scripts), how the optimization works, which solver is used, where recipes live, how to add or modify a recipe, and how to deploy the static build (e.g. Vercel). Don't add deployment config files unless asked.

================================================== 21. DEFINITION OF DONE
==================================================

Build the working application, not a mockup.

Before considering the task complete:

1. `bun run test`, `bun run check`, `bun run lint` and `bun run build` all pass.
2. Run the app (`bun run dev`), load the sample inventory, and show (screenshot or equivalent) that the solver reproduces the locked Balanced optimum (K = 9, T* = 152, spread = 5, Blue Dye bottleneck) in both en and es. If recipe verification changed it, explain precisely which recipe and why, with the version bump.
3. Report any spec adjustment you made and why.

Do not commit, push or add deployment configuration unless asked.
