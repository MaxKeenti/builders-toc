<script lang="ts">
	import * as AlertDialog from '$lib/components/ui/alert-dialog';
	import { m } from '$lib/paraglide/messages';

	interface Props {
		open: boolean;
		title: string;
		description: string;
		confirmLabel: string;
		onConfirm: () => void;
		/** Destructive confirmations use the destructive tone. */
		destructive?: boolean;
	}

	let {
		open = $bindable(),
		title,
		description,
		confirmLabel,
		onConfirm,
		destructive = false
	}: Props = $props();
</script>

<AlertDialog.Root bind:open>
	<AlertDialog.Content>
		<AlertDialog.Header>
			<AlertDialog.Title>{title}</AlertDialog.Title>
			<AlertDialog.Description>{description}</AlertDialog.Description>
		</AlertDialog.Header>
		<AlertDialog.Footer>
			<AlertDialog.Cancel size="touch">{m.action_cancel()}</AlertDialog.Cancel>
			<AlertDialog.Action
				size="touch"
				variant={destructive ? 'destructive' : 'default'}
				onclick={() => {
					onConfirm();
					open = false;
				}}
			>
				{confirmLabel}
			</AlertDialog.Action>
		</AlertDialog.Footer>
	</AlertDialog.Content>
</AlertDialog.Root>
