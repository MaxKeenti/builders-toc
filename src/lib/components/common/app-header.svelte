<script lang="ts">
	import type { Pathname } from '$app/types';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import LanguagesIcon from '@lucide/svelte/icons/languages';
	import MoonIcon from '@lucide/svelte/icons/moon';
	import SunIcon from '@lucide/svelte/icons/sun';
	import { toggleMode } from 'mode-watcher';
	import { Button } from '$lib/components/ui/button';
	import * as ButtonGroup from '$lib/components/ui/button-group';
	import { m } from '$lib/paraglide/messages';
	import { getLocale, localizeHref, locales } from '$lib/paraglide/runtime';

	const localeNames: Record<(typeof locales)[number], () => string> = {
		en: m.locale_en,
		es: m.locale_es
	};
</script>

<header class="border-b border-border">
	<div class="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-4 py-4">
		<div class="flex flex-col gap-1">
			<h1 class="font-heading text-2xl font-semibold">{m.app_title()}</h1>
			<p class="max-w-2xl text-sm text-muted-foreground">{m.app_tagline()}</p>
		</div>
		<div class="flex items-center gap-2">
			<nav aria-label={m.locale_label()} class="flex items-center gap-1">
				<LanguagesIcon class="size-4 text-muted-foreground" aria-hidden="true" />
				<ButtonGroup.Root>
					{#each locales as locale (locale)}
						<Button
							href={resolve(localizeHref(page.url.pathname, { locale }) as Pathname)}
							variant={locale === getLocale() ? 'secondary' : 'ghost'}
							size="touch"
							hreflang={locale}
							lang={locale}
							aria-current={locale === getLocale() ? 'true' : undefined}
							data-sveltekit-reload
						>
							{localeNames[locale]()}
						</Button>
					{/each}
				</ButtonGroup.Root>
			</nav>
			<Button variant="ghost" size="icon-touch" onclick={toggleMode} aria-label={m.theme_toggle()}>
				<SunIcon class="dark:hidden" aria-hidden="true" />
				<MoonIcon class="hidden dark:block" aria-hidden="true" />
			</Button>
		</div>
	</div>
</header>
