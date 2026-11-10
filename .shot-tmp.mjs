import { chromium } from '@playwright/test';
const [,, url, out, w, h] = process.argv;
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: +w, height: +h } });
await p.goto(url, { waitUntil: 'networkidle', timeout: 120000 });
await p.getByRole('status', { name: "Chargement de l'application" }).waitFor({ state: 'hidden', timeout: 120000 }).catch(() => {});
await p.waitForTimeout(2500);
await p.screenshot({ path: out });
await b.close();
