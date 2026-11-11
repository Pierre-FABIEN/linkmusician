<script lang="ts">
	// LINKMUSICIAN: mes morceaux (P3-11), voir +page.server.ts.
	import { enhance } from '$app/forms';
	import { toast } from 'svelte-sonner';
	import SEO from '#lib/components/SEO.svelte';
	import { plural } from '#lib/jam/log';
	import { Music, Plus } from 'lucide-svelte';

	let { data, form } = $props();

	$effect(() => {
		if (form?.message) toast.success(form.message);
	});
</script>

<SEO title="Mes morceaux" noindex nofollow />

<div class="min-h-screen w-full px-4 pt-6 pb-24 lg:px-8 lg:pt-10">
	<div class="mx-auto max-w-7xl space-y-8">
		<div class="space-y-2">
			<a href="/espace" class="text-sm text-muted-foreground underline">← Mon parcours</a>
			<h1 class="lm-title flex items-center gap-2">
				<Music class="size-7" aria-hidden="true" /> Mes morceaux
			</h1>
			<p class="text-sm text-muted-foreground">
				Une idée reste entre vous. Une fois composé, le morceau apparaît sur vos profils avec ses
				crédits.
			</p>
		</div>

		{#if form?.error}
			<p role="alert" class="rounded-md border border-destructive p-3 text-sm text-destructive">
				{form.error}
			</p>
		{/if}

		{#if data.toConfirm.length > 0}
			<section class="space-y-3" aria-labelledby="confirm-title">
				<h2 id="confirm-title" class="text-xl font-bold">On te crédite</h2>
				<ul class="grid gap-2 md:grid-cols-2">
					{#each data.toConfirm as w (w.id)}
						<li class="lm-tile lm-tile--flow space-y-3 border-primary p-4">
							<p class="text-sm">
								<a href="/morceaux/{w.id}" class="font-semibold underline">{w.title}</a>
								{#if w.band}· {w.band.name}{/if}
								{#if w.invitedBy}<span class="text-muted-foreground">
										· de la part de {w.invitedBy}</span
									>{/if}
							</p>
							<div class="flex flex-wrap gap-2">
								<form method="POST" action="?/confirm" use:enhance>
									<input type="hidden" name="workId" value={w.id} />
									<button class="lm-btn">C’est bien moi</button>
								</form>
								<form method="POST" action="?/decline" use:enhance>
									<input type="hidden" name="workId" value={w.id} />
									<button class="min-h-11 rounded-full border px-4">Ce n’est pas moi</button>
								</form>
							</div>
						</li>
					{/each}
				</ul>
			</section>
		{/if}

		<section class="space-y-3" aria-labelledby="works-title">
			<div class="flex flex-wrap items-center justify-between gap-2">
				<h2 id="works-title" class="text-xl font-bold">Morceaux</h2>
				<a href="/morceaux/nouveau" class="lm-btn gap-2">
					<Plus class="size-4" aria-hidden="true" /> Nouvelle idée
				</a>
			</div>
			{#if data.works.length === 0}
				<p class="lm-tile lm-tile--flow p-4 text-sm text-muted-foreground">
					Pas encore de morceau. Note une idée, même avec un titre provisoire : tu pourras créditer
					celles et ceux qui la jouent avec toi.
				</p>
			{:else}
				<ul class="grid gap-2 sm:grid-cols-2">
					{#each data.works as w (w.id)}
						<li>
							<a
								href="/morceaux/{w.id}"
								class="lm-tile lm-tile--flow flex min-h-11 flex-wrap items-center justify-between gap-2 p-4"
							>
								<span class="min-w-0">
									<span class="block truncate font-semibold">{w.title}</span>
									<span class="text-sm text-muted-foreground">
										{w.band ? w.band.name : 'À moi'} · {plural(w.credits, 'crédit')}
										{#if w.openRoles > 0}· {plural(w.openRoles, 'rôle', 'rôles')} à pourvoir{/if}
									</span>
								</span>
								<span
									class="shrink-0 rounded-full border px-3 py-1 text-xs font-semibold {w.state ===
									'COMPOSED'
										? 'border-primary text-primary'
										: 'text-muted-foreground'}"
								>
									{w.state === 'COMPOSED' ? 'Composé' : 'Idée'}
								</span>
							</a>
						</li>
					{/each}
				</ul>
			{/if}
		</section>
	</div>
</div>
