/**
 * Professionnel·le de label (ONB-09) : un·e responsable catalogue n'est pas
 * forcé·e de chercher des artistes ; la politique de démos ne se demande
 * qu'aux A&R. Le label lui-même est une organisation vérifiée à part.
 */
import { intent, opt } from './helpers';
import { territoryField, type TrackCatalog, availabilityFields } from './types';

export const labelCatalog: TrackCatalog = {
	offers: [
		intent('LISTENING', 'Écouter des projets', 'Découvrir et écouter des démos.'),
		intent(
			'DISTRIBUTION_SERVICE',
			'Distribuer',
			'Mettre des sorties en plateformes et en magasins.'
		),
		intent('RELEASE_SUPPORT', 'Accompagner une sortie', 'Planning, fabrication, lancement.'),
		intent('PROMOTION', 'Promouvoir', 'Faire connaître une sortie.'),
		intent('LICENSING_SERVICE', 'Licencier', 'Céder ou prendre des enregistrements en licence.')
	],
	needs: [
		intent('FIND_ARTISTS', 'Des artistes', 'À signer ou à accompagner.'),
		intent('FIND_RELEASES', 'Des sorties', 'Des projets prêts à sortir.'),
		intent('FIND_PRODUCTIONS', 'Des productions', 'Des enregistrements à produire ou licencier.'),
		intent(
			'FIND_DISTRIBUTION_PARTNERS',
			'Des partenaires de distribution',
			'Distributeurs, plateformes.'
		),
		intent('FIND_PROFESSIONALS', 'Des professionnel·les', 'Managers, bookers, attachés de presse.')
	],
	fields: [
		territoryField(),
		{
			id: 'ar_target',
			label: 'A&R : artistes ciblés',
			kind: 'multi',
			required: true,
			when: { specializations: ['A_AND_R'] },
			options: [
				opt('EMERGING', 'Émergents'),
				opt('FIRST_RELEASES', 'Premières sorties'),
				opt('ESTABLISHED', 'Établis')
			]
		},
		{
			id: 'demo_policy',
			label: 'A&R : politique de démos',
			kind: 'single',
			required: true,
			when: { specializations: ['A_AND_R'] },
			options: [
				opt('OPEN', 'Ouverte'),
				opt('CLOSED', 'Fermée'),
				opt('INVITATION', 'Sur invitation')
			]
		},
		...availabilityFields()
	]
};
