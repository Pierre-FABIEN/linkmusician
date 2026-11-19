/**
 * LINKMUSICIAN: inventaire complet des processus (DIAGRAM-01).
 *
 * `PROCESSES` = actions de formulaire + endpoints et jobs + processus conçus
 * ou prévus. `OUT_OF_SCOPE` dit ce qui est volontairement laissé hors de la
 * cartographie, avec la raison : le test de couverture du code n'accepte
 * aucune action qui ne soit ni inventoriée ni explicitement écartée.
 */
import type { ProcessEntry } from '../types';
import { expandEndpoint, expandGroup } from './define';
import { ENDPOINTS } from './endpoints';
import { PLANNED_PROCESSES } from './planned';
import { READ_PROCESSES } from './reads';
import { ROUTE_GROUPS } from './routes';

export const PROCESSES: readonly ProcessEntry[] = [
	...ROUTE_GROUPS.flatMap(expandGroup),
	...ENDPOINTS.map(expandEndpoint),
	...READ_PROCESSES,
	...PLANNED_PROCESSES
];

/** Préfixes de routes écartés de la cartographie, et pourquoi. */
export const OUT_OF_SCOPE: readonly { prefix: string; reason: string }[] = [
	{ prefix: '/checkout', reason: 'Boutique du boilerplate en veille (D6)' },
	{ prefix: '/products', reason: 'Boutique du boilerplate en veille (D6)' },
	{ prefix: '/suivi-commande', reason: 'Boutique du boilerplate en veille (D6)' },
	{ prefix: '/admin/products', reason: 'Boutique du boilerplate en veille (D6)' },
	{ prefix: '/admin/promo', reason: 'Boutique du boilerplate en veille (D6)' },
	{ prefix: '/admin/gift-cards', reason: 'Boutique du boilerplate en veille (D6)' },
	{ prefix: '/admin/returns', reason: 'Boutique du boilerplate en veille (D6)' },
	{ prefix: '/admin/sales', reason: 'Boutique du boilerplate en veille (D6)' },
	{ prefix: '/admin/livraison', reason: 'Boutique du boilerplate en veille (D6)' },
	{ prefix: '/admin/tva', reason: 'Boutique du boilerplate en veille (D6)' },
	{ prefix: '/admin/exports', reason: 'Export comptable de la boutique (D6)' },
	{ prefix: '/admin/blog', reason: 'Blog du boilerplate (D6)' },
	{ prefix: '/admin/settings', reason: 'Réglages de la boutique (D6)' },
	{ prefix: '/admin/identite', reason: 'Identité de l’entreprise pour les factures (D6)' },
	{
		prefix: '/admin/users',
		reason: 'Administration des comptes du boilerplate (hors parcours métier)'
	},
	{ prefix: '/auth/settings/address', reason: 'Adresses de livraison de la boutique (D6)' },
	{ prefix: '/auth/settings/returns', reason: 'Retours de la boutique (D6)' },
	{ prefix: '/auth/settings/saved-payments', reason: 'Moyens de paiement de la boutique (D6)' },
	{ prefix: '/auth/settings/factures', reason: 'Factures de la boutique (D6)' },
	{ prefix: '/api/wishlist', reason: 'Boutique (D6)' },
	{ prefix: '/api/stock-alerts', reason: 'Boutique (D6)' },
	{ prefix: '/api/bundles', reason: 'Boutique (D6)' },
	{ prefix: '/api/save-cart', reason: 'Boutique (D6)' },
	{ prefix: '/api/promo', reason: 'Boutique (D6)' },
	{ prefix: '/api/gift-cards', reason: 'Boutique (D6)' },
	{ prefix: '/api/sendcloud', reason: 'Livraison de la boutique (D6)' },
	{ prefix: '/api/webhooks', reason: 'Paiement Stripe et Sendcloud de la boutique (D6)' },
	{ prefix: '/api/jobs/accounting-export', reason: 'Job de la boutique (D6)' },
	{ prefix: '/api/jobs/cart-recovery', reason: 'Job de la boutique (D6)' },
	{ prefix: '/api/jobs/invoice-email', reason: 'Job de la boutique (D6)' },
	{ prefix: '/api/jobs/loyalty-check', reason: 'Job de la boutique (D6)' },
	{ prefix: '/api/jobs/post-payment', reason: 'Job de la boutique (D6)' },
	{ prefix: '/api/jobs/recently-viewed-reminder', reason: 'Job de la boutique (D6)' },
	{
		prefix: '/api/jobs/referral-reward',
		reason: 'Parrainage de la boutique (D6), distinct du parrainage musical'
	},
	{ prefix: '/api/jobs/review-reminder', reason: 'Job de la boutique (D6)' },
	{ prefix: '/api/jobs/stock-alerts', reason: 'Job de la boutique (D6)' },
	{ prefix: '/api/jobs/wishlist-price-alert', reason: 'Job de la boutique (D6)' },
	{ prefix: '/_lab', reason: 'Laboratoire de maquettes, 404 en production' },
	{ prefix: '/diagram', reason: 'Melokiva Diagram lui-même : lecture seule, aucune mutation' }
];

export const outOfScope = (route: string) =>
	OUT_OF_SCOPE.find((o) => route === o.prefix || route.startsWith(`${o.prefix}/`)) ?? null;

export const processById = new Map(PROCESSES.map((p) => [p.id, p]));
