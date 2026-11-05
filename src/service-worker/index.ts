/**
 * LINKMUSICIAN: service worker de la PWA (P0-07, D24). Prudent par principe :
 * - icônes pré-chargées ; fichiers de l'app (noms versionnés, donc jamais
 *   périmés) mis en cache au fil des visites, pas tous d'avance (mobile) ;
 * - pages : toujours le réseau, et une page « hors ligne » s'il manque ;
 * - jamais de cache pour les données, l'authentification ou l'API (rien de
 *   personnel n'est stocké sur l'appareil).
 * Enregistré en production seulement (`#lib/linkmusician/pwa`).
 */
import { assets } from '$app/manifest';
import { version } from '$app/env';
import { self as sw } from '$app/service-worker';

const CACHE = `linkmusician-${version}`;
/** Chemins absolus (le manifeste les donne relatifs au chemin de base). */
const absolute = (path: string) => new URL(path, sw.registration.scope).pathname;
/** Fichiers statiques utiles hors ligne (pas TinyMCE ni les images lourdes du socle). */
const STATIC = assets
	.map((a) => absolute(a.path))
	.filter((p) => /^\/(pwa\/|favicon|apple-touch-icon|og-default)/.test(p));
const ASSETS = new Set(STATIC);
/** Fichiers de l'app : leur nom change à chaque version. */
const isImmutable = (pathname: string) => pathname.startsWith('/_app/immutable/');

const OFFLINE_HTML = `<!doctype html><html lang="fr"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>Hors ligne — LinkMusician</title>
<style>body{margin:0;min-height:100vh;display:grid;place-items:center;font-family:system-ui,sans-serif;
background:#0a0a0a;color:#fafafa;text-align:center;padding:24px}h1{font-style:italic;text-transform:uppercase;
color:#c4b5fd}button{margin-top:16px;border:0;border-radius:12px;padding:12px 20px;font-weight:600;
background:#7c3aed;color:#fff}</style></head><body><main><h1>LinkMusician</h1>
<p>Pas de connexion pour l'instant. Tes données t'attendent : reviens dès que le réseau revient.</p>
<button onclick="location.reload()">Réessayer</button></main></body></html>`;

sw.addEventListener('install', (event) => {
	event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll([...ASSETS])));
	sw.skipWaiting();
});

sw.addEventListener('activate', (event) => {
	event.waitUntil(
		(async () => {
			for (const key of await caches.keys()) if (key !== CACHE) await caches.delete(key);
			await sw.clients.claim();
		})()
	);
});

sw.addEventListener('fetch', (event) => {
	const { request } = event;
	if (request.method !== 'GET') return;
	const url = new URL(request.url);
	if (url.origin !== sw.location.origin) return;

	if (ASSETS.has(url.pathname) || isImmutable(url.pathname)) {
		event.respondWith(
			(async () => {
				const cached = await caches.match(request);
				if (cached) return cached;
				const response = await fetch(request);
				if (response.ok && isImmutable(url.pathname)) {
					const cache = await caches.open(CACHE);
					await cache.put(request, response.clone());
				}
				return response;
			})()
		);
		return;
	}
	// Pages : réseau d'abord, page « hors ligne » sinon. Données (`__data.json`),
	// API et authentification ne sont jamais interceptées.
	if (request.mode === 'navigate') {
		event.respondWith(
			fetch(request).catch(
				() =>
					new Response(OFFLINE_HTML, {
						status: 503,
						headers: { 'Content-Type': 'text/html; charset=utf-8' }
					})
			)
		);
	}
});
