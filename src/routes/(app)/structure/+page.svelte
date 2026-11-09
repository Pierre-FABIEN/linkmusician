<script lang="ts">
	// LINKMUSICIAN: étape proposée après le choix des métiers (P1-03b). Les
	// structures arrivent plus tard : groupe en phase 3, les autres ensuite.
	import { Badge } from '#shadcn/badge';
	import { Button } from '#shadcn/button';
	import SEO from '#lib/components/SEO.svelte';
</script>

<SEO title="Ta structure" noindex nofollow />

<div class="min-h-screen w-full px-4 pt-6 pb-24 lg:px-8 lg:pt-10">
	<div class="mx-auto max-w-4xl rounded-3xl border bg-card p-5 shadow-sm sm:p-8 lg:p-10">
		<h1 class="mb-2 text-3xl font-black tracking-tight sm:text-4xl">
			Tu fais partie d'une structure&nbsp;?
		</h1>
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
