<script lang="ts">
	import ColorLabel from '$lib/components/common/color-label.svelte';
	import CountField from '$lib/components/common/count-field.svelte';
	import * as Card from '$lib/components/ui/card';
	import type { ColorId } from '$lib/data/colors';
	import { colorName } from '$lib/i18n/names';
	import { m } from '$lib/paraglide/messages';
	import { inventory } from '$lib/state';

	interface Props {
		color: ColorId;
	}

	let { color }: Props = $props();

	const name = $derived(colorName(color));
</script>

<Card.Root size="sm">
	<Card.Header>
		<Card.Title>
			<h3><ColorLabel {color} size="lg" /></h3>
		</Card.Title>
	</Card.Header>
	<Card.Content class="flex flex-col gap-3">
		<CountField
			id="dye-{color}"
			label={m.inventory_dye_label()}
			name={m.inventory_field_aria({ color: name, field: m.inventory_dye_label() })}
			value={inventory.get('dye', color)}
			onCommit={(v) => inventory.set('dye', color, v)}
			unit="dye"
		/>
		<CountField
			id="glass-{color}"
			label={m.inventory_glass_label()}
			name={m.inventory_field_aria({ color: name, field: m.inventory_glass_label() })}
			value={inventory.get('stainedGlass', color)}
			onCommit={(v) => inventory.set('stainedGlass', color, v)}
			unit="stained-glass"
		/>
	</Card.Content>
</Card.Root>
