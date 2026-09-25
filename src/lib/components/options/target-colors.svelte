<script lang="ts">
	import ColorLabel from '$lib/components/common/color-label.svelte';
	import { Button } from '$lib/components/ui/button';
	import * as Field from '$lib/components/ui/field';
	import * as ToggleGroup from '$lib/components/ui/toggle-group';
	import { COLOR_IDS, isColorId } from '$lib/data/colors';
	import { m } from '$lib/paraglide/messages';
	import { options } from '$lib/state';

	const selected = $derived(options.current.targetColors);
</script>

<Field.Set data-invalid={selected.length === 0 ? true : undefined}>
	<Field.Legend variant="label">{m.target_colors_label()}</Field.Legend>
	<div class="flex gap-2">
		<Button variant="outline" size="touch" onclick={() => options.setTargetColors([...COLOR_IDS])}>
			{m.target_select_all()}
		</Button>
		<Button variant="ghost" size="touch" onclick={() => options.setTargetColors([])}>
			{m.target_select_none()}
		</Button>
	</div>
	<ToggleGroup.Root
		type="multiple"
		variant="outline"
		size="touch"
		spacing={2}
		class="flex-wrap justify-start"
		value={selected}
		onValueChange={(value) => options.setTargetColors(value.filter(isColorId))}
		aria-label={m.target_colors_label()}
	>
		{#each COLOR_IDS as color (color)}
			<ToggleGroup.Item value={color}>
				<ColorLabel {color} size="sm" />
			</ToggleGroup.Item>
		{/each}
	</ToggleGroup.Root>
	{#if selected.length === 0}
		<Field.Error>{m.target_error_no_colors()}</Field.Error>
	{/if}
</Field.Set>
