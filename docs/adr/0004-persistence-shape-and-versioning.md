# 0004: Persistence shape, storage keys and the import/export schema

**Status:** Accepted

## Context

The player's inventory and options should survive reloads, and be exportable and importable
as JSON. There's no server. Invalid data must never be partially applied.

## Decision

State is persisted with `runed`'s `PersistedState` (localStorage, synced across tabs) under
versioned keys, defined in `src/lib/state/schema.ts`:

| Key                          | Shape             |
| ---------------------------- | ----------------- |
| `dye-optimizer:v1:inventory` | `StoredInventory` |
| `dye-optimizer:v1:options`   | `StoredOptions`   |

```ts
interface StoredInventory {
	dye: Record<ColorId, number>; // D, dye units
	stainedGlass: Record<ColorId, number>; // E, stained-glass blocks
}
interface StoredOptions {
	mode: 'balanced' | 'maximum-output' | 'target';
	plainGlassUnlimited: boolean;
	plainGlassQuantity: number; // plain glass blocks, used when not unlimited
	target: number; // stained-glass blocks per color, ≥ 1
	targetColors: ColorId[];
}
```

The storage serializers validate on read. Anything unreadable (corrupt JSON, negative
counts…) falls back to the defaults instead of reaching the UI.

**Export file:**

```json
{
	"schemaVersion": 1,
	"recipeDataVersion": "java-26.3 / verified 2026-09",
	"inventory": { "dye": { … }, "stainedGlass": { … } },
	"options": { … }
}
```

**Import validation** (`parseExportFile`), with every problem collected and reported at once:

- valid JSON object with `schemaVersion === 1`;
- `recipeDataVersion` in `SUPPORTED_RECIPE_DATA_VERSIONS`;
- counts are integers from 0 to 1,000,000; color keys must be known colors, and **missing
  colors count as 0** (hand-written files may list only what they have);
- `options` are fully validated (mode, booleans, counts, `target ≥ 1`, known target colors).

Any problem rejects the whole file: the caller applies `value` only when `ok` is true. The
player sees a toast with the first problems and a count of the rest.

## Consequences

- A breaking change to either shape bumps `SCHEMA_VERSION`, which also changes both storage
  keys (`v2`). Old data is then ignored, never silently migrated.
- A recipe data bump must keep the previous version in `SUPPORTED_RECIPE_DATA_VERSIONS`,
  otherwise older exports stop importing.
- The page is prerendered with default (empty) state; stored values replace them on hydration.
