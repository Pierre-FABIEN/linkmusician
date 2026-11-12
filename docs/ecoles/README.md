# Écoles, MJC, conservatoires (P5-11, D29)

Le cœur de cible du lancement (D29) : les élèves des écoles de musiques
actuelles, MJC et conservatoires, qui ne savent pas où jouer. Leur école
les fait jouer ensemble en **ateliers jam**, puis la plateforme les mène
vers les jams publiques. Conception : [07 §6](../conception/07-modes-de-jeu.md#6-le-mode-jam--jouer-pour-le-plaisir),
[06 §3.11](../conception/06-metiers.md) et [08 §15](../conception/08-carrieres-par-role.md).

## Modèle

- **Organisation `SCHOOL`** et sa fiche `SchoolProfile` (`kind` : école de
  musique, MJC, conservatoire, association). Les profs ou responsables la
  gèrent (`OWNER`) ; les élèves en sont membres (`Membership`, `MEMBER`).
  - Règles pures : `src/lib/schools/rules.ts` (types, lien, `inviteState`).
  - Service : `src/lib/server/schools/service.ts`, seul point d'écriture.
- **Ouvrir** : une personne majeure (D5), trois écoles au plus. Pas de
  métier exigé. Un·e seul·e responsable au lancement : la co-gestion par
  plusieurs profs viendra si les écoles la demandent (Q52). La
  vérification (P5-02) est recommandée, pas exigée.
- **Lien d'invitation** `SchoolInvite` : jeton de 24 octets (base64url),
  dont seul le **hachage SHA-256** est stocké ; 30 jours ; plafond
  d'usages (30 par défaut, 200 au plus), compté de façon atomique ;
  révocable ; 5 liens actifs au plus. Le lien n'est montré qu'à sa
  création. La personne qui le suit devient `MEMBER` ; le suivre deux fois
  ne compte qu'une fois.
- **Page du lien** `/ecole/[token]`, **publique** : le nom de l'école seul.
  Sans compte prêt, le jeton est gardé un jour dans le cookie `lm_ecole`
  (httpOnly), repris une fois par la garde de l'espace
  (`(app)/+layout.server.ts`) après l'inscription ou la connexion.
- **Aucune liste d'élèves publique** : pas de page `/@handle` pour une
  école ; `/ecoles/[handle]` répond 404 hors de ses membres ; la liste des
  élèves n'est montrée qu'à la gestion.

## Ateliers jam

- Une jam (P2-14b) publiée **au nom de l'école** (`issuerActorId`), lead et
  `postedById` = la personne qui publie, `Opportunity.audience = SCHOOL`.
  Écran : `/ecoles/[handle]/atelier` (la gestion seulement).
- **Visibilité** : `audienceWhere` (`server/jam/publicJams.ts`), appliqué
  dans `findJams` (agenda, page du lieu, page de la jam, « Je viens »,
  invitations reçues) et dans l'après-jam (`findRecentJam`). Le lead
  n'invite sur une place réservée que des membres de l'école.
- **Mineur·es (D5)** : la règle existante s'applique : seuls les ateliers
  finis avant 22 h (et hors lieu réservé aux adultes) sont visibles
  (`forViewer`, `endsBeforeCurfew`) ; testé.
- **Aucune XP** (D27) ; un atelier n'est jamais « jam publique tenue »
  (`markHeldIfReady`, Q53) : ni points pour l'école, ni date pour le rang
  du lieu.

## Quête « De l'atelier à la scène »

Deux objectifs du musicien (`core/quests.ts`), proposés aux seuls élèves
(`school` dans `QuestState`, lu par `workshopQuestFacts`) : venir à un
atelier de son école, puis rejoindre une jam publique (« Je viens »).

## Passeur

Un·e prof Pilier local qui présente des élèves l'obtient déjà (P4-13b).
Ouvrir le parrainage aux responsables d'école vérifiée : non au
lancement (Q23).

## RGPD

Les adhésions (prof ou élève) figurent dans l'export (`ecoles`). À
l'anonymisation : l'adhésion se clôt ; l'école dont la personne était
responsable passe à une personne de sa gestion, **jamais à un·e élève**,
sinon elle est dissoute ; on oublie qui a créé les liens.

## Tests

`src/lib/schools/rules.test.ts`, `core/core.test.ts` (quête) ;
intégration `server/schools/schools.integration.test.ts` (lien haché et
plafonné, liste réservée à la gestion, ateliers des seuls membres,
mineur·e : finis avant 22 h, quête, départ, révocation, RGPD) ; e2e
`e2e/linkmusician/ecole.spec.ts` (« la prof invite un élève, il rejoint
l'atelier puis une jam publique »).
