<script lang="ts">
	// LINKMUSICIAN: programme des œuvres (P3-15b), voir +page.server.ts.
	import SEO from '#lib/components/SEO.svelte';
	import DocumentPage from '#lib/components/linkmusician/documents/DocumentPage.svelte';
	import { PROGRAM_BLANK_LINES } from '#lib/demarches/documents';

	let { data } = $props();
	const blanks = Array.from({ length: PROGRAM_BLANK_LINES }, (_, i) => i);
</script>

<SEO title={`Programme des œuvres · ${data.band.name}`} noindex nofollow />

<DocumentPage
	back={{ href: `/groupes/${data.band.handle}`, label: 'Retour au groupe' }}
	fiche={{ href: '/demarches/premier-concert', label: 'À quoi il sert' }}
>
	<header class="space-y-1">
		<p class="text-sm text-muted-foreground print:text-black">Programme des œuvres</p>
		<h1 class="text-3xl font-black tracking-tight">{data.band.name}</h1>
		<p class="text-sm">Concert du ____ / ____ / ________ · Lieu : ______________________________</p>
	</header>

	<p class="text-sm text-muted-foreground print:text-black">
		À remettre à l’organisateur : c’est ce qui permet aux auteur·es d’être payé·es. Barre les
		morceaux que vous ne jouez pas, ajoute les reprises avec leurs auteur·es.
	</p>

	<div class="overflow-x-auto">
		<table class="w-full border-collapse text-sm">
			<thead>
				<tr class="border-b text-left">
					<th scope="col" class="py-2 pr-2">Titre</th>
					<th scope="col" class="py-2 pr-2">Paroles</th>
					<th scope="col" class="py-2 pr-2">Musique</th>
					<th scope="col" class="py-2">Durée</th>
				</tr>
			</thead>
			<tbody>
				{#each data.lines as line (line.title)}
					<tr class="h-12 border-b">
						<td class="pr-2 font-medium">{line.title}</td>
						<td class="pr-2">{line.lyrics.join(', ')}</td>
						<td class="pr-2">{line.music.join(', ')}</td>
						<td></td>
					</tr>
				{/each}
				{#each blanks as i (i)}
					<tr class="h-12 border-b" aria-label="Ligne à remplir">
						<td></td><td></td><td></td><td></td>
					</tr>
				{/each}
			</tbody>
		</table>
	</div>
	{#if data.lines.length === 0}
		<p class="text-sm">
			Aucun morceau du groupe n’est encore déclaré composé : le programme est à remplir à la main.
		</p>
	{/if}

	<footer class="border-t pt-4 text-xs text-muted-foreground print:text-black">
		Document préparé avec LinkMusician d’après les morceaux composés du groupe et leurs crédits
		confirmés. LinkMusician n’est partenaire d’aucune société d’auteurs.
	</footer>
</DocumentPage>
