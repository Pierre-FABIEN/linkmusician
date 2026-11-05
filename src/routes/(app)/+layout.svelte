<script lang="ts">
	// LINKMUSICIAN: coquille de l'espace connecté (P0-05b, mobile d'abord
	// P0-07). Ordinateur : onglets en haut. Mobile : bande du haut (logo,
	// compte) et barre d'onglets en bas, comme une app. La barre flottante du
	// boilerplate est masquée dans l'espace (`routes/+layout.svelte`).
	import '#lib/linkmusician/theme.css';
	import { page } from '$app/state';
	import { APP_NAV, isActive } from '#lib/linkmusician/nav';
	import { BRAND } from '#lib/linkmusician/brand';
	import { portal } from '#lib/linkmusician/portal';
	import AccountMenu from '#lib/components/linkmusician/AccountMenu.svelte';
	import Celebrations from '#lib/components/linkmusician/progress/Celebrations.svelte';

	let { children, data } = $props();

	// Signale la barre d'onglets mobile aux éléments flottants du bas.
	$effect(() => {
		document.body.classList.add('lm-has-tabbar');
		return () => document.body.classList.remove('lm-has-tabbar');
	});
</script>

<div class="lm-app">
	<header class="w-screen px-4 pt-[max(1rem,env(safe-area-inset-top))] md:pt-6">
		<div class="mx-auto flex max-w-5xl items-center gap-3">
			<a
				href="/jouer"
				class="shrink-0 bg-[image:var(--lm-gradient)] bg-clip-text text-xl font-black text-transparent italic uppercase"
				>{BRAND.name}</a
			>
			<nav aria-label="Espace" class="hidden min-w-0 flex-1 md:block">
				<ul class="flex gap-1 overflow-x-auto rounded-2xl border bg-card/80 p-1 backdrop-blur">
					{#each APP_NAV as item (item.href)}
						{@const active = isActive(item, page.url.pathname)}
						<li class="shrink-0">
							<a
								href={item.href}
								aria-current={active ? 'page' : undefined}
								class="flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium transition {active
									? 'bg-primary text-primary-foreground shadow'
									: 'text-muted-foreground hover:bg-muted hover:text-foreground'}"
							>
								<item.icon class="size-4" aria-hidden="true" />
								{item.label}
								{#if item.href === '/messages' && data.unread > 0}<span
										class="rounded-full bg-fuchsia-600 px-1.5 text-[11px] font-bold text-white"
										aria-label="{data.unread} non lu{data.unread > 1 ? 's' : ''}"
										>{data.unread}</span
									>{/if}
								{#if item.soon}<span
										class="rounded-full bg-muted px-1.5 text-[10px] font-semibold text-muted-foreground uppercase"
										>bientôt</span
									>{/if}
							</a>
						</li>
					{/each}
				</ul>
			</nav>
			<div class="ml-auto shrink-0">
				<AccountMenu user={data.user ?? null} />
			</div>
		</div>
	</header>

	{@render children()}

	<Celebrations items={data.celebrations.items} upTo={data.celebrations.upTo} />

	<!-- Mobile : barre d'onglets fixe, hors du conteneur de défilement. -->
	<nav
		use:portal
		aria-label="Espace (mobile)"
		class="lm-app fixed inset-x-0 bottom-0 z-40 border-t bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden"
	>
		<ul class="mx-auto grid max-w-md grid-cols-5">
			{#each APP_NAV as item (item.href)}
				{@const active = isActive(item, page.url.pathname)}
				<li>
					<a
						href={item.href}
						aria-current={active ? 'page' : undefined}
						class="flex min-h-14 flex-col items-center justify-center gap-0.5 px-1 text-[11px] font-medium {active
							? 'text-primary'
							: 'text-muted-foreground'}"
					>
						<span class="relative">
							<item.icon class="size-5" aria-hidden="true" />
							{#if item.href === '/messages' && data.unread > 0}<span
									class="absolute -top-1.5 -right-2.5 min-w-4 rounded-full bg-fuchsia-600 px-1 text-center text-[10px] leading-4 font-bold text-white"
									aria-label="{data.unread} non lu{data.unread > 1 ? 's' : ''}">{data.unread}</span
								>{/if}
						</span>
						<span class="max-w-full truncate">{item.label}</span>
					</a>
				</li>
			{/each}
		</ul>
	</nav>
</div>
