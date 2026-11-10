<script lang="ts">
	// LINKMUSICIAN: bulletin de partage (P3-15b), voir +page.server.ts.
	import SEO from '#lib/components/SEO.svelte';
	import DocumentPage from '#lib/components/linkmusician/documents/DocumentPage.svelte';

	let { data } = $props();
	const sheet = $derived(data.sheet);
	const day = new Intl.DateTimeFormat('fr-FR', { dateStyle: 'long', timeZone: 'Europe/Paris' });
</script>

<SEO title={`Bulletin de partage · ${data.work.title}`} noindex nofollow />

<DocumentPage
	back={{ href: `/morceaux/${data.work.id}`, label: 'Retour au morceau' }}
	fiche={{ href: '/demarches/ecrire-a-plusieurs', label: 'Comment le remplir' }}
>
	<header class="space-y-1">
		<p class="text-sm text-muted-foreground print:text-black">Bulletin de partage</p>
		<h1 class="text-3xl font-black tracking-tight">{data.work.title}</h1>
		<p class="text-sm">
			Porté par {data.work.owner}
			{#if data.work.composedAt}· composé le {day.format(new Date(data.work.composedAt))}{/if}
		</p>
	</header>

	{#if sheet.pending > 0}
		<p
			class="rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm print:hidden dark:border-amber-800 dark:bg-amber-950/40"
		>
			{sheet.pending === 1 ? 'Un crédit attend' : `${sheet.pending} crédits attendent`} sa confirmation
			: il n’apparaît pas ici. Ajoute la personne à la main si elle a écrit le morceau.
		</p>
	{/if}

	<section class="space-y-2" aria-labelledby="writers-title">
		<h2 id="writers-title" class="text-lg font-bold">
			Auteur·es, compositeur·rices, arrangeur·ses
		</h2>
		<p class="text-sm text-muted-foreground print:text-black">
			Les parts se décident ensemble et s’écrivent à la main, en pourcentage. Le total de chaque
			colonne fait 100 %.
		</p>
		<div class="overflow-x-auto">
			<table class="w-full border-collapse text-sm">
				<thead>
					<tr class="border-b text-left">
						<th scope="col" class="py-2 pr-2">Nom d’artiste</th>
						<th scope="col" class="py-2 pr-2">Nom et prénom (état civil)</th>
						<th scope="col" class="py-2 pr-2">Rôle</th>
						{#each sheet.columns as col (col)}
							<th scope="col" class="py-2 pr-2">Part {col.toLowerCase()} (%)</th>
						{/each}
						<th scope="col" class="py-2">Signature</th>
					</tr>
				</thead>
				<tbody>
					{#each sheet.writers as w (w.name)}
						<tr class="h-14 border-b align-middle">
							<td class="pr-2 font-medium">{w.name}</td>
							<td class="pr-2"></td>
							<td class="pr-2">{w.roles.join(', ')}</td>
							{#each sheet.columns as col (col)}<td class="pr-2"></td>{/each}
							<td></td>
						</tr>
					{/each}
					{#each [0, 1] as i (i)}
						<tr class="h-14 border-b" aria-label="Ligne à remplir">
							<td></td><td></td><td></td>
							{#each sheet.columns as col (col)}<td></td>{/each}
							<td></td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
		{#if sheet.writers.length === 0}
			<p class="text-sm">
				Aucun crédit d’écriture (paroles, musique, arrangement) n’est confirmé sur ce morceau :
				complète le tableau à la main.
			</p>
		{/if}
	</section>

	{#if sheet.performers.length > 0}
		<section class="space-y-2" aria-labelledby="performers-title">
			<h2 id="performers-title" class="text-lg font-bold">Interprètes, pour mémoire</h2>
			<p class="text-sm text-muted-foreground print:text-black">
				Jouer sur le morceau ouvre des droits d’artiste-interprète quand il est enregistré, pas une
				part d’auteur.
			</p>
			<ul class="list-disc pl-5 text-sm">
				{#each sheet.performers as p (p.name)}<li>{p.name} : {p.instruments.join(', ')}</li>{/each}
			</ul>
		</section>
	{/if}

	<footer class="space-y-2 border-t pt-4 text-sm">
		<p>
			Fait à ________________________, le ____ / ____ / ________, en autant d’exemplaires que de
			signataires.
		</p>
		<p class="text-xs text-muted-foreground print:text-black">
			Document préparé avec LinkMusician d’après les crédits confirmés. LinkMusician ne fixe aucune
			part et n’est partenaire d’aucune société d’auteurs. Information générale, pas un conseil
			juridique.
		</p>
	</footer>
</DocumentPage>
