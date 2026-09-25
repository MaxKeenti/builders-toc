# 0002: Lexicographic objective, determinism and bottleneck tie-breaking

**Status:** Accepted

## Context

The player's intent is "as many stained-glass colors as possible, then counts as equal as
possible". That's a lexicographic objective, not a weighted sum: no amount of balance may
trade away a color. Identical input must always produce the identical plan, and the
"why can't I get more?" explanation must not claim a unique bottleneck unless it's proven.

## Decision

### Model (`formulation.ts`)

Integer variables `x[r]` (recipe executions) and `g[c]` (glass dyeings). Per color:

- leftover `L[c] = D[c] + Σ A[c,r]·x[r] − 1·g[c] ≥ 0`
- final count `S[c] = E[c] + 8·g[c]` (so `G[c] = g[c]` dye units on glass)
- finite plain glass: `8·Σ g[c] ≤ Q`

Recipe coefficients and the glass recipe come from data (`recipes.ts`), never code.

### Balanced stages (`optimize.ts`)

Each stage is solved exactly, and its optimum is then fixed as a constraint
(`Lexicographic` in `lexicographic.ts`):

1. **Variety**: binary `z[c] ≤ S[c]`; maximize `Σ z[c]` → K.
2. **Balance floor**: `S[c] ≥ T − M·(1 − z[c])`; maximize T → T\*.
3. **Spread**: `U ≥ S[c]`; minimize `U − T` → spread.
4. **Leftovers**: minimize `Σ L[c]`.
5. **Recipe executions**: minimize `Σ x[r]`.

`M` is an upper bound on any final count, taken from the LP relaxation of "maximize glass
dyeing". If that LP is unbounded, the recipe data could create dye from nothing, and it's
rejected. Colors with `S > 0` but `z = 0` can't happen at the optimum: selecting them would
exceed the maximal K.

**Maximum output** runs "maximize `Σ S[c]`" first, then the Balanced stages as tie-breakers.
**Target** runs: maximize the number of requested colors with `S[c] ≥ target` (binary
`y[c]`), then minimize total shortfall, then minimize dye units on glass (spend only what the
targets need), then minimize recipe executions.

### Determinism

After the last stage, every recipe-execution variable is minimized and fixed in **recipe-id
lexicographic order**, then every glass-dyeing variable in **color order**. This pins down a
unique plan whatever order the solver explored, and whatever order recipes appear in the data
(covered by a spec that reverses the recipe array). HiGHS runs single-threaded with a fixed
seed. The plan is then listed in dependency order: a recipe comes after the recipes that
produce its inputs, with ties in recipe-id order.

### Bottleneck (`bottleneck.ts`)

For Balanced, the question is "what would it take for every color in the final inventory to
reach `T* + 1`?". Since `S = E + 8G`, each color's next level is
`E + 8·ceil((T*+1−E)/8)`, which can sit well above `T* + 1`. An auxiliary MILP adds
non-negative integer extra starting resources (`a[c]` dye units, plus plain glass in batches of
one glass dyeing when it's finite), and chooses among them in this order:

1. fewest extra units;
2. fewest extra units of **craftable** dyes (colors some recipe produces): a basic dye like
   Blue is a more useful answer than Purple, which is itself made from Blue;
3. canonical color order.

**Uniqueness is proven, not assumed.** Any other smallest solution with the same total must
use less of some resource `r` in the found set. So for each `r`, we re-solve with
`a[r] ≤ found[r] − 1` and the total fixed. If all are infeasible, the answer is unique;
otherwise the alternatives are reported and the UI says "one smallest resource increase…".

Target mode uses the same machinery, with the requirement "every requested color reaches
the target".

## Consequences

- A Balanced solve is roughly 5 stages + up to 28 canonicalization solves + 2–4 bottleneck
  solves, on a 16-color, 12-recipe model. That takes about 100 ms in node and runs in a worker
  in the browser. Canonicalization skips variables that are already 0.
- **Spec finding (build prompt §12):** for the screenshot sample, +1 Blue Dye is _one_
  smallest increase, but +1 Purple Dye works too: with 1 purple in hand, purple glass needs 3
  Blue + Red executions instead of 4, saving the missing blue. So Blue isn't a unique
  bottleneck. The tie-break above reports Blue (37 available, 38 required, as locked), and
  the result is marked not unique with Purple as an alternative. The regression spec asserts
  both.
