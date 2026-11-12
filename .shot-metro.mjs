import { chromium } from '@playwright/test';
const [, , out, w, theme, ...paths] = process.argv;
const base = 'http://localhost:2000';
const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: +w, height: 900 }, colorScheme: theme === 'sombre' ? 'dark' : 'light' });
const p = await ctx.newPage();
const ready = () => p.getByRole('status', { name: "Chargement de l'application" }).waitFor({ state: 'hidden', timeout: 120000 }).catch(() => {});
if (process.env.SHOT_EMAIL !== 'aucun') {
	await p.goto(base + '/auth/login', { waitUntil: 'networkidle', timeout: 180000 });
	await ready();
	await p.locator('input[name="email"]').fill('malik-batterie-demo@demo.linkmusician.test');
	await p.locator('input[name="password"]').fill('DemoPass!2026');
	await p.getByRole('button', { name: 'Continuer' }).click();
	await p.waitForURL((u) => !u.pathname.startsWith('/auth/login'), { timeout: 60000 }).catch(() => console.log('login ?', p.url()));
}
for (const path of paths) {
	await p.goto(base + path, { waitUntil: 'networkidle', timeout: 180000 });
	await ready();
	await p.getByRole('button', { name: 'Compris' }).click({ timeout: 1500 }).catch(() => {});
	await p.waitForTimeout(1200);
	const name = (path.replace(/[/?=&@]+/g, '_') || 'racine') + `-${w}-${theme}`;
	await p.screenshot({ path: `${out}/${name}.png` });
	// Bas de page : le pied de page dans le même fond.
	await p.evaluate(() => { const c = document.querySelector('.scroll-content, [data-scrollbar]'); window.scrollTo(0, 1e6); document.querySelectorAll('*').forEach((e) => { if (e.scrollHeight > e.clientHeight + 50 && getComputedStyle(e).overflowY !== 'visible') e.scrollTop = 1e6; }); });
	await p.mouse.wheel(0, 20000);
	await p.waitForTimeout(1500);
	await p.screenshot({ path: `${out}/${name}-bas.png` });
	console.log('ok', path);
}
await b.close();
