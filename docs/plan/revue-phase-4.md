# Revue de fin de phase 4 (11/11/2026)

Bilan de la phase 4, fiches de la phase 5 relues, lots de la phase 5 au
tableau et scénario de démo à rejouer à la main. Aucune décision nouvelle
n'a été prise. Les choix qui restent ont une valeur par défaut dans
[a-trancher.md](./a-trancher.md), et le §4 les rappelle.

## 1. Critères de la phase

La conception ([05 §3](../conception/05-mvp-roadmap.md#3-roadmap)) ne
donne pas de critères chiffrés pour la phase 4. On reprend le critère de
fin de chaque fiche ([phase-4-6.md](./phase-4-6.md)). Chacun est couvert
par un test, et tous les e2e ont tourné le 11/11/2026 :

| Lot           | Critère de fin                                                                         | Où c'est vérifié                                                                                |
| ------------- | -------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| P4-01         | Temps simulé pour atteindre chaque rang jugé crédible                                  | `progression/core/personas-son.test.ts`                                                         |
| P4-02a, b     | Un ingé son complète son profil et apparaît dans la recherche par métier               | `e2e/linkmusician/inge-son`                                                                     |
| P4-03a        | Je crée la fiche de mon studio                                                         | `e2e/linkmusician/studio`                                                                       |
| P4-03b        | Co-gestion : invitation, acceptation, transmission                                     | `e2e/linkmusician/studio-gestion`, `studios/service.integration.test.ts`                        |
| P4-03c        | Une session ne compte que confirmée par un·e client·e ; rangs Actif et Reconnu         | `e2e/linkmusician/studio-sessions`, `studios/service.integration.test.ts`                       |
| P4-04         | Une productrice complète son profil                                                    | `e2e/linkmusician/producteur`                                                                   |
| P4-05         | Seuls les profils du métier visé voient l'annonce                                      | `e2e/linkmusician/annonces-metier`                                                              |
| P4-06         | Une session confirmée fait passer le morceau « enregistré » et crédite les deux pistes | `e2e/linkmusician/collaborations-morceau`, `collaborations/work.integration.test.ts`            |
| P4-07, P4-07b | Un crédit non confirmé n'apparaît nulle part                                           | `works/service.integration.test.ts`                                                             |
| P4-09         | L'enregistrement avec un·e pro vérifie l'étape du groupe                               | `milestones/recording.integration.test.ts`                                                      |
| P4-10         | Campagne d'un morceau, de la composition à la production                               | `e2e/linkmusician/campagne`, `milestones/recording.integration.test.ts`                         |
| P4-13a        | Les coups de pouce s'appuient sur le réseau réel ; aucun texte culpabilisant           | `career/nudges.integration.test.ts`, `career/nudges.test.ts`, `e2e/linkmusician/coups-de-pouce` |
| P4-13b        | Une présentation sans collaboration ne débloque rien                                   | `career/introductions.integration.test.ts`, `e2e/linkmusician/parrainage`                       |

**Invariants relus** : aucun gain de la phase n'entre dans la réputation,
la confiance ou le tri. Le studio gagne un rang, jamais d'XP (Q13, testé
dans `studio-sessions`). Le parrainage et les coups de pouce ne lisent
que des faits (palier, réseau), jamais l'XP. Toutes les nouvelles
données personnelles (profils de métier, studios, présentations) sont
dans l'export et l'anonymisation RGPD.

**Hors périmètre** : la conception plaçait aussi la vitrine des
propositions (P4-08), la messagerie temps réel (P4-12) et un premium
musicien en phase 4. Ces trois lots viennent **après le lancement**
(§4 ter du plan) et restent ⬜.

## 2. État des lots

- **Livrés** : P4-01, P4-02a et b, P4-03a à c, P4-04 à P4-07b, P4-09,
  P4-10, P4-13a et b.
- **Après le lancement** : P4-08 (vitrine, gratuité à trancher, Q3),
  P4-11 (radar des pros), P4-12 (temps réel, D8).
- **Ailleurs dans le plan** : P0-01 reste ⏸ (suite e2e complète à
  relancer d'un bloc) ; P3-10a et P3-10 ferment la marche avant
  l'ouverture.

**Corrigé pendant la revue** : quatre specs e2e étaient périmées.
`studio` lisait le rang sans le préfixe ajouté en P4-03c. `etapes`
prenait « Date » pour trois champs. `carriere` et `campagne` comptaient
les déblocages comme des actes. Le code de l'app n'avait pas de défaut.

**À faire sur la machine** : `CRON_SECRET` manque dans `.env`, si bien
que `notifications.spec.ts` échoue en local (M3).

## 3. Barème

`personas-son.test.ts` (P4-01) calibre les métiers du son sur six
personas, du home studio au studio associatif. Le barème des
musicien·nes n'a pas changé. La phase n'ajoute **aucune XP nouvelle** :
le studio gagne un rang (Q13), et les coups de pouce comme le succès
_Passeur_ ne rapportent rien. Les gains proposés en 08 §6 pour les
studios restent donc non appliqués.

## 4. Fiches de la phase 5 relues

Les fiches de [phase-4-6.md](./phase-4-6.md) restent valables. Elles
changent sur ce qui existe déjà :

| Lot   | Ajustement                                                                                                                                                                                                                                                                                                                                           |
| ----- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| P5-01 | `VENUE_HOST` : par défaut, **pas de nouvelle piste** (Q18). Un lieu se gère comme un studio : une organisation avec co-gestion. La personne garde ses métiers, et programmer relève de la piste Organisateur·rice (`PROMOTER`)                                                                                                                       |
| P5-02 | La vérification **manuelle** existe (P3-09 : SIRET, lien officiel, modération), mais la demande ne s'ouvre que depuis la page d'un groupe. L'API Recherche d'entreprises est déjà branchée pour les lieux (P2-14d). Reste : contrôle automatique du SIRET avant la modération, demande ouverte aux studios et aux lieux, droits liés, retrait        |
| P5-03 | Le lieu **existe déjà** dans l'annuaire (`Venue` : type, commune, SIRET, matériel, `claimedByActorId`). Revendiquer, c'est rattacher la fiche à une organisation `VENUE` gérée comme un studio (fiche, publication, photos, co-gestion de P4-03). Lot trop gros : **à découper** à son ouverture (revendication niveau 1, fiche et agenda, niveau 2) |
| P5-04 | Les jams publiques dans un lieu existent (P2-14b, P2-14c). Restent : la récurrence, les animateur·rices affilié·es, « prêt·e à animer » et les suggestions de leads                                                                                                                                                                                  |
| P5-05 | La piste `PROMOTER` existe, marquée « bientôt » (`available: false`). L'ouvrir suit la liste d'ouverture d'un métier, comme P4-02 et P4-04                                                                                                                                                                                                           |
| P5-06 | `GIG` n'est pas proposable aujourd'hui (comme `JAM`, D27). Le rouvrir avec un lieu ou un organisateur vérifié. Le passage de « Premier concert » et « Tournée » à `VERIFIED` peut reprendre le modèle de P4-09 (`verifyRecordingFromCollaboration`)                                                                                                  |
| P5-07 | Pistes `MANAGER` et `BOOKER` présentes et marquées « bientôt », comme `PROMOTER`                                                                                                                                                                                                                                                                     |
| P5-08 | La carte joue les actes I à IV ; l'acte V suit le même modèle (`#lib/career/map`)                                                                                                                                                                                                                                                                    |
| P5-11 | Inchangé ; s'appuie sur P5-02 (vérification) et sur les jams (P2-14c)                                                                                                                                                                                                                                                                                |

Les lots du lancement (§4 ter) sont P5-01 à P5-08 et P5-11. P5-00, P5-09
et P5-10 (validation juridique, offre pro, réservation) viennent après
le lancement. Les douze lots entrent dans le tableau §5.

**Préalables hors code** : demander à la DINUM si un service privé peut
se raccorder à ProConnect (D31, niveau 2 de la revendication). Lister
les lieux toulousains qui tiennent une jam (§7 du plan).

## 5. Démo du parcours

Comptes : le tien et deux comptes dans des fenêtres privées. Commence sur
mobile (outils de développement, 390 px).

| #   | Où                                   | Ce qu'on fait                                                                | Ce qu'on doit voir                                                         |
| --- | ------------------------------------ | ---------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| 1   | `/qui-es-tu`, `/profil/son`          | Choisir « Ingé son », cocher la prise de son, ajouter un travail en écoute   | Carte « Ingé son » et rang sur `/@handle`                                  |
| 2   | `/decouvrir?metier=inge-son`         | Chercher depuis un autre compte                                              | Le profil apparaît, la spécialité est affichée                             |
| 3   | `/studios`                           | Ouvrir un studio, remplir salle, tarif, horaires, ville ; publier            | « Ouvert », page publique sans adresse                                     |
| 4   | Fiche du studio, section « Gestion » | Inviter le 2ᵉ compte (producteur·rice) ; il accepte depuis « Mes studios »   | Les deux gèrent la fiche                                                   |
| 5   | `/annonces/nouvelle`                 | « Qui cherches-tu ? » Ingé son, prise de son, liée à un morceau composé      | Seuls les ingés son la voient en suggestion                                |
| 6   | Conversation                         | Proposer un enregistrement « au studio », sur le morceau ; l'autre confirme  | Morceau « Enregistré », crédit de prise de son, session du studio          |
| 7   | Conversation (producteur·rice)       | Proposer la production du morceau ; confirmer                                | « Campagne bouclée » sur la fiche du morceau, acte IV franchi sur la carte |
| 8   | `/espace/coups-de-pouce`             | Compte resté sans progrès 21 jours (à préparer en base)                      | Une à trois idées tirées du réseau, sans reproche                          |
| 9   | `/espace/parrainage`                 | Compte Pilier local : présenter deux personnes du réseau ; elles collaborent | Notification aux deux, puis « Ont collaboré » et succès _Passeur_          |

Chaque friction d'UX notée pendant la démo va dans la revue UX d'avant
le lancement (§4 ter), pas dans un lot de la phase 5.
