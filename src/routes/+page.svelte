<script lang="ts">
	import AppFooter from '$lib/components/common/app-footer.svelte';
	import AppHeader from '$lib/components/common/app-header.svelte';
	import InventorySection from '$lib/components/inventory/inventory-section.svelte';
	import OptionsSection from '$lib/components/options/options-section.svelte';
	import OptimizerSync from '$lib/components/results/optimizer-sync.svelte';
	import ResultsDetails from '$lib/components/results/results-details.svelte';
	import ResultsHeadline from '$lib/components/results/results-headline.svelte';
</script>

<OptimizerSync />
<AppHeader />
<main class="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-6">
	<ResultsHeadline />
	<div
		class="grid grid-cols-1 items-start gap-6 md:grid-cols-2 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]"
	>
		<div class="flex flex-col gap-6">
			<OptionsSection />
			<InventorySection />
		</div>
		<ResultsDetails />
	</div>
</main>
<AppFooter />
