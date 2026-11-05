// LINKMUSICIAN (P2-01) : charge sur la recherche de musicien·nes
// (`/decouvrir`), requête PostGIS et filtres.
//
// Prérequis : `npm run seed:demo` (12 comptes `<handle>@demo.linkmusician.test`,
// mot de passe `DemoPass!2026`, tous avec une ville).
// Lancer avec : `BASE_URL=http://localhost:2000 k6 run k6/search.js`
//
// Un utilisateur virtuel par compte : la recherche est limitée en débit par
// personne (60 d'affilée, puis une toutes les 2 s), et c'est la recherche
// qu'on mesure ici, pas la limite.
import http from 'k6/http';
import { check, sleep } from 'k6';
import { BASE_URL } from './lib/config.js';
import { login } from './lib/auth.js';

const HANDLES = [
	'malik-batterie',
	'ines-chant',
	'theo-basse',
	'clara-guitare',
	'samir-son',
	'nora-prod',
	'lucas-sax',
	'zoe-violon',
	'kevin-metal',
	'awa-clavier',
	'hugo-dj',
	'manon-ukulele'
];
const PASSWORD = __ENV.SEED_DEMO_PASSWORD || 'DemoPass!2026';
const QUERIES = [
	'',
	'?rayon=50',
	'?instrument=batterie&rayon=50',
	'?genre=jazz&rayon=100',
	'?recherche=JAMS&reciproque=1',
	'?niveau=3&rayon=25'
];

export const options = {
	scenarios: {
		search: {
			executor: 'per-vu-iterations',
			vus: HANDLES.length,
			iterations: 20,
			maxDuration: '3m'
		}
	},
	thresholds: {
		http_req_failed: ['rate<0.01'],
		'http_req_duration{name:recherche}': ['p(95)<800']
	}
};

export default function () {
	if (__ITER === 0) {
		const res = login(`${HANDLES[__VU - 1]}@demo.linkmusician.test`, PASSWORD);
		check(res, { connexion: (r) => r.status === 200 });
	}
	const query = QUERIES[Math.floor(Math.random() * QUERIES.length)];
	const res = http.get(`${BASE_URL}/decouvrir${query}`, { tags: { name: 'recherche' } });
	check(res, {
		'recherche 200': (r) => r.status === 200,
		'pas limitée': (r) => !String(r.body).includes('Beaucoup de recherches')
	});
	sleep(2);
}
