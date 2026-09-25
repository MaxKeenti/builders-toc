<script lang="ts" module>
	import { tv, type VariantProps } from 'tailwind-variants';

	const swatchVariants = tv({
		base: 'inline-block shrink-0 rounded-sm shadow-inner ring-1 ring-foreground/20 ring-inset',
		variants: {
			size: { sm: 'size-3', md: 'size-4', lg: 'size-7' }
		},
		defaultVariants: { size: 'md' }
	});

	export type SwatchSize = VariantProps<typeof swatchVariants>['size'];
</script>

<script lang="ts">
	import { COLORS, type ColorId } from '$lib/data/colors';

	interface Props {
		/** The Minecraft color to show. */
		color: ColorId;
		size?: SwatchSize;
	}

	let { color, size }: Props = $props();

	const swatch = $derived(COLORS.find((c) => c.id === color)?.swatch);
</script>

<!-- The only place a Minecraft swatch color is rendered. Decorative: a name is always shown next to it. -->
<span
	aria-hidden="true"
	data-slot="color-swatch"
	class={swatchVariants({ size })}
	style:background-color={swatch}
></span>
