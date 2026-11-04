<script lang="ts">
	// LINKMUSICIAN: étape proposée après le choix des métiers (P1-03b). Les
	// structures arrivent plus tard : groupe en phase 3, les autres ensuite.
	import { Badge } from '#shadcn/badge';
	import { Button } from '#shadcn/button';
	import SEO from '#lib/components/SEO.svelte';
</script>

<SEO title="Ta structure" noindex nofollow />

<div class="min-h-screen w-screen px-4 py-24">
	<div class="mx-auto max-w-lg rounded-lg border p-6 shadow-lg backdrop-blur-3xl">
		<h1 class="mb-2 text-2xl font-bold">Tu fais partie d'une structure&nbsp;?</h1>
		<p class="mb-6 text-sm text-muted-foreground">
			Groupe, studio, label… Tu pourras bientôt la rattacher à ton profil. On te prévient dès que
			c'est prêt.
		</p>

		<ul class="mb-6 space-y-2">
			<li class="flex items-center justify-between rounded-lg border p-3 opacity-70">
				<span>Créer ou rejoindre un groupe</span>
				<Badge variant="secondary">bientôt</Badge>
			</li>
			<li class="flex items-center justify-between rounded-lg border p-3 opacity-70">
				<span>
					Créer ou rejoindre une autre structure
					<span class="block text-sm text-muted-foreground">studio, label, salle, agence…</span>
				</span>
				<Badge variant="secondary">plus tard</Badge>
			</li>
		</ul>

		<Button href="/espace" class="w-full">Continuer vers mon espace</Button>
	</div>
</div>
