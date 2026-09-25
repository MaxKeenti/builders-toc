import type { ColorId } from '$lib/data/colors';
import type { Resource } from '$lib/optimizer/types';
import { m } from '$lib/paraglide/messages';

type Message = () => string;

const COLOR_NAMES: Record<ColorId, Message> = {
	white: m.color_white,
	orange: m.color_orange,
	magenta: m.color_magenta,
	light_blue: m.color_light_blue,
	yellow: m.color_yellow,
	lime: m.color_lime,
	pink: m.color_pink,
	gray: m.color_gray,
	light_gray: m.color_light_gray,
	cyan: m.color_cyan,
	purple: m.color_purple,
	blue: m.color_blue,
	brown: m.color_brown,
	green: m.color_green,
	red: m.color_red,
	black: m.color_black
};

const DYE_NAMES: Record<ColorId, Message> = {
	white: m.dye_white,
	orange: m.dye_orange,
	magenta: m.dye_magenta,
	light_blue: m.dye_light_blue,
	yellow: m.dye_yellow,
	lime: m.dye_lime,
	pink: m.dye_pink,
	gray: m.dye_gray,
	light_gray: m.dye_light_gray,
	cyan: m.dye_cyan,
	purple: m.dye_purple,
	blue: m.dye_blue,
	brown: m.dye_brown,
	green: m.dye_green,
	red: m.dye_red,
	black: m.dye_black
};

const GLASS_NAMES: Record<ColorId, Message> = {
	white: m.glass_white,
	orange: m.glass_orange,
	magenta: m.glass_magenta,
	light_blue: m.glass_light_blue,
	yellow: m.glass_yellow,
	lime: m.glass_lime,
	pink: m.glass_pink,
	gray: m.glass_gray,
	light_gray: m.glass_light_gray,
	cyan: m.glass_cyan,
	purple: m.glass_purple,
	blue: m.glass_blue,
	brown: m.glass_brown,
	green: m.glass_green,
	red: m.glass_red,
	black: m.glass_black
};

/** Recipe display names, keyed by recipe id (`recipe_<id>` messages). */
export const RECIPE_NAMES: Record<string, Message> = {
	cyan_dye: m.recipe_cyan_dye,
	gray_dye: m.recipe_gray_dye,
	light_blue_dye_from_blue_white_dye: m.recipe_light_blue_dye_from_blue_white_dye,
	light_gray_dye_from_black_white_dye: m.recipe_light_gray_dye_from_black_white_dye,
	light_gray_dye_from_gray_white_dye: m.recipe_light_gray_dye_from_gray_white_dye,
	lime_dye: m.recipe_lime_dye,
	magenta_dye_from_blue_red_pink: m.recipe_magenta_dye_from_blue_red_pink,
	magenta_dye_from_blue_red_white_dye: m.recipe_magenta_dye_from_blue_red_white_dye,
	magenta_dye_from_purple_and_pink: m.recipe_magenta_dye_from_purple_and_pink,
	orange_dye_from_red_yellow: m.recipe_orange_dye_from_red_yellow,
	pink_dye_from_red_white_dye: m.recipe_pink_dye_from_red_white_dye,
	purple_dye: m.recipe_purple_dye
};

export const colorName = (c: ColorId): string => COLOR_NAMES[c]();
export const dyeName = (c: ColorId): string => DYE_NAMES[c]();
export const glassName = (c: ColorId): string => GLASS_NAMES[c]();
export const recipeName = (id: string): string => RECIPE_NAMES[id]?.() ?? id;
export const resourceName = (r: Resource): string =>
	r === 'plain_glass' ? m.resource_plain_glass() : dyeName(r);
