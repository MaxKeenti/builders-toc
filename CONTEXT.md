# Dye Optimizer Domain Language

The shared vocabulary for this project. Use these terms in code, UI copy (both locales),
tests and docs.

## Items

**Dye unit**:
One dye item of a color. This is the only thing recipes consume and produce.
_Avoid_: dye block, dye stack (when you mean units)

**Plain glass**:
Uncolored glass blocks, consumed 8 at a time by glass dyeing.
_Avoid_: glass (on its own, when ambiguous), clear glass

**Stained-glass block**:
One colored glass block. 1 dye unit + 8 plain glass → 8 stained-glass blocks.
_Avoid_: glass pane, stained glass (as a count without "blocks")

**Stack**:
64 items. Used as a display equivalent ("2 stacks + 24"), never as a unit of computation.

## Inventory

**Starting inventory**:
The player's dye units (D) and existing stained-glass blocks (E) per color before the plan.

**Existing stained glass**:
Stained-glass blocks the player already owns. Fixed: it's never converted back into dye.

**Final inventory**:
Stained-glass blocks per color after the plan (S = E + 8·G).

**Leftover dye**:
Dye units left after the plan (L). Leftovers can be intentional.
_Avoid_: waste, unused (as a noun)

## Crafting

**Recipe**:
A data entry mapping input dye units to output dye units.

**Recipe execution**:
Doing a recipe once. Counts of recipe executions are x[r].
_Avoid_: craft (as a count), operation (in UI copy)

**Glass dyeing**:
Spending 1 dye unit with 8 plain glass. Counted as G per color.

**Basic dye**:
A dye no recipe produces (white, yellow, blue, red, green, black, brown). Contrast with a
**craftable dye**, which some recipe produces. Used to break ties in the bottleneck.

**Unreachable color**:
A color with no dye units, no existing stained glass, and no recipe that can make its dye
from the starting inventory. It can't be in the final inventory.

**Crafting plan**:
The ordered recipe executions and glass dyeing that turn the starting inventory into the
final inventory.

## Optimization

**Mode**:
One of _Balanced_ (default), _Maximum output_ or _Target_.

**Variety (K)**:
The number of colors with at least one stained-glass block in the final inventory.

**Balance floor (T\*)**:
The smallest final count among the selected colors, maximized in Balanced mode.
_Avoid_: minimum (on its own, in UI copy)

**Spread**:
The largest selected final count minus the balance floor.

**Target**:
The per-color final count the player asks for in Target mode.

**Selected color**:
A color counted in variety: it has at least one stained-glass block in the final inventory.

**Next level**:
The smallest final count a color can reach above the balance floor. Since S = E + 8·G, it's
E + 8·ceil((T\*+1−E)/8), which can be well above T\* + 1.

**Smallest resource increase**:
A set of extra starting resources (dye units, or plain glass when finite) of minimum total size
that makes a requirement feasible (the next balance floor, or every target).

**Bottleneck**:
One smallest set of extra starting resources that would make the next balance floor
feasible. It's not necessarily unique.
_Avoid_: "the" limiting resource, unless it's proven unique

**Recipe data version**:
The identifier for the verified recipe dataset a result was computed with.

## Spanish terms

Used consistently in `messages/es.json`. Item names follow the official `es_es` game strings.

| English                            | Español                                    |
| ---------------------------------- | ------------------------------------------ |
| dye unit                           | unidad de tinte                            |
| plain glass                        | cristal sin tintar                         |
| stained-glass block                | bloque de cristal tintado                  |
| stack                              | pila                                       |
| recipe execution                   | ejecución de receta                        |
| glass dyeing                       | teñido de cristal                          |
| starting inventory                 | inventario inicial                         |
| final inventory                    | inventario final                           |
| leftover dye                       | tinte sobrante                             |
| variety                            | variedad (número de colores)               |
| balance floor                      | nivel mínimo                               |
| spread                             | diferencia                                 |
| bottleneck                         | cuello de botella                          |
| smallest resource increase         | aumento mínimo de recursos                 |
| Balanced / Maximum output / Target | Equilibrado / Máxima producción / Objetivo |
