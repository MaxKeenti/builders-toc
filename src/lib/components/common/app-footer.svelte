<script lang="ts">
	import { RECIPE_DATA_VERSION } from '$lib/data/recipes';
	import { m } from '$lib/paraglide/messages';
</script>

<footer class="border-t border-border">
	<p class="mx-auto max-w-7xl px-4 py-6 text-xs text-muted-foreground">
		{m.app_footer({ version: RECIPE_DATA_VERSION })}
	</p>
</footer>
