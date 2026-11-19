import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { generatedFiles } from './report';

describe('fichiers générés à jour (npm run diagram:sync)', async () => {
	const files = await generatedFiles();
	it.each(Object.keys(files))('%s', (path) => {
		expect(readFileSync(path, 'utf8'), `Lancer npm run diagram:sync`).toBe(files[path]);
	});
});
