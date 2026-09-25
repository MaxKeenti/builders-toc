<script lang="ts">
	import DownloadIcon from '@lucide/svelte/icons/download';
	import FlaskConicalIcon from '@lucide/svelte/icons/flask-conical';
	import RotateCcwIcon from '@lucide/svelte/icons/rotate-ccw';
	import UploadIcon from '@lucide/svelte/icons/upload';
	import { toast } from 'svelte-sonner';
	import ConfirmDialog from '$lib/components/common/confirm-dialog.svelte';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { SCREENSHOT_SAMPLE } from '$lib/data/samples';
	import { m } from '$lib/paraglide/messages';
	import { inventory, options } from '$lib/state';
	import { parseExportFile, toExportFile } from '$lib/state/schema';
	import { summarizeIssues } from './import-issues';

	let confirmSample = $state(false);
	let confirmReset = $state(false);
	let fileInput = $state<HTMLInputElement | null>(null);

	const sampleInventory = {
		dye: SCREENSHOT_SAMPLE.dye,
		stainedGlass: SCREENSHOT_SAMPLE.stainedGlass
	};

	function loadSample() {
		inventory.replace(sampleInventory);
		options.setPlainGlassUnlimited(SCREENSHOT_SAMPLE.plainGlass === null);
		if (SCREENSHOT_SAMPLE.plainGlass !== null) {
			options.setPlainGlassQuantity(SCREENSHOT_SAMPLE.plainGlass);
		}
		toast.success(m.toast_sample_loaded());
	}

	function requestSample() {
		// Only ask when loading would overwrite the player's own edits.
		if (inventory.isEmpty || inventory.equals(sampleInventory)) loadSample();
		else confirmSample = true;
	}

	function reset() {
		inventory.reset();
		options.reset();
		toast.success(m.toast_reset());
	}

	function exportJson() {
		const file = toExportFile(inventory.snapshot, options.snapshot);
		const blob = new Blob([JSON.stringify(file, null, '\t')], { type: 'application/json' });
		const url = URL.createObjectURL(blob);
		const link = document.createElement('a');
		link.href = url;
		link.download = 'dye-optimizer-inventory.json';
		link.click();
		URL.revokeObjectURL(url);
		toast.success(m.toast_exported());
	}

	async function importJson(event: Event & { currentTarget: HTMLInputElement }) {
		const file = event.currentTarget.files?.[0];
		event.currentTarget.value = '';
		if (!file) return;
		const result = parseExportFile(await file.text());
		if (!result.ok) {
			toast.error(m.toast_import_failed(), {
				description: summarizeIssues(result.issues),
				duration: 12_000
			});
			return;
		}
		inventory.replace(result.value.inventory);
		options.replace(result.value.options);
		toast.success(m.toast_imported());
	}
</script>

<div class="flex flex-wrap gap-2">
	<Button variant="secondary" size="touch" onclick={requestSample}>
		<FlaskConicalIcon data-icon="inline-start" aria-hidden="true" />
		{m.action_load_sample()}
	</Button>
	<Button variant="outline" size="touch" onclick={() => fileInput?.click()}>
		<UploadIcon data-icon="inline-start" aria-hidden="true" />
		{m.action_import()}
	</Button>
	<Button variant="outline" size="touch" onclick={exportJson}>
		<DownloadIcon data-icon="inline-start" aria-hidden="true" />
		{m.action_export()}
	</Button>
	<Button variant="ghost" size="touch" onclick={() => (confirmReset = true)}>
		<RotateCcwIcon data-icon="inline-start" aria-hidden="true" />
		{m.action_reset()}
	</Button>
	<Input
		bind:ref={fileInput}
		type="file"
		accept="application/json,.json"
		class="hidden"
		onchange={importJson}
	/>
</div>

<ConfirmDialog
	bind:open={confirmSample}
	title={m.confirm_sample_title()}
	description={m.confirm_sample_description()}
	confirmLabel={m.confirm_sample_action()}
	onConfirm={loadSample}
/>
<ConfirmDialog
	bind:open={confirmReset}
	title={m.confirm_reset_title()}
	description={m.confirm_reset_description()}
	confirmLabel={m.confirm_reset_action()}
	onConfirm={reset}
	destructive
/>
