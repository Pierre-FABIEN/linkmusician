# Collaborations

Module LinkMusician (lot P2-06, conception 02 §2.2 et §6). Le lot central
de la phase 2 : c'est ce qui fait progresser **ensemble**.

## Parcours

1. Dans une conversation ouverte (les deux l'ont acceptée), « Vous avez
   joué ensemble ? Proposer une collaboration » : type (jam, répétition,
   session ou remplacement, enregistrement), titre, date (jusqu'à 60 jours
   en arrière, 90 jours à l'avance).
2. **Déjà passée** : proposer vaut confirmation pour soi ; l'autre n'a
   qu'à **confirmer** (ou « Ce n'est pas exact », qui l'annule).
3. **À venir** : l'autre accepte ; chacun confirme une fois la date passée.
4. Confirmée par tous : `collaboration.completed` part vers le moteur, dans
   la même transaction.

Les collaborations à confirmer apparaissent sur le tableau de bord
(« À confirmer »). Chacun peut annuler tant qu'elle n'est pas confirmée.

## Ce que ça rapporte

**400 XP × multiplicateur**, pour chacun (règle `collaboration.completed`) :

- **rendement décroissant** avec la même personne sur 12 mois : 100 %, 50 %,
  25 %, puis 0 ;
- **poids de confiance** de l'autre : TL0 ×0,1, TL1 ×0,5, TL2 et plus ×1.
  Deux comptes neufs gagnent donc 40 XP chacun : le farming entre comptes
  neufs ne paie pas.

Elle compte aussi pour les paliers (« En réseau », « Collaborateur »), la
confiance (collaboration avec un membre de confiance pour TL2) et « Ce
que d'autres confirment » sur le profil public.

## Règles

- Seulement avec un **contact** (conversation acceptée des deux côtés) et
  jamais à travers un blocage.
- Une seule collaboration **effective par conversation et date déclarée**
  (`happenedOn`, jour UTC stocké), quels que soient le proposant et le type.
  PROPOSED, ACCEPTED et COMPLETED bloquent une autre proposition ; CANCELLED
  permet une nouvelle ligne avec de nouveaux consentements. L’ancienne ligne,
  ses auteurs et actes restent conservés. Le doublon est refusé avec le même
  message, sans retourner les données d’un ancien objet.
- Les propositions concurrentes prennent une clé commune et relisent le count
  dans la transaction de création des participants et de la notification.
  Une annulation non validée peut encore entraîner un refus ; après son commit,
  on peut réessayer. Aucun nouvel événement ni gain n’est ajouté pour un doublon.
- **RGPD** : collaborations dans l'export ; elles survivent à
  l'anonymisation d'un participant (« Compte supprimé » pour l'autre).

## Code et tests

- Règles pures : `src/lib/collaborations/rules.ts` (dates, état, étape
  suivante).
- Service : `src/lib/server/collaborations/service.ts`.
- Intégration (rendements décroissants, poids de confiance) :
  `PROGRESSION_INTEGRATION=1 npx vitest --run src/lib/server/progression/collaborations`.
- Concurrence PostgreSQL : `proposal.integration.test.ts` (barrières, attente
  de verrou observée, rollback et finalisation), activé avec
  `PROGRESSION_INTEGRATION=1` ; [contrat et preuves](../plan/preuves-arch-met-02c.md).
- E2E : `e2e/linkmusician/candidatures.spec.ts` (annonce → candidature →
  conversation → collaboration confirmée → XP des deux côtés).

## Liées au morceau (P4-06)

- **Types** ajoutés : mixage, mastering, sonorisation d'une date,
  production (`COLLAB_KINDS`), en plus de l'enregistrement.
- **Prestation** : on dit qui l'assure (moi, l'autre personne, ou
  personne pour un enregistrement entre musicien·nes) ;
  `CollaborationParticipant.service`. La personne doit avoir le métier
  (`checkProvider`). L'événement `collaboration.completed` porte
  `services` : l'ingé son ou la productrice gagne sur sa piste, les
  musicien·nes sur la leur, sauf sur un mixage ou un mastering (Q1 de
  [a-trancher](../plan/a-trancher.md)).
- **Morceau** : `Collaboration.workId`, un morceau géré par l'une des deux
  personnes. Ceux de l'autre ne sont proposés que composés (une idée reste
  privée). Le morceau de l'annonce d'origine est présélectionné
  (`collabFormContext`).
- **Étapes du morceau** : terminée, la collaboration renseigne la première
  fois `Work.recordedAt`, `mixedAt`, `masteredAt` ou `producedAt`
  (`KIND_WORK_STAGE`) ; la page du morceau les affiche.
- **RGPD** : prestation et morceau dans l'export des collaborations.
- **Tests** : `rules.test.ts`, `work.integration.test.ts`, e2e
  `e2e/linkmusician/collaborations-morceau.spec.ts`.

## Concerts (P5-06)

- **Proposer** : type « Concert » dans une conversation ; le groupe (où
  joue l'une des deux personnes) et le lieu ou l'organisation (que gère
  l'autre) sont obligatoires (`checkGigParties`, `gigPartiesOfPair`). Venu
  d'un plateau (P5-05a), le type, le groupe retenu et l'hôte sont
  préremplis. Un lieu ou une organisation est obligatoire : un·e
  organisateur·rice seul·e crée son organisation, gratuite (Q35).
- **Terminé** : la personne qui joue gagne la collaboration (400 ×
  multiplicateurs) ; le côté hôte ne la gagne pas (`hostIds` sur
  `collaboration.completed`), il gagne l'événement tenu (`gig.held`, piste
  organisateur·rice, 200 × rendement par artiste × confiance de qui
  confirme ; 100 par groupe à sa toute première date). Le lieu y gagne son
  rang. L'étape du groupe suit (voir [docs/etapes](../etapes/README.md#concerts-et-tournée-vérifiés-p5-06)).

## Refus et annulations conservés (DASH-05k)

Le journal privé de la conversation distingue désormais le refus d’une proposition
(« Ce n’est pas exact ») de son annulation explicite (« Annuler »), avec l’auteur
réel et la date de chaque nouvel acte. Les validations précédentes restent
visibles ; les anciennes annulations sans date de décision ne sont pas reprises.
L’export RGPD inclut ces actes et l’anonymisation affiche « Compte supprimé ».

Les dates `declinedAt` et `cancelledAt` sont portées par la participation de la
personne qui agit. Leur écriture et le changement d’état partagent la transaction
et le verrou `collaboration:` des réponses et confirmations. Une erreur annule
les deux ; les rejeux ne changent pas la première décision. Aucune notification
ni progression n’est ajoutée. Le blocage interdit toujours les réponses et les
confirmations ; les participants peuvent encore annuler après blocage. Gérer le
projet ne donne aucun accès à ce journal.

Tests : `history.integration.test.ts` couvre notamment les courses, rollbacks,
export, anonymisation et suppression du morceau ; `collaborations-morceau.spec.ts`
joue le refus et l’annulation par l’interface, avec clavier, dates HTML et 390 px.

## Appréciations conservées (DASH-05l)

Le volet privé conserve désormais les nouvelles attributions et reprises, avec
leur auteur et leur date. Redonner après reprise ajoute un acte ; une appréciation
active ne peut pas être modifiée directement. Les anciennes appréciations ne sont
pas converties en actes ; leur nouvelle reprise peut apparaître seule.

Le registre minimal `CollaborationAppreciationAct` ne copie ni qualité ni instrument.
Attribution et reprise relisent l’état sous le verrou `collaboration:` et écrivent
l’acte dans la transaction métier. Rejeux refusés, cycles successifs conservés,
aucun effet moteur ou notification supplémentaire. La reprise reste possible après
blocage ; l’attribution garde COMPLETED, participation, TL1 et absence de blocage.

Les actes sont inclus dans l’export RGPD ; un auteur effacé devient « Compte
supprimé ». Le registre survit à la suppression RGPD des appréciations reçues,
mais suit les cascades physiques de la collaboration et de son auteur.
Détails d’audit et de migration : [journal d’activité](../conception/16-journal-activite.md).
Tests : `endorse.integration.test.ts`, `anonymisation.integration.test.ts`,
projection unitaire et parcours `collaborations-morceau.spec.ts`.
