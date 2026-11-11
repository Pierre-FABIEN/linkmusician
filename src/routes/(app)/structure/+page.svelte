<script lang="ts">
	// LINKMUSICIAN: étape proposée après le choix des métiers (P1-03b) : groupe
	// (P3-01) et studio (P4-03a) ; les autres structures arrivent ensuite.
	import { Badge } from '#shadcn/badge';
	import { Button } from '#shadcn/button';
	import SEO from '#lib/components/SEO.svelte';
</script>

<SEO title="Ta structure" noindex nofollow />

<div class="min-h-screen w-full px-4 pt-6 pb-24 lg:px-8 lg:pt-10">
	<div class="mx-auto max-w-4xl">
		<h1 class="lm-title mb-2">Tu fais partie d'une structure&nbsp;?</h1>
		<p class="mb-6 text-sm text-muted-foreground">
			Un groupe, un studio : rattache-la à ton profil. Les labels, salles et agences arrivent
			ensuite.
		</p>

		<ul class="mb-6 space-y-2">
			<li>
				<a
					href="/groupes/nouveau"
					class="flex min-h-14 items-center justify-between rounded-lg border p-3 hover:bg-muted"
				>
					<span>Monter ou rejoindre un groupe</span>
					<span aria-hidden="true">→</span>
				</a>
			</li>
			<li>
				<!-- Studio (P4-03a) : ingés son et producteur·rices. -->
				<a
					href="/studios"
					class="flex min-h-14 items-center justify-between rounded-lg border p-3 hover:bg-muted"
				>
					<span>
						Ouvrir la fiche de ton studio
						<span class="block text-sm text-muted-foreground"
							>pour les ingés son et producteur·rices</span
						>
					</span>
					<span aria-hidden="true">→</span>
				</a>
			</li>
			<li class="flex items-center justify-between rounded-lg border p-3 opacity-70">
				<span>
					Une autre structure
					<span class="block text-sm text-muted-foreground">label, salle, agence…</span>
				</span>
				<Badge variant="secondary">plus tard</Badge>
			</li>
		</ul>

		<Button href="/espace" class="w-full">Continuer vers mon espace</Button>
	</div>
</div>
