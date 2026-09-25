import type { ColorCounts, ColorId } from '$lib/data/colors';
import type { RecipeSet } from '$lib/data/recipes';

/** Starting inventory: dye units (D) and existing stained-glass blocks (E) per color. */
export interface Inventory {
	dye: ColorCounts;
	stainedGlass: ColorCounts;
}

export type PlainGlassSupply = { kind: 'unlimited' } | { kind: 'finite'; quantity: number };

export type Mode = 'balanced' | 'maximum-output' | 'target';

export type OptimizeOptions = { plainGlass: PlainGlassSupply } & (
	| { mode: 'balanced' }
	| { mode: 'maximum-output' }
	| { mode: 'target'; target: number; targetColors: ColorId[] }
);

export interface OptimizeProblem {
	inventory: Inventory;
	recipes: RecipeSet;
	options: OptimizeOptions;
}

/** Per-color outcome of a plan. All values are integers. */
export interface ColorOutcome {
	color: ColorId;
	/** D */
	startingDye: number;
	/** E */
	existingGlass: number;
	/** Dye units of this color produced by recipe executions. */
	producedByRecipes: number;
	/** Dye units of this color consumed by recipe executions. */
	consumedByRecipes: number;
	/** G: dye units spent on glass dyeing. */
	dyeOnGlass: number;
	/** 8·G */
	newGlass: number;
	/** S = E + 8·G */
	finalGlass: number;
	/** L */
	leftoverDye: number;
}

export interface RecipeStep {
	recipeId: string;
	executions: number;
	/** Total dye units consumed by all executions of this step. */
	consumed: Partial<ColorCounts>;
	/** Total dye units produced by all executions of this step. */
	produced: Partial<ColorCounts>;
}

export interface GlassStep {
	color: ColorId;
	dyeUnits: number;
	plainGlass: number;
	stainedGlassBlocks: number;
}

/** The crafting plan in a dependency-safe order: recipes first, then glass dyeing. */
export interface CraftingPlan {
	recipes: RecipeStep[];
	glass: GlassStep[];
}

export interface Summary {
	/** K: colors with at least one stained-glass block in the final inventory. */
	variety: number;
	colorCount: number;
	/** T*: smallest final count among colors in the final inventory; null when K = 0. */
	balanceFloor: number | null;
	largest: number | null;
	spread: number | null;
	newGlass: number;
	existingGlass: number;
	totalFinal: number;
	plainGlassUsed: number;
	dyeUnitsOnGlass: number;
	leftoverDye: number;
	recipeExecutions: number;
}

/** A color that no plan can put in the final inventory. */
export interface UnreachableColor {
	color: ColorId;
	/** Recipes that produce this color, with the inputs that can't be obtained. */
	recipes: { recipeId: string; missing: ColorId[] }[];
}

/** Why a color keeps leftover dye: one more dye unit on glass would reach `finalIfOneMore`. */
export interface LeftoverNote {
	color: ColorId;
	leftover: number;
	finalGlass: number;
	finalIfOneMore: number;
}

export type Resource = ColorId | 'plain_glass';

export interface ResourceIncrease {
	resource: Resource;
	available: number;
	required: number;
	extra: number;
}

/** A smallest set of extra starting resources that makes a requirement feasible. */
export interface SmallestIncrease {
	increases: ResourceIncrease[];
	/** Total extra units (dye units, plus plain glass in batches of one glass dyeing). */
	size: number;
	/** True only when every other smallest increase was proven not to exist. */
	unique: boolean;
	/** Other smallest increases found while checking uniqueness. */
	alternatives: ResourceIncrease[][];
}

export interface NextLevel {
	color: ColorId;
	finalGlass: number;
	/** Smallest reachable count above the balance floor: E + 8·ceil((T*+1−E)/8). */
	nextLevel: number;
	/** Dye units on glass that level needs. */
	dyeOnGlass: number;
}

export type Bottleneck =
	| { kind: 'none'; reason: 'no-colors' }
	| {
			kind: 'found';
			balanceFloor: number;
			nextFloor: number;
			nextLevels: NextLevel[];
			increase: SmallestIncrease;
	  };

export interface TargetOutcome {
	target: number;
	requested: ColorId[];
	met: ColorId[];
	unmet: { color: ColorId; finalGlass: number; shortfall: number; reachable: boolean }[];
	/** One smallest increase that would let every requested color meet the target. */
	increase: SmallestIncrease | null;
}

export interface StageOptima {
	variety: number;
	balanceFloor: number | null;
	spread: number | null;
	leftoverDye: number;
	recipeExecutions: number;
	totalFinal: number;
}

export interface OptimizeResult {
	mode: Mode;
	recipeDataVersion: string;
	colors: ColorOutcome[];
	plan: CraftingPlan;
	summary: Summary;
	stageOptima: StageOptima;
	unreachable: UnreachableColor[];
	leftoverNotes: LeftoverNote[];
	bottleneck: Bottleneck | null;
	target: TargetOutcome | null;
}
