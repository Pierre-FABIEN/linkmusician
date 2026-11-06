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

<div class="min-h-screen w-screen px-4 pt-6 pb-24">
	<div class="mx-auto max-w-2xl space-y-8">
		<div class="space-y-2">
			<a href="/espace" class="text-sm text-muted-foreground underline">← Mon parcours</a>
			<h1 class="flex items-center gap-2 text-3xl font-black tracking-tight">
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
				<ul class="space-y-2">
					{#each data.toConfirm as w (w.id)}
						<li class="space-y-3 rounded-2xl border border-primary bg-card p-4">
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
									<button
										class="min-h-11 rounded-full bg-primary px-4 font-semibold text-primary-foreground"
										>C’est bien moi</button
									>
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
				<a
					href="/morceaux/nouveau"
					class="inline-flex min-h-11 items-center gap-2 rounded-full bg-primary px-4 font-semibold text-primary-foreground"
				>
					<Plus class="size-4" aria-hidden="true" /> Nouvelle idée
				</a>
			</div>
			{#if data.works.length === 0}
				<p class="rounded-2xl border bg-card p-4 text-sm text-muted-foreground">
					Pas encore de morceau. Note une idée, même avec un titre provisoire : tu pourras créditer
					celles et ceux qui la jouent avec toi.
				</p>
			{:else}
				<ul class="space-y-2">
					{#each data.works as w (w.id)}
						<li>
							<a
								href="/morceaux/{w.id}"
								class="flex min-h-11 flex-wrap items-center justify-between gap-2 rounded-2xl border bg-card p-4 hover:border-primary"
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
