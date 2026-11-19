/**
 * LINKMUSICIAN: aides à la déclaration des diagrammes (DIAGRAM-01).
 *
 * Une étape hérite de son processus d'inventaire (`process`) : statut,
 * références de tests et de décisions. On n'écrit à la main que ce que le
 * processus ne dit pas (préconditions, lectures, effets…), pour ne pas
 * recopier l'inventaire dans le catalogue.
 */
import { processById } from '../inventory';
import { emptyRefs, type DiagramStep, type References } from '../types';

export type StepInput = Partial<Omit<DiagramStep, 'id' | 'title' | 'actor' | 'references'>> & {
	id: string;
	title: string;
	actor: string;
	references?: Partial<References>;
};

const merge = (a: string[], b: string[] = []) => [...new Set([...a, ...b])];

export function step(input: StepInput): DiagramStep {
	const process = input.process ? processById.get(input.process) : undefined;
	if (input.process && !process) {
		// Levé à l'import : un identifiant de processus mal tapé ne passe pas les tests.
		throw new Error(`Étape ${input.id} : processus inconnu ${input.process}`);
	}
	const base = process?.references ?? emptyRefs();
	const refs = input.references ?? {};
	return {
		preconditions: [],
		inputs: [],
		validations: [],
		reads: [],
		writes: [],
		effects: [],
		permissions: [],
		transitions: [],
		next: [],
		alternatives: [],
		...input,
		errors: input.errors ?? process?.errors ?? [],
		status: input.status ?? process?.status ?? 'IMPLEMENTED',
		references: {
			decisions: merge(base.decisions, refs.decisions),
			issues: [...new Set([...base.issues, ...(refs.issues ?? [])])],
			sourceFiles: merge(base.sourceFiles, refs.sourceFiles),
			tests: merge(base.tests, refs.tests),
			docs: merge(base.docs, refs.docs)
		}
	};
}

/** Références d'une étape conceptuelle (carte, ERD, états) sans processus. */
export const refs = (r: Partial<References>): References => ({ ...emptyRefs(), ...r });
