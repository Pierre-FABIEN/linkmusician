<script lang="ts">
	// LINKMUSICIAN: coquille de l'espace connecté (P0-05b) : navigation de
	// l'espace et couleurs LinkMusician. La garde est dans +layout.server.ts.
	import '#lib/linkmusician/theme.css';
	import { page } from '$app/state';
	import { APP_NAV, isActive } from '#lib/linkmusician/nav';

	let { children } = $props();
</script>

<div class="lm-app">
	<div class="w-screen px-4 pt-24">
		<nav aria-label="Espace" class="mx-auto max-w-5xl">
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
							{#if item.soon}<span
									class="rounded-full bg-muted px-1.5 text-[10px] font-semibold text-muted-foreground uppercase"
									>bientôt</span
								>{/if}
						</a>
					</li>
				{/each}
			</ul>
		</nav>
	</div>
	{@render children()}
</div>
