<script lang="ts">
	import MinusIcon from '@lucide/svelte/icons/minus';
	import PlusIcon from '@lucide/svelte/icons/plus';
	import { Button } from '$lib/components/ui/button';
	import * as ButtonGroup from '$lib/components/ui/button-group';
	import * as Field from '$lib/components/ui/field';
	import * as InputGroup from '$lib/components/ui/input-group';
	import { formatCount, formatNumber, STACK_SIZE, type CountUnit } from '$lib/i18n/format';
	import { MAX_COUNT } from '$lib/optimizer/validate';
	import { m } from '$lib/paraglide/messages';
	import { parseCount, type CountError } from './parse-count';

	interface Props {
		id: string;
		/** Visible label. */
		label: string;
		/** Full accessible name, e.g. "White: Dye units". Defaults to `label`. */
		name?: string;
		/** Show the label only to assistive technology. */
		hideLabel?: boolean;
		value: number;
		/** Called with a valid integer when the player commits a change. */
		onCommit: (value: number) => void;
		unit: CountUnit;
		min?: number;
		max?: number;
	}

	let {
		id,
		label,
		name = label,
		hideLabel = false,
		value,
		onCommit,
		unit,
		min = 0,
		max = MAX_COUNT
	}: Props = $props();

	// What the player typed. Re-syncs whenever the committed value changes (e.g. a sample load).
	let draft = $derived(String(value));
	const parsed = $derived(parseCount(draft, min, max));
	const error = $derived(parsed.ok ? null : parsed.error);

	const messages: Record<CountError, () => string> = {
		empty: () => m.input_error_empty(),
		negative: () => m.input_error_negative(),
		integer: () => m.input_error_integer(),
		'too-large': () => m.input_error_too_large({ max: formatNumber(max) }),
		minimum: () => m.input_error_minimum({ min: formatNumber(min) })
	};

	function commit(next: number) {
		draft = String(next);
		if (next !== value) onCommit(next);
	}

	function step(delta: number) {
		const base = parsed.ok ? parsed.value : value;
		const next = base + delta;
		if (next >= min && next <= max) commit(next);
	}

	function onkeydown(event: KeyboardEvent) {
		const size = event.shiftKey ? STACK_SIZE : 1;
		if (event.key === 'ArrowUp') {
			event.preventDefault();
			step(size);
		} else if (event.key === 'ArrowDown') {
			event.preventDefault();
			step(-size);
		} else if (event.key === 'Enter') {
			event.preventDefault();
			if (parsed.ok) commit(parsed.value);
		} else if (event.key === 'Escape') {
			draft = String(value);
		}
	}

	function onblur() {
		if (parsed.ok) commit(parsed.value);
	}
</script>

<!-- Steppers are skipped by Tab so the keyboard path is field → field; ↑/↓ do the same job. -->
<Field.Field data-invalid={error ? true : undefined} class="gap-1.5">
	<Field.Label for={id} class={hideLabel ? 'sr-only' : undefined}>{label}</Field.Label>
	<ButtonGroup.Root class="w-full">
		<Button
			variant="outline"
			size="icon-touch"
			tabindex={-1}
			aria-label={m.stepper_decrease({ field: name })}
			disabled={value <= min}
			onclick={() => step(-1)}
		>
			<MinusIcon aria-hidden="true" />
		</Button>
		<InputGroup.Root class="h-11 min-w-0 flex-1">
			<InputGroup.Input
				{id}
				value={draft}
				oninput={(event) => (draft = event.currentTarget.value)}
				{onkeydown}
				{onblur}
				inputmode="numeric"
				autocomplete="off"
				spellcheck={false}
				aria-label={name}
				aria-invalid={error ? true : undefined}
				aria-describedby="{id}-hint"
				class="text-center font-heading text-base tabular-nums"
			/>
		</InputGroup.Root>
		<Button
			variant="outline"
			size="icon-touch"
			tabindex={-1}
			aria-label={m.stepper_increase({ field: name })}
			disabled={value >= max}
			onclick={() => step(1)}
		>
			<PlusIcon aria-hidden="true" />
		</Button>
		<Button
			variant="outline"
			size="icon-touch"
			tabindex={-1}
			aria-label={m.stepper_zero({ field: name })}
			disabled={value === min}
			onclick={() => commit(min)}
		>
			<span aria-hidden="true" class="font-heading tabular-nums">{formatNumber(min)}</span>
		</Button>
	</ButtonGroup.Root>
	{#if error}
		<Field.Error id="{id}-hint">{messages[error]()}</Field.Error>
	{:else}
		<Field.Description id="{id}-hint" class="text-xs tabular-nums">
			{formatCount(value, unit)}
		</Field.Description>
	{/if}
</Field.Field>
