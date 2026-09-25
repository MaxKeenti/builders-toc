<script lang="ts">
	import PackageIcon from '@lucide/svelte/icons/package';
	import SectionCard from '$lib/components/common/section-card.svelte';
	import { COLORS } from '$lib/data/colors';
	import { m } from '$lib/paraglide/messages';
	import InventoryActions from './inventory-actions.svelte';
	import InventorySlot from './inventory-slot.svelte';
</script>

<SectionCard
	id="inventory"
	title={m.section_inventory()}
	description={m.section_inventory_description()}
	icon={PackageIcon}
>
	<div class="flex flex-col gap-4">
		<InventoryActions />
		<p class="text-xs text-muted-foreground">{m.inventory_keyboard_hint()}</p>
		<div class="grid gap-3 lg:grid-cols-2">
			{#each COLORS as color (color.id)}
				<InventorySlot color={color.id} />
			{/each}
		</div>
	</div>
</SectionCard>
