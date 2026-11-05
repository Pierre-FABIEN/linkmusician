// Configuration SEO. LINKMUSICIAN: site, valeurs par défaut, accueil,
// contact et erreur au nom du produit ; les pages de la boutique (en veille)
// gardent leurs textes d'origine.
import { BRAND } from '#lib/linkmusician/brand';

export const seoConfig = {
	// LINKMUSICIAN: identité du produit (D9), voir `#lib/linkmusician/brand`.
	site: {
		name: BRAND.name,
		url: BRAND.url,
		description: BRAND.description,
		keywords: BRAND.keywords,
		author: BRAND.name,
		locale: 'fr_FR'
	},

	// Métadonnées par défaut
	defaults: {
		title: `${BRAND.name} — ${BRAND.tagline}`,
		description: BRAND.description,
		keywords: BRAND.keywords,
		image: '/og-default.jpg',
		type: 'website'
	},

	// Configuration des pages principales — `image` identique partout
	// (`/og-default.jpg`) tant qu'aucun visuel distinct par page n'existe.
	pages: {
		home: {
			title: `${BRAND.name} — ${BRAND.tagline}`,
			description: BRAND.description,
			keywords: BRAND.keywords,
			image: '/og-default.jpg'
		},
		blog: {
			title: 'Blog — Conseils bijoux et joaillerie',
			description:
				"Guides d'entretien, tendances et actualités de la joaillerie par MadeInDiamonds.",
			keywords: 'blog joaillerie, entretien bijoux, tendances bijoux, MadeInDiamonds',
			image: '/og-default.jpg'
		},
		products: {
			title: 'Nos bijoux — Bagues, colliers et créations en diamants',
			description:
				'Parcourez la collection MadeInDiamonds : bagues, colliers et boucles d’oreilles en métaux précieux et diamants.',
			keywords: 'bagues, colliers, boucles d’oreilles, diamants, métaux précieux, bijoux',
			image: '/og-default.jpg'
		},
		contact: {
			title: `Contact — ${BRAND.name}`,
			description: `Une question sur ${BRAND.name} ? Écris-nous.`,
			keywords: `contact, ${BRAND.name}`,
			image: '/og-default.jpg'
		},
		checkout: {
			title: 'Commande — Finalisez votre achat',
			description:
				'Finalisez votre commande de bijoux MadeInDiamonds. Paiement sécurisé et confirmation par e-mail.',
			keywords: 'commande bijoux, paiement sécurisé, joaillerie en ligne',
			image: '/og-default.jpg'
		},
		checkoutSuccess: {
			title: 'Commande confirmée — MadeInDiamonds',
			description: 'Votre commande de bijoux a été confirmée. Merci pour votre confiance.',
			keywords: 'commande confirmée, succès, MadeInDiamonds',
			image: '/og-default.jpg'
		},
		error: {
			title: `Page non trouvée — ${BRAND.name}`,
			description: `La page que tu cherches n’existe pas. Retourne à l’accueil de ${BRAND.name}.`,
			keywords: `page non trouvée, erreur 404, ${BRAND.name}`,
			image: '/og-default.jpg'
		}
		// `auth` et `admin` retirés : tout /auth/* et /admin/* est en `noindex`
		// (voir les +layout.svelte respectifs), un titre SEO dédié n'a plus
		// d'utilité pour des pages jamais indexées.
	},

	// Configuration des réseaux sociaux
	social: {
		twitter: {
			site: '@madeindiamonds',
			creator: '@madeindiamonds'
		},
		facebook: {
			appId: 'votre-app-id-facebook'
		}
	}
};
