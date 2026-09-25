<script lang="ts">
	import type { ColorId } from '$lib/data/colors';
	import { colorName, dyeName, glassName } from '$lib/i18n/names';
	import ColorSwatch, { type SwatchSize } from './color-swatch.svelte';

	interface Props {
		color: ColorId;
		/** Which name to show: the color, its dye or its stained glass. */
		kind?: 'color' | 'dye' | 'glass';
		size?: SwatchSize;
	}

	let { color, kind = 'color', size }: Props = $props();

	const name = $derived(
		kind === 'dye' ? dyeName(color) : kind === 'glass' ? glassName(color) : colorName(color)
	);
</script>

<span class="inline-flex min-w-0 items-center gap-2">
	<ColorSwatch {color} {size} />
	<span class="truncate">{name}</span>
</span>
