<script lang="ts">
	import SlidersHorizontalIcon from '@lucide/svelte/icons/sliders-horizontal';
	import CountField from '$lib/components/common/count-field.svelte';
	import SectionCard from '$lib/components/common/section-card.svelte';
	import * as Field from '$lib/components/ui/field';
	import { Switch } from '$lib/components/ui/switch';
	import * as ToggleGroup from '$lib/components/ui/toggle-group';
	import type { Mode } from '$lib/optimizer/types';
	import { m } from '$lib/paraglide/messages';
	import { options } from '$lib/state';
	import { MODES } from '$lib/state/schema';
	import TargetColors from './target-colors.svelte';

	const modeLabels: Record<Mode, { label: () => string; description: () => string }> = {
		balanced: { label: m.mode_balanced, description: m.mode_balanced_description },
		'maximum-output': {
			label: m.mode_maximum_output,
			description: m.mode_maximum_output_description
		},
		target: { label: m.mode_target, description: m.mode_target_description }
	};
</script>

<SectionCard id="options" title={m.section_options()} icon={SlidersHorizontalIcon}>
	<Field.Group>
		<Field.Set>
			<Field.Legend variant="label">{m.mode_label()}</Field.Legend>
			<ToggleGroup.Root
				type="single"
				variant="outline"
				size="touch"
				class="w-full flex-wrap"
				value={options.current.mode}
				onValueChange={(value) => {
					// A single toggle group can be cleared; keep a mode selected.
					if (value) options.setMode(value as Mode);
				}}
			>
				{#each MODES as mode (mode)}
					<ToggleGroup.Item value={mode} class="flex-1 whitespace-normal"
						>{modeLabels[mode].label()}</ToggleGroup.Item
					>
				{/each}
			</ToggleGroup.Root>
			<Field.Description>{modeLabels[options.current.mode].description()}</Field.Description>
		</Field.Set>

		{#if options.current.mode === 'target'}
			<CountField
				id="target-count"
				label={m.target_label()}
				value={options.current.target}
				onCommit={(v) => options.setTarget(v)}
				unit="stained-glass"
				min={1}
			/>
			<TargetColors />
		{/if}

		<Field.Set>
			<Field.Legend variant="label">{m.plain_glass_label()}</Field.Legend>
			<Field.Field orientation="horizontal" class="min-h-11">
				<Switch
					id="plain-glass-unlimited"
					checked={options.current.plainGlassUnlimited}
					onCheckedChange={(checked) => options.setPlainGlassUnlimited(checked)}
				/>
				<Field.Content>
					<Field.Label for="plain-glass-unlimited">{m.plain_glass_unlimited()}</Field.Label>
					<Field.Description>{m.plain_glass_unlimited_hint()}</Field.Description>
				</Field.Content>
			</Field.Field>
			{#if !options.current.plainGlassUnlimited}
				<CountField
					id="plain-glass-quantity"
					label={m.plain_glass_quantity()}
					value={options.current.plainGlassQuantity}
					onCommit={(v) => options.setPlainGlassQuantity(v)}
					unit="plain-glass"
				/>
			{/if}
		</Field.Set>
	</Field.Group>
</SectionCard>
