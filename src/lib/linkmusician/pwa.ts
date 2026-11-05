/**
 * LINKMUSICIAN: enregistrement du service worker (P0-07, D24), en production
 * seulement. En dev, `hooks.client.ts` retire au contraire tout worker (autres
 * projets sur localhost) : on ne se marche pas dessus.
 */
export function registerServiceWorker(isDev: boolean): void {
	if (isDev || typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return;
	window.addEventListener('load', () => {
		navigator.serviceWorker.register('/service-worker.js').catch((error) => {
			console.error('Service worker non enregistré :', error);
		});
	});
}
