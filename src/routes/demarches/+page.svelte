<script lang="ts">
	// LINKMUSICIAN: guide des démarches (P3-15a, D42), page-menu (D50) : les
	// fiches rangées par moment de la vie musicale, chacune ouvre sa page.
	import SEO from '#lib/components/SEO.svelte';
	import MenuList, { type MenuItem } from '#lib/components/linkmusician/MenuList.svelte';
	import { seoConfig } from '#lib/seo.config';
	import { demarcheHref, fichesByMoment, MOMENT_INFO, type Moment } from '#lib/demarches/catalog';
	import { Megaphone, Mic, Music, Scale, UsersRound } from 'lucide-svelte';

	let { data } = $props();

	const ICONS: Record<Moment, typeof Scale> = {
		creer: Music,
		publier: Megaphone,
		scene: Mic,
		groupe: UsersRound
	};
	const groups = fichesByMoment().map((g) => ({
		...g,
		items: g.fiches.map<MenuItem>((f) => ({
			href: demarcheHref(f.slug),
			icon: ICONS[g.moment],
			title: f.nav,
			text: f.summary,
			badge: f.minors ? 'Mineur·es' : null
		}))
	}));
</script>

<SEO
	title="Démarches"
	description="Protéger un morceau, être payé·e pour un concert, l’association du groupe : les démarches de la musique, expliquées simplement."
	url={`${seoConfig.site.url}/demarches`}
/>

<div class="min-h-screen w-full px-4 {data.memberShell ? 'pt-6 pb-24' : 'py-24'}">
	<div class="mx-auto max-w-3xl space-y-8">
		<header class="space-y-3">
			<span
				class="inline-flex size-12 items-center justify-center rounded-2xl bg-muted"
				aria-hidden="true"
			>
				<Scale class="size-6" />
			</span>
			<h1 class="lm-title">Les démarches</h1>
			<p class="text-lg text-muted-foreground">
				Protéger un morceau, être payé·e pour jouer, monter l’association du groupe : l’essentiel,
				au moment où la question se pose.
			</p>
		</header>

		{#each groups as group (group.moment)}
			<section class="space-y-3" aria-labelledby="moment-{group.moment}">
				<div>
					<h2 id="moment-{group.moment}" class="text-lg font-bold">
						{MOMENT_INFO[group.moment].label}
					</h2>
					<p class="text-sm text-muted-foreground">{MOMENT_INFO[group.moment].text}</p>
				</div>
				<MenuList items={group.items} label={MOMENT_INFO[group.moment].label} />
			</section>
		{/each}

		<p class="lm-tile lm-tile--flow p-4 text-sm text-muted-foreground">
			Ces fiches donnent une information générale, pas un conseil personnalisé. Chacune cite ses
			sources officielles et la date de sa dernière vérification. LinkMusician n’est lié à aucun des
			organismes cités.
		</p>
	</div>
</div>
