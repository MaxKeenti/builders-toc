# 0003: Recipe dataset, RECIPE_DATA_VERSION and verification sources

**Status:** Accepted

## Context

Recipes are data (`src/lib/data/recipes.ts`), and nothing about Minecraft behavior may be
inferred. The build prompt lists eight dye-mixing recipes as a minimum, plus "every valid
alternative, especially for magenta and light gray". Only dye-to-dye recipes are modeled (no
flowers, ink sacs, lapis, bone meal, cocoa, smelting…).

## Decision

**Source of truth:** the vanilla data pack of **Java Edition 26.3** (the latest stable release
on 2026-09-24, released 2026-09-15), read from the `26.3-data` tag of
[misode/mcmeta](https://github.com/misode/mcmeta), which mirrors `data/minecraft/recipe/*.json`
from each release. Every recipe's `source` field links to its file there.

All `crafting_shapeless` recipes whose ingredients and result are all dyes:

| Recipe id (vanilla file)              | Inputs               | Output       |
| ------------------------------------- | -------------------- | ------------ |
| `cyan_dye`                            | blue + green         | 2 cyan       |
| `gray_dye`                            | black + white        | 2 gray       |
| `light_blue_dye_from_blue_white_dye`  | blue + white         | 2 light blue |
| `light_gray_dye_from_black_white_dye` | black + 2 white      | 3 light gray |
| `light_gray_dye_from_gray_white_dye`  | gray + white         | 2 light gray |
| `lime_dye`                            | green + white        | 2 lime       |
| `magenta_dye_from_blue_red_pink`      | blue + red + pink    | 3 magenta    |
| `magenta_dye_from_blue_red_white_dye` | blue + 2 red + white | 4 magenta    |
| `magenta_dye_from_purple_and_pink`    | purple + pink        | 2 magenta    |
| `orange_dye_from_red_yellow`          | red + yellow         | 2 orange     |
| `pink_dye_from_red_white_dye`         | red + white          | 2 pink       |
| `purple_dye`                          | blue + red           | 2 purple     |

Glass dyeing: `<color>_stained_glass.json` is `crafting_shaped`, with 8 `minecraft:glass` around 1
`<color>_dye`, giving 8 stained-glass blocks. It's the same for all 16 colors.

Excluded, because they aren't dye-to-dye: the flower/item recipes (e.g.
`magenta_dye_from_allium`, `blue_dye` from lapis, `white_dye` from bone meal) and smelting
(`green_dye`, `lime_dye_from_smelting`).

`RECIPE_DATA_VERSION = "java-26.3 / verified 2026-09"`.

Spanish display names use the official `es_es` strings from the same release
(`item.minecraft.*_dye`, `block.minecraft.*_stained_glass`, `color.minecraft.*`). Swatches are
the Java dye color codes from the "Color values" table on the Minecraft Wiki's Dye page.

## Locked regression fixture

The screenshot sample (`samples.ts`) has a locked Balanced optimum: **K = 9, T\* = 152,
spread = 5, Blue Dye as one smallest bottleneck (37 available, 38 required)**. Verification
against 26.3 did **not** change it; the solver derives exactly the expected plan (see
`regression.spec.ts`).

Changing any recipe requires:

1. bumping `RECIPE_DATA_VERSION` (and adding the old value to
   `SUPPORTED_RECIPE_DATA_VERSIONS` in `state/schema.ts`, so older exports still import);
2. adding a `recipe_<id>` message in both locales for any new recipe;
3. if the locked fixture's optimum changes, a note here and in the README naming the verified
   recipe that forced the change.

## Consequences

- Adding or changing a recipe never touches the optimizer.
- Bedrock Edition isn't modeled; its recipe set could differ. Supporting it would need a second
  dataset and version id.
