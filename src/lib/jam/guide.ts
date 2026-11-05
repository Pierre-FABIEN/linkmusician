/**
 * Mode jam : le guide « Ta prochaine étape » (P2-12b). Une seule action à la
 * fois, de la ville à la jam confirmée, jusqu'à l'invitation à passer en
 * carrière. Module pur.
 */
export type JamState = {
	hasCity: boolean;
	/** Peut s'afficher dispo (pas les mineur·es, D5). */
	canBeDispo: boolean;
	isDispo: boolean;
	/** A une conversation ouverte (des deux côtés). */
	hasConversation: boolean;
	/** Jams ou répétitions confirmées des deux côtés. */
	confirmedJams: number;
};

export type JamStep = {
	index: number;
	total: number;
	title: string;
	text: string;
	href: string;
	cta: string;
};

const TOTAL = 5;

export function jamNextStep(s: JamState): JamStep {
	const step = (index: number, rest: Omit<JamStep, 'index' | 'total'>): JamStep => ({
		index,
		total: TOTAL,
		...rest
	});
	if (!s.hasCity) {
		return step(1, {
			title: 'Indique ta ville',
			text: 'Pour voir les jams et les musicien·nes près de chez toi.',
			href: '/profil/ville',
			cta: 'Indiquer ma ville'
		});
	}
	if (!s.isDispo && !s.hasConversation && s.confirmedJams === 0) {
		return s.canBeDispo
			? step(2, {
					title: 'Mets-toi dispo',
					text: 'Dis aux musicien·nes du coin que tu as envie de jouer ce soir, demain ou ce week-end.',
					href: '#dispo',
					cta: 'Je suis dispo'
				})
			: step(2, {
					title: 'Repère une jam',
					text: 'Regarde les jams ouvertes près de chez toi, dans des lieux publics.',
					href: '#jams',
					cta: 'Voir les jams'
				});
	}
	if (!s.hasConversation && s.confirmedJams === 0) {
		return step(3, {
			title: 'Écris à un·e musicien·ne',
			text: 'Propose de jouer à quelqu’un de dispo, ou réponds à une jam ouverte.',
			href: '#dispos',
			cta: 'Voir qui est dispo'
		});
	}
	if (s.confirmedJams === 0) {
		return step(4, {
			title: 'Après la jam, confirmez-la',
			text: 'Dans votre conversation, proposez la collaboration et confirmez-la tous les deux : vous gagnez vos points.',
			href: '/messages',
			cta: 'Ouvrir mes messages'
		});
	}
	return step(5, {
		title: 'Et maintenant, un projet ?',
		text: 'Tu as joué avec d’autres musicien·nes : monte un groupe ou un morceau en passant en mode carrière.',
		href: '/jouer',
		cta: 'Passer en mode carrière'
	});
}
