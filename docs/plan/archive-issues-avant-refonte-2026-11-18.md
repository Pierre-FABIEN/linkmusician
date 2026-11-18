# Archive des spécifications des issues ouvertes — 18/11/2026

> Snapshot avant restructuration du backlog. Source : GitHub. Ce document conserve les descriptions initiales et les constats historiques ; le suivi actif se fait dans les issues réécrites et la feuille de route.

---

## #14 — [EPIC] Inscription adaptative multirôle et profils métier progressifs

[Issue GitHub](https://github.com/Pierre-FABIEN/linkmusician/issues/14)

## État consolidé — 16/11/2026

Publication vérifiée le 16/11/2026 : `origin/main` contient `9a73d455ab03fff83ce9c1993b60b02fb1b42660` (ls-remote et ascendance des commits contrôlés). Aucun déploiement de production établi.

Socle d’inscription livré pour les six métiers ouverts ; label/édition/communication restent « bientôt ». ONB-01 à ONB-12b et ONB-13a sont publiés. Restent ONB-12c (#26), ONB-13b (#27) et la recette complète ONB-14 (#28) : l’épopée reste ouverte. Les espaces métier sont suivis séparément dans #30.

---

# Objectif produit
Refondre l'inscription LinkMusician en parcours **court, adaptatif et multirôle**, puis permettre l'enrichissement progressif des fiches métier. Chaque métier et spécialisation doit fournir des données structurées permettant de rapprocher **offres** et **besoins** réels. Cette Epic documente le chantier, pas une demande de réécriture du code existant.

## Décisions validées en revue produit (12/11/2026)
- Inscription courte avant l'accès aux premières mises en relation ; profil professionnel approfondi depuis l'espace utilisateur.
- Plusieurs métiers par personne, un métier principal, **minimum d'informations pour chacun**.
- Référentiel métier → professions/spécialités (sélection multiple) → compétences pertinentes.
- Formulaires conditionnels par métier et spécialité.
- Deux rubriques distinctes pour **chaque métier** : « Ce que je propose » et « Ce que je recherche ».
- Les informations communes (compte, commune, mobilité, disponibilité générale) ne sont pas dupliquées.
- Progression, crédits et preuves réels, non déduits automatiquement d'une simple auto-déclaration.
- Aucun nouveau métier ne doit forcer l'utilisateur à sélectionner un instrument s'il n'est pas musicien.

## Point de départ historique — avant ONB-02

Ce repérage initial ne décrit plus l’état courant : les guards et formulaires adaptatifs ont été livrés par ONB-02 et suivants.
- `src/lib/actors/tracks.ts` : 9 pistes, 4 actuellement disponibles ; badge « bientôt » pour 5.
- `src/routes/qui-es-tu/` et `TrackPicker.svelte` : sélection multi-métier + principal.
- `src/lib/onboarding/steps.ts` / `src/lib/server/onboarding.ts` : étapes fixes, `instrumentCount>0` requis pour **tout** le monde.
- `/demarrer/{instruments,genres,ville,intention,resultat}` : écrans et guards existants ; intention orientée musicien.
- Profils spécialisés déjà présents : `/profil/son`, `/profil/production`, `/profil/organisateur`.
- Docs à respecter : `docs/conception/06-metiers.md`, `08-carrieres-par-role.md`, `docs/decisions/README.md`, `docs/plan/a-trancher.md`, D15/D20/D27/D47.
- Les métiers « bientôt » ne deviennent **pas** actifs par inadvertance : activation produit séparée.

## Contrat de données transverse (cible, à adapter au schéma existant)
- `Person` / `Actor` : identité et consentements ; `PersonTrack` : métier + principal.
- `TrackSpecialization` : spécialité stable (`trackKind`, `slug`, `label`, `status`), multi-sélection ; séparation des libellés et IDs ; coexistence avec les enums existantes.
- `PersonTrackSpecialization` : spécialités choisies par personne et par métier ; aucune « profession » imposée si elle ne s'applique pas.
- `TrackOffer` / `TrackNeed` (noms indicatifs) : **deux listes distinctes de codes normalisés par métier**, intentions actives modifiables ; dates de mise à jour ; possibilité de désactiver les sollicitations.
- `TrackProfile` ou profils spécifiques existants : stocker les attributs métier (types, booléens, listes référentielles, périmètre, conditions) sans JSON arbitraire pour les champs filtrés.
- Champs `null` = inconnu ; ne jamais interpréter « inconnu » comme « non » ; ne pas inférer compétence, statut pro, disponibilité ni droits.
- Métadonnées d'exposition : privé / membres / public selon le champ ; données sensibles privées par défaut.
- Distinguer **personne** et **organisation** (groupe, lieu, studio, agence, label, éditeur, média) et confirmer les liens de représentation.

## Séquence et sous-issues
1. ONB-01 Référentiel commun
2. ONB-02 Moteur et routing de formulaires
3. ONB-03 Musicien
4. ONB-04 Ingé son
5. ONB-05 Producteur
6. ONB-06 Manager
7. ONB-07 Booker
8. ONB-08 Organisateur
9. ONB-09 Label
10. ONB-10 Éditeur
11. ONB-11 Communication
12. ONB-12 Profil progressif
13. ONB-13 Découverte/matching
14. ONB-14 E2E transverse

## Critères globaux
- Un compte **non musicien** peut terminer l'inscription sans instrument.
- Plusieurs métiers génèrent plusieurs mini-formulaires, sans redemander les champs communs.
- Une inscription interrompue reprend la première étape **réellement manquante**.
- Aucune exposition de données privées ; validation serveur, autorisations par personne/métier, contrôles de modification.
- Compatible Svelte 5, SvelteKit, TypeScript, Superforms/Zod, Prisma, tests Vitest/Playwright ; accessibilité clavier, mobile, erreurs claires.
- Aucune activation automatique des métiers non livrés.
- Ajustement des modèles et des validations **sans casser les profils déjà créés**.

## Hors périmètre de cette Epic
Refonte détaillée des dashboards métier, gestion contractuelle des droits, vérification légale automatisée, paiement et algorithme de classement opaque. Les dashboards feront l'objet d'une Epic séparée. Aucun modèle de matching basé sur l'XP.

## Questions laissées à examiner en cours d'implémentation
Libellés finaux et granularité de certaines spécialités ; compatibilité migrations avec les enums existantes ; articulation « amateur/semi-pro/pro » (déclaratif) ; critères obligatoires selon spécialisation. Les valeurs proposées dans les issues sont des **propositions détaillées**, à confronter aux règles déjà décidées, sans les considérer comme un arbitrage automatique.


## Suivi opérationnel — réalisation des tickets
- [x] [ONB-01](https://github.com/Pierre-FABIEN/linkmusician/issues/15)
- [x] [ONB-02](https://github.com/Pierre-FABIEN/linkmusician/issues/16)
- [x] [ONB-03 — Musicien](https://github.com/Pierre-FABIEN/linkmusician/issues/17)
- [x] [ONB-04 — Ingé son](https://github.com/Pierre-FABIEN/linkmusician/issues/18)
- [x] [ONB-05 — Producteur](https://github.com/Pierre-FABIEN/linkmusician/issues/19)
- [x] [ONB-06 — Manager](https://github.com/Pierre-FABIEN/linkmusician/issues/20)
- [x] [ONB-07 — Booker](https://github.com/Pierre-FABIEN/linkmusician/issues/21)
- [x] [ONB-08 — Organisateur](https://github.com/Pierre-FABIEN/linkmusician/issues/22)
- [x] [ONB-09 — Label](https://github.com/Pierre-FABIEN/linkmusician/issues/23)
- [x] [ONB-10 — Éditeur](https://github.com/Pierre-FABIEN/linkmusician/issues/24)
- [x] [ONB-11 — Communication](https://github.com/Pierre-FABIEN/linkmusician/issues/25)
- [ ] [ONB-12 — Enrichissement](https://github.com/Pierre-FABIEN/linkmusician/issues/26) (12a et 12b ✅ publiés, 12c à faire)
- [ ] [ONB-13 — Matching](https://github.com/Pierre-FABIEN/linkmusician/issues/27) (13a recherche par offres ✅ publié ; 13b annonces qualifiées à faire)
- [ ] [ONB-14 — E2E](https://github.com/Pierre-FABIEN/linkmusician/issues/28) (en continu)
- [x] [#29 — Qualification des formulaires pour le matching](https://github.com/Pierre-FABIEN/linkmusician/issues/29) : audit fait, matrice dans `docs/conception/06-metiers.md` §1.3, décisions D61 à D64

**Dépendances recommandées :** ONB-01 → ONB-02 → ONB-03..11 ; ONB-12 après le socle et en parallèle des profils ; ONB-13 après stabilisation des offres/besoins ; ONB-14 en continu et validation finale.





---

## #26 — [ONB-12] Enrichissement progressif des profils et complétude contextuelle

[Issue GitHub](https://github.com/Pierre-FABIEN/linkmusician/issues/26)

## État au 12/11/2026
- [x] **ONB-12a** : récapitulatif d'inscription (D60)
- [x] **ONB-12b** : complétude par métier, « Qui voit quoi » en 3 blocs, « ouvert aux sollicitations », `/@handle` filtré par lecteur (D61, commit 6068d51)
- [ ] **ONB-12c** : portfolio, matériel, conditions ; visibilité de `rate`/`gear` des pages historiques ; formation et répertoire du groupe (D64) ; « postproduction »

---

Epic parente : https://github.com/Pierre-FABIEN/linkmusician/issues/14

> **Statut :** spécification d'implémentation proposée. Respecter les décisions existantes et les fonctionnalités livrées ; ne pas remplacer une fonction opérationnelle par une maquette. En cas de conflit documentaire, signaler le point avant migration.

### But
Ne pas exiger le portfolio, l'équipement ni les détails professionnels dès le premier accès, mais rendre leur ajout simple et utile.

### À faire
- Sur le profil / espace utilisateur : fiche de complétude **par métier**, champs manquants et bénéfice concret (« ajout de spécialité → apparaitre pour la bonne demande »), sans transformer la complétude en rang ou XP abusif.
- Sections par métier : compétences avancées, expériences, équipements, médias/portfolio, disponibilités, conditions indicatives, références et liens organisationnels.
- Données communes une fois (ville, rayon, visibilité), données métier par piste ; bascule de fiche, ajout/retrait de métier, sauvegarde progressive.
- Entrées contextuelles au moment d'une candidature/recherche : proposer de compléter le champ manquant, sans bloquer toute l'application hors besoin réel.
- Confidentialité par champ, consentement de publication des références, distinction déclaré / confirmé / vérifié.
- Conserver les écrans `/profil/son`, `/profil/production`, `/profil/organisateur`, profil musical et les éléments de carrière déjà livrés.

### Acceptation
- Compte à 2 métiers : progression et champs séparés, sans demander deux fois ville.
- Une spécialité retirée ne détruit pas ses crédits historiques.
- Interface mobile accessible et sauvegarde robuste ; aucun utilisateur existant ne perd ses données.
- Le contenu manquant est affiché en contexte, pas sous forme de blocage permanent.

### Règles transverses
- Inscription courte : demander les champs marqués **requis** ; les autres sont facultatifs et complétables ensuite.
- « **Je propose** » et « **Je recherche** » sont des sélections indépendantes, enregistrées **par métier**.
- Valeurs structurées (IDs stables), validation Zod serveur, contrôles d'accès, messages d'erreur accessibles ; ne pas inventer des compétences ni afficher un statut « vérifié » sur déclaration.
- Préserver les données et fonctionnalités existantes ; mise à jour des tests Vitest et Playwright liés au changement.



---

## #27 — [ONB-13] Découverte et matching métier fondés sur offres et besoins

[Issue GitHub](https://github.com/Pierre-FABIEN/linkmusician/issues/27)

## État consolidé au 16/11/2026 : livraison partielle
- [x] **ONB-13a** : recherche par offres (D62), sans migration ; scénario #29 n° 2 (commit 2426612, publication vérifiée sur origin/main)
- [ ] **ONB-13b** : annonces qualifiées (D63 : rémunération, formation, engagement, présence), migration additive ; scénarios #29 1, 3 et 4

---

Epic parente : https://github.com/Pierre-FABIEN/linkmusician/issues/14

> **Statut :** spécification d'implémentation proposée. Respecter les décisions existantes et les fonctionnalités livrées ; ne pas remplacer une fonction opérationnelle par une maquette. En cas de conflit documentaire, signaler le point avant migration.

### But
Exploiter les données structurées produites à l'inscription pour filtrer les opportunités et profils pertinents, sans tri par XP.

### À faire
- Contrat normalisé `offerCodes[]` et `needCodes[]` **par métier**, spécialités, genres, zone, distance/remote, statut ouvert aux sollicitations, contraintes optionnelles.
- Un besoin précis détermine le matching : (a) Thomas cherche batteur rock dispo pour groupe ; (b) cherche ingénieur d'enregistrement sur Toulouse ; (c) programmateur cherche duo acoustique. Les critères diffèrent.
- Filtres obligatoires **si le besoin l'exige** (spécialité, rayon, format, permissions), puis affinités souples (genres, ambition, références). Ne pas appliquer une pondération unique à tous les métiers.
- Filtrer comptes suspendus/masqués, visibilité, blocages, mineurs selon les règles existantes ; pas de divulgation de coordonnées.
- Ne pas traiter « champ absent » comme faux ; afficher l'incertitude plutôt que prétendre certifier une compatibilité.
- Exploiter `/decouvrir` et moteur geo existants avant de créer un nouveau service ; résultats initiaux selon métier principal, états vides honnêtes.
- Option future de classement/notifications hors périmètre si non spécifiée.

### Acceptation
- Profil avec métier + spécialité mais sans offre correspondante n'apparait pas abusivement comme prestataire actif.
- Matching adapté aux 3 scénarios ci-dessus ; filtre distance, genre, disponibilité, visibilité et sécurité.
- Aucune donnée privée exposée dans les payloads, tests d'accès et intégration.

### Règles transverses
- Inscription courte : demander les champs marqués **requis** ; les autres sont facultatifs et complétables ensuite.
- « **Je propose** » et « **Je recherche** » sont des sélections indépendantes, enregistrées **par métier**.
- Valeurs structurées (IDs stables), validation Zod serveur, contrôles d'accès, messages d'erreur accessibles ; ne pas inventer des compétences ni afficher un statut « vérifié » sur déclaration.
- Préserver les données et fonctionnalités existantes ; mise à jour des tests Vitest et Playwright liés au changement.




---

## #28 — [ONB-14] Validation E2E du parcours adaptatif multirôle

[Issue GitHub](https://github.com/Pierre-FABIEN/linkmusician/issues/28)

## État au 12/11/2026
- [x] Musicien·ne seul·e, ingé son sans instrument, producteur·rice, manager, organisateur·rice, métier « bientôt »
- [x] Multirôle (musicien·ne + producteur·rice + booker), reprise, correction sans perte, accessibilité
- [x] Profil par métier : complétude, visibilité (visiteur, membre, personne), réglage d'un métier non détenu refusé (`profil-metiers.spec.ts`)
- [ ] Label, édition, communication (sans les ouvrir)
- [ ] Booker programmateur contre booker d'artistes ; organisateur·rice jam contre festival
- [ ] Codes d'un autre métier refusés côté serveur ; parcours à 390 px ; assistant D47 ; mineur·es
- [ ] Scénarios #29 1 à 4 et 7 (après ONB-13a et 13b)

---

Epic parente : https://github.com/Pierre-FABIEN/linkmusician/issues/14

> **Statut :** spécification d'implémentation proposée. Respecter les décisions existantes et les fonctionnalités livrées ; ne pas remplacer une fonction opérationnelle par une maquette. En cas de conflit documentaire, signaler le point avant migration.

### Matrice de test
- Musicien seul (Thomas guitare/chant) : instrumentation, genre, intention, premier résultat.
- Ingé son seul **sans instrument** ; mixage + façade ; sauvegarde/reprise.
- Producteur seul ; beatmaking et recherche d'artistes.
- Manager seul ; aucun artiste prétendument représenté sans confirmation.
- Booker programmeur vs booker d'artistes ; champs distincts.
- Organisateur jam vs festival ; rôles de publication inchangés.
- Label A&R, éditeur synchro, journaliste/CM : accès selon statut d'ouverture (ne pas prétendre métiers actifs).
- Double rôle musicien + ingé son ; triple rôle ; données communes uniques, spécialités et offres/besoins isolés.
- Back/forward/reload, interruption/reprise, validation front et serveur, références inconnues, non-authorized mutation.
- Accessibilité clavier, focus, libellés, erreur, responsive mobile ; mise en garde des états « bientôt ».
- Non-régression de l'ancienne inscription, profils existants, assistant facultatif D47, parcours de progression et règles de mineurs.

### Exécution
- Tests unitaires des transitions de steps et schémas.
- Tests Prisma d'intégration pour relations multi-métier et migrations.
- Scénarios Playwright ciblés dans `e2e/linkmusician/` ; respecter les limitations de machine documentées (`docs/plan/a-trancher.md`, M1, T1-T3).
- Vérifier `npm run check` et tests adaptés au repo.

### Definition of Done
- Tous scénarios pertinents passent ; aucune ouverture de métier « bientôt » sans autorisation.
- Liens vers tests dans chaque ticket métier et résultats CI attachés à la PR.

### Règles transverses
- Inscription courte : demander les champs marqués **requis** ; les autres sont facultatifs et complétables ensuite.
- « **Je propose** » et « **Je recherche** » sont des sélections indépendantes, enregistrées **par métier**.
- Valeurs structurées (IDs stables), validation Zod serveur, contrôles d'accès, messages d'erreur accessibles ; ne pas inventer des compétences ni afficher un statut « vérifié » sur déclaration.
- Préserver les données et fonctionnalités existantes ; mise à jour des tests Vitest et Playwright liés au changement.



---

## #30 — [EPIC] Espaces métier et outils collaboratifs de l’écosystème musical

[Issue GitHub](https://github.com/Pierre-FABIEN/linkmusician/issues/30)

## Mise à jour du pilotage — 18/11/2026

L'audit transversal [MELO #84](https://github.com/Pierre-FABIEN/linkmusician/issues/84) et la [feuille de route consolidée](https://github.com/Pierre-FABIEN/linkmusician/blob/main/docs/plan/audit-structurel-roadmap-2026-11-18.md) redéfinissent l'ordre par dépendances G0–G6. Les mentions historiques selon lesquelles **#51–#54 seraient à réaliser sont périmées** : les quatre issues sont fermées et les modèles `WorkStep`/crédits autonomes existent sur `main` (audit statique du commit `6bddf91`). #36 conserve ses autres périmètres MEMBER/EXTERNAL, validations, versions et projets. Aucun déploiement de production n'a été vérifié.

**Statut réel : epic partielle, à conserver ouverte.**
---

## État consolidé — 16/11/2026

Publication vérifiée le 16/11/2026 : `origin/main` contient `9a73d455ab03fff83ce9c1993b60b02fb1b42660` (ls-remote et ascendance des commits contrôlés). Aucun déploiement de production établi.

DASH-01 à DASH-04 sont terminés et publiés ; DASH-05a à m sont publiés mais #35 reste partiel. Les projets/tâches/validations #36, opportunités #37, calendriers #38, devis #39, répertoires #40 et extensions #41–#46 gardent des critères à réaliser. #47–#49 restent bientôt, sans activation. #50 est une recette continue, pas une validation globale déjà obtenue. #30 reste ouverte.

L’audit #55 (`b30edaa`) et les corrections #56/R1 (`8cdf0b5`), #57/R2 (`cba0234`), #58/R3 (`9a73d45`) sont terminés, clos et publiés. R4 (relecture générale du processeur) reste à caractériser ; extraction ARCH-MET-03 facultative. Leur livraison ne réalise aucun lot SELF.

SELF #51 → #52 → #53 → #54 est encore à réaliser ; valider le modèle exact de #51 avant son code. #26/#27/#28 conservent leurs critères propres.

---

## Cadrage conservé

# Objectif produit

Adapter l'espace de chaque personne (`/espace`) à **son ou ses métiers**. Aujourd'hui, `/espace` est le même pour tout le monde et il est pensé pour la carrière d'un·e musicien·ne : progression, ambition, objectifs, agenda, campagnes. Un ingé son, une organisatrice ou un booker y trouvent surtout des entrées qui ne les concernent pas. Seuls les managers et bookers ont une entrée propre, « Accompagnement ».

Suite de l'épopée #14 : l'inscription multirôle recueille désormais des données structurées par métier (spécialités, « Je propose », « Je recherche », champs propres, visibilité). Il faut maintenant que l'**expérience quotidienne** les exploite.

## Ce qui existe déjà (à réutiliser, pas à refaire)

- `/espace` : page-menu (D50) dont chaque entrée ouvre sa page, avec un fil d'Ariane en badges (D52).
- Pages par métier : `/profil/metier/[slug]` et « Ma pratique » (complétude, « Qui voit quoi », ONB-12b) ; `/profil/son`, `/profil/production`, `/profil/organisateur` ; `/accompagnement` (manager, booker) ; `/studios` ; `/lieux/[id]/gerer` ; `/plateaux` ; `/organisations` ; `/ecoles`.
- Rangs par métier calculés sur des faits, jamais sur l'XP : `craftSummary`, `promoterSummary`, `agentSummary`, `venueSummary`.
- Annonces ciblées par métier (`targetTrack`, `targetSpecialty`) et recherche `/decouvrir?metier=…`.
- Direction visuelle Metro (D55, `docs/design`).

## À faire

1. **Cadrage par métier** (comme l'audit #29) : pour chacun des 6 métiers ouverts, les tâches du quotidien, ce qu'il faut voir en arrivant, les actions principales et les signaux utiles (demandes reçues, propositions qui correspondent à « Je propose », candidatures, dates à venir, confirmations en attente). Le résultat va dans `docs/conception/`.
2. **Espace selon le métier principal**, avec bascule vers les autres métiers. Il ne duplique rien : les données communes et la progression restent partagées.
3. **Entrées par métier** dans le menu de `/espace`, qui renvoient vers les pages existantes ; supprimer ou replier les entrées sans objet pour ce métier.
4. **« Pour toi »** : les annonces et profils qui correspondent aux offres et besoins du métier. Dépend d'**ONB-13a/13b (#27)**.
5. **Invitations en contexte** : la complétude d'ONB-12b remonte là où le manque gêne (une candidature, une annonce), sans bloquer l'application.
6. **États vides honnêtes** pour un métier sans activité ; métiers « bientôt » sans écran trompeur (Q62).

## Principes

- Menus de liens, pas un tableau de bord qui empile tout (D50) ; mobile d'abord ; Metro (D55).
- Jamais l'XP pour trier ou prioriser ; seulement des faits et des demandes réelles.
- Visibilité et confidentialité respectées (D61) ; blocages et règles des mineur·es.
- Multirôle : un espace lisible pour 2 ou 3 métiers, sans données en double.
- Réutiliser les services et les pages existants avant d'en créer.

## Acceptation

- Un ingé son seul, une organisatrice seule et un booker seul arrivent chacun sur un espace dont les premières entrées servent leur métier.
- Un compte musicien·ne + ingé son bascule d'un métier à l'autre sans perdre le contexte.
- Aucune entrée ne mène à une page vide ou réservée à un autre métier.
- Tests E2E par rôle (mobile 390 px compris), accessibilité clavier et axe.

## Dépendances et hors périmètre

- Dépend d'ONB-13a/13b (#27) pour « Pour toi » ; le reste peut commencer après ONB-12c (#26).
- Hors périmètre : ouverture de label, édition et communication (décision produit séparée) ; notifications et classement automatiques ; paiement.


---

## Décisions consolidées (12/11/2026) — 9 métiers

**Référence audit :** `main` commit `3c787e1`. **20 tickets DASH créés**. Six métiers ouverts disposent à terme de leurs fonctions professionnelles principales avant lancement ; Label, Éditeur et Communication restent « bientôt » (P2, pas d'activation implicite). Modèle de structures commun typé et permissions spécifiques ; widgets UI partagés configurés par métier ; ressources transverses non dupliquées.

### Socle et modules
- [x] [DASH-01 — #31](https://github.com/Pierre-FABIEN/linkmusician/issues/31)
- [x] [DASH-02 — #32](https://github.com/Pierre-FABIEN/linkmusician/issues/32)
- [x] [DASH-03 — #33](https://github.com/Pierre-FABIEN/linkmusician/issues/33)
- [x] [DASH-04 — #34](https://github.com/Pierre-FABIEN/linkmusician/issues/34)
- [ ] [DASH-05 — #35](https://github.com/Pierre-FABIEN/linkmusician/issues/35)
- [ ] [DASH-06 — #36](https://github.com/Pierre-FABIEN/linkmusician/issues/36)
- [ ] [DASH-07 — #37](https://github.com/Pierre-FABIEN/linkmusician/issues/37)
- [ ] [DASH-08 — #38](https://github.com/Pierre-FABIEN/linkmusician/issues/38)
- [ ] [DASH-09 — #39](https://github.com/Pierre-FABIEN/linkmusician/issues/39)
- [ ] [DASH-10 — #40](https://github.com/Pierre-FABIEN/linkmusician/issues/40)

### Dashboards métier
- [ ] [DASH-11 — #41](https://github.com/Pierre-FABIEN/linkmusician/issues/41)
- [ ] [DASH-12 — #42](https://github.com/Pierre-FABIEN/linkmusician/issues/42)
- [ ] [DASH-13 — #43](https://github.com/Pierre-FABIEN/linkmusician/issues/43)
- [ ] [DASH-14 — #44](https://github.com/Pierre-FABIEN/linkmusician/issues/44)
- [ ] [DASH-15 — #45](https://github.com/Pierre-FABIEN/linkmusician/issues/45)
- [ ] [DASH-16 — #46](https://github.com/Pierre-FABIEN/linkmusician/issues/46)
- [ ] [DASH-17 — #47](https://github.com/Pierre-FABIEN/linkmusician/issues/47)
- [ ] [DASH-18 — #48](https://github.com/Pierre-FABIEN/linkmusician/issues/48)
- [ ] [DASH-19 — #49](https://github.com/Pierre-FABIEN/linkmusician/issues/49)

### Validation transverse
- [ ] [DASH-20 — #50](https://github.com/Pierre-FABIEN/linkmusician/issues/50)

### Ordre de réalisation recommandé
1. ONB-12c (#26), ONB-13b (#27), E2E #28 en coordination ; conserver la qualification #29.
2. Navigation et fondations DASH-01 à 05 ; réutiliser Organization, Representation, Metro et profils déjà implémentés.
3. Modules partagés DASH-06 à 10, en lots courts et testés ; réutiliser JamSeries, GIG, GIG_SLOT, works, studios et collaborations.
4. Six dashboards DASH-11 à 16 avec parcours utilisables de bout en bout.
5. Recette DASH-20 en continu. DASH-17 à 19 uniquement après décision d'ouverture spécifique.

### Règles de réalisation
- Une issue DASH représente un **lot fonctionnel** qui peut nécessiter un découpage en tâches de 1 à 4 jours selon `docs/plan/README.md` ; ne pas lancer les 20 issues comme jobs indépendants sans tenir compte des dépendances.
- Contrôles d'accès serveur et permissions contextuelles, audit des actes effectués pour autrui ; éviter les doubles objets entre dashboards ; jamais l'XP comme filtre ou preuve ; déclarations juridiques non certifiées.
- Préserver l'existant et les parcours Jam/Carrière ; respecter les métiers non ouverts ; mise à jour des tests, aides, démos et documentation.


---

## Complément de pilotage — architecture métier et enregistrement autonome (13/11/2026)

Cette section **complète** l'ordre de réalisation ci-dessus ; elle ne remet pas en cause les lots DASH déjà achevés.

### Séquence à respecter

1. **[ARCH-MET-01 — #55](https://github.com/Pierre-FABIEN/linkmusician/issues/55) : audit des capacités et services métier** — réaliser la cartographie, identifier les responsabilités partagées, proposer les frontières et les lots de refactorisation **avant de multiplier les nouveaux modules spécifiques aux métiers (DASH-11 à 16)**. Livrable initial : documentation et plan, **pas de refonte générale préalable**.
2. **[DASH-06 — #36](https://github.com/Pierre-FABIEN/linkmusician/issues/36) : projets et tâches** — appliquer les frontières retenues progressivement, en conservant les services existants et les fonctionnalités déjà livrées. Séquence de l'enregistrement autonome :
   - [ ] [DASH-06a — #51](https://github.com/Pierre-FABIEN/linkmusician/issues/51) — auto-attribution, home studio, états de tâche.
   - [ ] [DASH-06b — #52](https://github.com/Pierre-FABIEN/linkmusician/issues/52) — rôles et crédits multiples pour un contributeur existant.
   - [ ] [DASH-06c — #53](https://github.com/Pierre-FABIEN/linkmusician/issues/53) — preuves, progression et suggestions contextualisées.
   - [ ] [DASH-06d — #54](https://github.com/Pierre-FABIEN/linkmusician/issues/54) — parcours complet et E2E.
3. **DASH-07 à 10 (#37–#40)** — réutiliser les capacités transversales clarifiées par #55 et éprouvées par #36 ; conserver l'ordre de dépendance de chaque ticket.
4. **DASH-11 à 16 (#41–#46)** — déployer les parcours de chacun des six métiers ouverts sur les services partagés, sans recopier les moteurs de projets/tâches/autorisations.
5. **DASH-20 (#50)** — recette transverse **en continu**, notamment pour les scénarios multirôles et la gestion autonome des étapes. DASH-17 à 19 (#47–#49) restent conditionnés à une décision produit d'ouverture.

### Contraintes de séquencement

- L'audit #55 est un **jalon de conception**, pas un blocage absolu des développements indépendants : il peut démarrer en parallèle des fondations déjà identifiées, mais ses conclusions doivent être prises en compte avant les grandes extensions métier.
- Les refactorisations tirées de #55 sont créées comme **issues distinctes**, ordonnées par risque et valeur, et intégrées progressivement aux lots concernés.
- Le nettoyage des modules inactifs du boilerplate e-commerce et la création d'une branche `dev` / d'environnements distincts sont **reportés après stabilisation fonctionnelle**, selon la stratégie produit actuelle.
- Les contrôles d'intégrité, de confidentialité, de permissions et les tests E2E LinkMusician restent des exigences immédiates ; ne pas reporter la correction d'une régression connue.


---

## #35 — [DASH-05] Journal d'activité et notifications utiles

[Issue GitHub](https://github.com/Pierre-FABIEN/linkmusician/issues/35)

## État consolidé — 16/11/2026

Publication vérifiée le 16/11/2026 : `origin/main` contient `9a73d455ab03fff83ce9c1993b60b02fb1b42660` (ls-remote et ascendance des commits contrôlés). Aucun déploiement de production établi.

L’audit #55 (`b30edaa`) et les corrections #56/R1 (`8cdf0b5`), #57/R2 (`cba0234`), #58/R3 (`9a73d45`) sont terminés, clos et publiés. R4 (relecture générale du processeur) reste à caractériser ; extraction ARCH-MET-03 facultative. Leur livraison ne réalise aucun lot SELF.

DASH-05a à m sont publiés. #35 reste partiel : revue des autres circuits existants, actes futurs de tâches/rôles (#36/#51–#54), options et propositions quand leurs mutations seront ouvertes (#37/#45/P4-08). Aucun circuit nouveau créé pour fermer artificiellement ce ticket. Historique, confidentialité et absence de reprise des anciens actes conservés.

## État consolidé DASH-05 — acquis conservés

**Publié au contrôle antérieur : DASH-05a à DASH-05l.** Ancien distant vérifié à [`cd7f1557fc18853f7694a59ee31e462e6c65b135`](https://github.com/Pierre-FABIEN/linkmusician/commit/cd7f1557fc18853f7694a59ee31e462e6c65b135).

**DASH-05m publié :** [`5c7f706`](https://github.com/Pierre-FABIEN/linkmusician/commit/5c7f706), inclus dans le distant `b0dadf2` vérifié pendant ARCH-MET-01.

### Lots livrés

| Lot | Périmètre | Publication |
| --- | --- | --- |
| DASH-05a | Contrat commun et historique privé des affectations | [`7f45282`](https://github.com/Pierre-FABIEN/linkmusician/commit/7f45282) — publié |
| DASH-05b | Historiques privés des mandats et invitations personnelles | [`ac4d736`](https://github.com/Pierre-FABIEN/linkmusician/commit/ac4d736) — publié |
| DASH-05c | Refus/retraits de propositions d’accompagnement ; objectifs corrigés | [`8827f11`](https://github.com/Pierre-FABIEN/linkmusician/commit/8827f11) — publié |
| DASH-05d | Actes personnels de co-gestion VENUE/PROMOTER | [`7a9db5d`](https://github.com/Pierre-FABIEN/linkmusician/commit/7a9db5d) — publié |
| DASH-05e | Actes personnels de co-gestion des studios | [`8d71cc2`](https://github.com/Pierre-FABIEN/linkmusician/commit/8d71cc2) — publié |
| DASH-05f | Participations des agences, successions et fermeture | [`4e7e0ff`](https://github.com/Pierre-FABIEN/linkmusician/commit/4e7e0ff) — publié |
| DASH-05g | Entrées/sorties des groupes, demandes et recrutement | [`6b1db48`](https://github.com/Pierre-FABIEN/linkmusician/commit/6b1db48) — publié |
| DASH-05h | Changements de rôle et transmissions répétables des groupes | [`ce87a90`](https://github.com/Pierre-FABIEN/linkmusician/commit/ce87a90) — publié |
| DASH-05i | Participations aux écoles : acceptation, départ et retrait | [`2341488`](https://github.com/Pierre-FABIEN/linkmusician/commit/2341488) — publié |
| DASH-05j | Validations personnelles de collaboration | [`6aff0dc`](https://github.com/Pierre-FABIEN/linkmusician/commit/6aff0dc) — publié |
| DASH-05k | Refus et annulations de collaboration | [`710421e`](https://github.com/Pierre-FABIEN/linkmusician/commit/710421e) — publié |
| DASH-05l | Attributions/reprises répétables d’appréciations de collaboration | [`cd7f155`](https://github.com/Pierre-FABIEN/linkmusician/commit/cd7f155) — publié |
| DASH-05m | Nouveaux actes humains de crédits manuels, périodes, journal privé et RGPD | [`5c7f706`](https://github.com/Pierre-FABIEN/linkmusician/commit/5c7f706) — **publié** |

Le correctif DASH-05c [`7253877`](https://github.com/Pierre-FABIEN/linkmusician/commit/7253877) est également publié.

### Derniers acquis

- **Écoles (i)** : acceptation de lien, départ personnel et retrait par gestion, auteurs réels et dates ; historique personnel sans journal des élèves accessible à la gestion.
- **Collaborations (j/k)** : acceptation, confirmation d'achèvement, refus et annulation conservés par participant ; mutations atomiques sous `collaboration:`, lecture privée dans la conversation et export RGPD.
- **Appréciations (l)** : registre `CollaborationAppreciationAct` indépendant de la ligne courante réactivable ; nouveaux dons/reprises seulement, cycles répétables, aucun ancien acte reconstruit.
- **Crédits manuels (m, publié)** : registre `WorkCreditAct` indépendant du crédit et des rôles supprimables. Création avec crédit personnel, attribution de gestion, auto-attribution, confirmation personnelle, refus, retrait personnel et retrait par gestion. L'attribution de gestion n'est pas un consentement ; le crédit automatique de collaboration n'invente aucun acte manuel.
- Les périodes de crédit distinguent retrait puis nouvelle attribution. Un rejeu sans transition ne duplique ni n'écrase l'histoire. Échec du registre : rollback de la mutation, rôles, preuve, événements, XP, succès et notification existants.
- Dans `/morceaux`, lecture des 100 derniers actes concernant son crédit ou réalisés par soi : aucun titre, lien, rôle, destinataire tiers ou accès au journal des collègues. Export complet sans troncature ; anonymisation des auteurs et cascades explicites.
- Ordre corrigé pour la finalisation liée à un morceau : `collaboration:` → `work:` avant les écritures et verrous du moteur ; relecture après attente pour gérer la suppression du morceau.

### Garanties et déploiement

Droits actuels, gestion et consentement personnel, confidentialité, blocages, profils masqués, protections des mineur·es et quotas conservés. Aucun ancien acte fabriqué depuis état, `confirmedAt` d'origine multiple, `updatedAt`, notification ou événement moteur. Aucun effet supplémentaire de progression, réputation ou notification ajouté par le journal.

Les historiques restent privés selon les gardes propres à chaque domaine. La conservation d'un acte après départ/retrait n'ouvre ni outil de gestion ni accès à une ressource privée perdue. Les successions et effacements techniques ne deviennent pas des actes humains.

Migrations additives récentes :
- h : `20261114200647_membership_band_roles` **et** `20261114200800_membership_decisions_once` (déployer les deux pour préserver l'index partiel).
- k : `20261115151623_collaboration_refus_annulations`.
- l : `20261115152721_collaboration_appreciation_acts`.
- m, **code publié** : `20261115154332_work_credit_acts`.

Elles ont été appliquées en développement et sur le schéma E2E, clients régénérés. Cela ne prouve aucun déploiement applicatif en production. Pas de reprise des actes anciens ni de retour destructif automatique.

### Validation de la dernière livraison (m)

- **1 368 unitaires, 74 intégrations distinctes, 4 E2E sans reprise réussis**.
- **Types : 0 erreur, 0 avertissement**, exécutés hors E2E.
- Cycles/rejeux/concurrence, crédits automatiques, suppression/finalisation, plafonds, droits, confidentialité après perte de gestion, auteurs effacés, RGPD et rollback des effets vérifiés.
- Formatage ciblé conforme ; ESLint ciblé sans erreur (quatre avertissements de liens préexistants). Lint global bloqué par les scripts préexistants `.shot-metro.mjs` et `.shot-tmp.mjs`.
- Documentation, aide et démo actualisées. `seed:demo` joué deux fois : cinq actes dédiés sur deux périodes.

### Reste et prochaine étape

- [x] Groupes, écoles, validations/refus/annulations de collaboration et appréciations : **publiés**.
- [x] Conservation des actes manuels de crédits de morceaux : **publiée** dans `5c7f706`, ascendance reconfirmée au bilan du 16/11/2026.
- [ ] Revue des autres circuits existants au fil de leur audit, sans prétendre que tous sont déjà couverts.
- [ ] Traçabilité des futures options/propositions lors de l'ouverture de leurs circuits respectifs (#37, #45, P4-08 notamment).
- [ ] Conservation des nouveaux actes de tâches/rôles qui seront introduits par #36 et #51–#54 : à concevoir dans ces lots, sans réutiliser abusivement un acte initial de crédit.

**ARCH-MET-01/#55 publié et reçu** ; corrections R1/R2/R3 publiées dans #56–#58. L’incrément SELF #51, puis #52–#54, reste à réaliser après validation de la modélisation exacte. Il n'y a pas de circuit `WorkPitch` ou d'options de booking à journaliser aujourd'hui ; ne pas les créer dans DASH-05 pour forcer sa clôture.

**#35 et #30 restent ouvertes.** DASH-05 reste partiel ; le futur périmètre n'est pas abandonné et n'est pas un blocage global des fonctionnalités indépendantes.

### Sources

[Plan publié](https://github.com/Pierre-FABIEN/linkmusician/blob/cd7f155/docs/plan/README.md) et [conception publiée](https://github.com/Pierre-FABIEN/linkmusician/blob/cd7f155/docs/conception/16-journal-activite.md), jusqu'à DASH-05l. Les preuves DASH-05m sont dans le commit **publié** `5c7f706` : plan, conception du journal, documentation morceaux, aide, démo et tests. Les anciens blocs d'avancement sont remplacés par cet état ; le périmètre produit initial ci-dessous est conservé.

---

Epic parente : https://github.com/Pierre-FABIEN/linkmusician/issues/30

Référence : main @ 3c787e1. Étendre l'existant, ne pas réécrire sans audit.

## Priorité

Lancement

## Périmètre

Mutualiser la traçabilité invitations, validations, mandats, options et propositions ; réutiliser les notifications existantes.

## Acceptation

Auteur réel, contexte, horodatage, confidentialité ; pas de notifications dupliquées.

## Dépendances

DASH-02/04.

## Qualité

Droits et validation côté serveur ; TypeScript/Svelte 5 ; tests unitaires, intégration et E2E ciblés ; RGPD, accessibilité, mobile ; documentation et seed démo selon docs/plan.

---

## #36 — [DASH-06] Projets collaboratifs, tâches et validations

[Issue GitHub](https://github.com/Pierre-FABIEN/linkmusician/issues/36)

## Rectification après audit — 18/11/2026

Les sous-issues **#51, #52, #53 et #54 sont déjà fermées** ; le schéma actuel comprend `WorkStep`/`WorkStepAct`, `WorkRoleAct` et le mode SELF. Les anciennes phrases « non livrés » dans l'historique ci-dessous sont **obsolètes**. Le chantier restant concerne en particulier MEMBER/EXTERNAL, tâches collaboratives, versions, validations et éventuel projet transversal, **après décision de domaine #84/#83**. Ne pas réimplémenter SELF.

Références : [audit et plan G0–G6](https://github.com/Pierre-FABIEN/linkmusician/blob/main/docs/plan/audit-structurel-roadmap-2026-11-18.md) ; `prisma/schema.prisma` ; `src/lib/server/works/service.ts`. **Reste ouvert.**
---

## État consolidé — 16/11/2026

Publication vérifiée le 16/11/2026 : `origin/main` contient `9a73d455ab03fff83ce9c1993b60b02fb1b42660` (ls-remote et ascendance des commits contrôlés). Aucun déploiement de production établi.

L’audit #55 (`b30edaa`) et les corrections #56/R1 (`8cdf0b5`), #57/R2 (`cba0234`), #58/R3 (`9a73d45`) sont terminés, clos et publiés. R4 (relecture générale du processeur) reste à caractériser ; extraction ARCH-MET-03 facultative. Leur livraison ne réalise aucun lot SELF.

DASH-05a à m et la garde Work sont publiés. Les sous-lots #51–#54 restent ouverts et non livrés ; valider la modélisation exacte de #51 avant de coder. Le socle Work/collaborations existant ne vaut pas livraison de tâches, de versions ou d’approbations. MEMBER/EXTERNAL et suite générale de #36 restent distincts de SELF ; aucune nouvelle abstraction Project/Task n’est requise par ce bilan. #36 reste ouverte.

---

## Cadrage conservé

pic parente : https://github.com/Pierre-FABIEN/linkmusician/issues/30

Référence : main @ 3c787e1. Étendre l'existant, ne pas réécrire sans audit.

## Priorité

Lancement

## Périmètre

Compléter groupes, projets et productions existants : participants, rôles, étapes, tâches, versions externes, livrables et approbations.

## Acceptation

Modifier une version approuvée impose revalidation ; confidentialité et transitions concurrentes testées.

## Dépendances

DASH-02 livré ; socle DASH-05a–l publié à `cd7f155`, DASH-05m publié dans `5c7f706` ; collaborations/works existants.

L’audit ARCH-MET-01/#55 est publié et reçu ; R1/R2/R3 sont corrigés par #56–#58. Le reste futur de DASH-05 (options/propositions non implémentées) n'est pas un blocage global de ce lot : les nouveaux actes de tâches et rôles doivent être conçus avec leurs propres mutations, lecture privée, export et anonymisation.

Séquence de l'enregistrement autonome : #51 → #52 → #53 → #54. Aucun de ces sous-lots n'est déclaré livré par DASH-05m. Préserver `WorkCreditAct`, les périodes et l'ordre des verrous `collaboration:` → `work:` → moteur ; une auto-déclaration d'étape ne simule pas une collaboration indépendante.

## Qualité

Droits et validation côté serveur ; TypeScript/Svelte 5 ; tests unitaires, intégration et E2E ciblés ; RGPD, accessibilité, mobile ; documentation et seed démo selon docs/plan.

---

## #37 — [DASH-07] Opportunités, candidatures et propositions structurées

[Issue GitHub](https://github.com/Pierre-FABIEN/linkmusician/issues/37)

Epic parente : https://github.com/Pierre-FABIEN/linkmusician/issues/30

Référence : main @ 3c787e1. Étendre l'existant, ne pas réécrire sans audit.

## Priorité

Lancement

## Périmètre

Étendre Opportunity, GIG_SLOT et recrutement : candidatures propres ou déléguées, étapes, propositions ; critères du matching #29.

## Acceptation

Aucune candidature non autorisée ; contraintes d'offres/besoins et visibilité ; éviter doublons.

## Dépendances

#27 ONB-13b, #29, DASH-04.

## Qualité

Droits et validation côté serveur ; TypeScript/Svelte 5 ; tests unitaires, intégration et E2E ciblés ; RGPD, accessibilité, mobile ; documentation et seed démo selon docs/plan.

---

## #38 — [DASH-08] Événements, lieux, jams et calendriers partagés

[Issue GitHub](https://github.com/Pierre-FABIEN/linkmusician/issues/38)

Epic parente : https://github.com/Pierre-FABIEN/linkmusician/issues/30

Référence : main @ 3c787e1. Étendre l'existant, ne pas réécrire sans audit.

## Priorité

Lancement

## Périmètre

Étendre VenueProfile, JamSeries, GIG et plateaux : disponibilités, scènes/créneaux, conflits, inscriptions, listes d'attente, occurrences réutilisables.

## Acceptation

Conflits détectés ; occurrence modifiable ; inscription ≠ présence ; protections mineurs et anti-abus.

## Dépendances

P5-03b/04a/04b/05/06 ; DASH-02.

## Qualité

Droits et validation côté serveur ; TypeScript/Svelte 5 ; tests unitaires, intégration et E2E ciblés ; RGPD, accessibilité, mobile ; documentation et seed démo selon docs/plan.

---

## #39 — [DASH-09] Prestations, demandes, devis et conditions

[Issue GitHub](https://github.com/Pierre-FABIEN/linkmusician/issues/39)

Epic parente : https://github.com/Pierre-FABIEN/linkmusician/issues/30

Référence : main @ 3c787e1. Étendre l'existant, ne pas réécrire sans audit.

## Priorité

Lancement

## Périmètre

Mutualiser prestations/devis structurés pour audio, production, management et événementiel : prix, périmètre, échéance, version, statut ; sans paiement intégré.

## Acceptation

Versions, validation explicite, confidentialité, distinction proposition/contrat.

## Dépendances

DASH-02/05/06.

## Qualité

Droits et validation côté serveur ; TypeScript/Svelte 5 ; tests unitaires, intégration et E2E ciblés ; RGPD, accessibilité, mobile ; documentation et seed démo selon docs/plan.

---

## #40 — [DASH-10] Répertoires, œuvres, enregistrements, crédits et portfolios

[Issue GitHub](https://github.com/Pierre-FABIEN/linkmusician/issues/40)

Epic parente : https://github.com/Pierre-FABIEN/linkmusician/issues/30

Référence : main @ 3c787e1. Étendre l'existant, ne pas réécrire sans audit.

## Priorité

Lancement partiel / P2

## Périmètre

Réutiliser works, profils métiers et références ; répertoire solo/groupe, liens audio, crédits, publication autorisée ; différer ISWC/coédition/synchro.

## Acceptation

Œuvre distincte du master ; crédits non équivalents à propriété ; accès privé.

## Dépendances

#26 ONB-12c ; DASH-06 ; works/media.

## Qualité

Droits et validation côté serveur ; TypeScript/Svelte 5 ; tests unitaires, intégration et E2E ciblés ; RGPD, accessibilité, mobile ; documentation et seed démo selon docs/plan.

---

## #41 — [DASH-11] Musicien / Chanteur — espace professionnel

[Issue GitHub](https://github.com/Pierre-FABIEN/linkmusician/issues/41)

Epic parente : https://github.com/Pierre-FABIEN/linkmusician/issues/30

Référence d'audit : main @ 3c787e1. Compléter les fonctionnalités existantes, ne pas les remplacer par des maquettes.

## Priorité

Lancement

## Périmètre

Mon parcours ; Mes groupes & projets ; Ma musique ; Jams & concerts ; Mes opportunités. Actions vérifiables, répertoire et médias, répétitions avec disponibilité et morceaux, succès individuels/collectifs distincts.

## Dépendances / réutilisation

P3 carrière, Jam, groupes, works, #26, #27, DASH-06/07/08/10.

## Critères d'acceptation

Un guitariste/chanteur peut rejoindre une jam, gérer un groupe, son répertoire, une répétition et une candidature ; aucun XP pour clic/connexion/présence déclarée.

## Qualité et livraison

Contrôles d'accès et Zod côté serveur, Svelte 5/TypeScript, conformité RGPD, accessibilité et mobile ; tests unitaires/intégration/Playwright ciblés ; mise à jour conception, plan et démonstration selon docs/plan. Découper en lots exécutables courts si nécessaire.

---

## #42 — [DASH-12] Ingénieur du son — projets, prestations et réalisations

[Issue GitHub](https://github.com/Pierre-FABIEN/linkmusician/issues/42)

Epic parente : https://github.com/Pierre-FABIEN/linkmusician/issues/30

Référence d'audit : main @ 3c787e1. Compléter les fonctionnalités existantes, ne pas les remplacer par des maquettes.

## Priorité

Lancement

## Périmètre

Mon espace audio ; Mes projets (enregistrement/mixage/mastering/live), étapes et validations ; Mes prestations et devis ; Studios & équipements ; Réalisations ; Activité live conditionnelle. Livrables audio via liens externes.

## Dépendances / réutilisation

Profil son existant, studios, DASH-06/09/10.

## Critères d'acceptation

Un ingénieur suit un projet partagé, propose un devis, soumet une version externe, obtient validation et publie un crédit autorisé.

## Qualité et livraison

Contrôles d'accès et Zod côté serveur, Svelte 5/TypeScript, conformité RGPD, accessibilité et mobile ; tests unitaires/intégration/Playwright ciblés ; mise à jour conception, plan et démonstration selon docs/plan. Découper en lots exécutables courts si nécessaire.

---

## #43 — [DASH-13] Producteur musical — productions et catalogue

[Issue GitHub](https://github.com/Pierre-FABIEN/linkmusician/issues/43)

Epic parente : https://github.com/Pierre-FABIEN/linkmusician/issues/30

Référence d'audit : main @ 3c787e1. Compléter les fonctionnalités existantes, ne pas les remplacer par des maquettes.

## Priorité

Lancement

## Périmètre

Mon espace production ; Mes productions (single/EP/album, contributeurs, versions, validations), Collaborations, Catalogue beats/instrumentaux BPM/tonalité, Prestations, Réalisations, Studio. Collaboration/licence externe, pas de paiement/marketplace.

## Dépendances / réutilisation

Profil production existant ; DASH-06/09/10.

## Critères d'acceptation

Projet créé par tout professionnel habilité ; validation par responsable ; crédit et disponibilité du beat déclaratifs, sans transfert automatique des droits.

## Qualité et livraison

Contrôles d'accès et Zod côté serveur, Svelte 5/TypeScript, conformité RGPD, accessibilité et mobile ; tests unitaires/intégration/Playwright ciblés ; mise à jour conception, plan et démonstration selon docs/plan. Découper en lots exécutables courts si nécessaire.

---

## #44 — [DASH-14] Manager d'artistes — artistes, carrière et opportunités

[Issue GitHub](https://github.com/Pierre-FABIEN/linkmusician/issues/44)

Epic parente : https://github.com/Pierre-FABIEN/linkmusician/issues/30

Référence d'audit : main @ 3c787e1. Compléter les fonctionnalités existantes, ne pas les remplacer par des maquettes.

## Priorité

Lancement

## Périmètre

Mon espace management ; Mes artistes ; Développement de carrière avec objectifs/jalons/tâches ; Projets & sorties ; Opportunités et candidatures déléguées ; Réseau ; Activité. Plusieurs managers, rôles et permissions ; visibilité de chaque élément configurable ; agence avec affectations.

## Dépendances / réutilisation

Representation P5-07 ; DASH-02/04/06/07/09.

## Critères d'acceptation

Artiste accepte représentation ; manager autorisé répond à une opportunité ; retrait d'accès immédiat ; journal de l'auteur réel et visibilité respectée.

## Qualité et livraison

Contrôles d'accès et Zod côté serveur, Svelte 5/TypeScript, conformité RGPD, accessibilité et mobile ; tests unitaires/intégration/Playwright ciblés ; mise à jour conception, plan et démonstration selon docs/plan. Découper en lots exécutables courts si nécessaire.

---

## #45 — [DASH-15] Booker / Agent de tournée — options, dates et tournées

[Issue GitHub](https://github.com/Pierre-FABIEN/linkmusician/issues/45)

Epic parente : https://github.com/Pierre-FABIEN/linkmusician/issues/30

Référence d'audit : main @ 3c787e1. Compléter les fonctionnalités existantes, ne pas les remplacer par des maquettes.

## Priorité

Lancement

## Périmètre

Mon espace booking ; Roster ; Dates (prospection > proposition > option > confirmation/annulation), Tournées (territoires, itinéraires, délais, faisabilité), Opportunités, Négociations, Réseau et vues de programmation conditionnelles. Options concurrentes avec priorité/expiration.

## Dépendances / réutilisation

Representation P5-07 ; GIG/GIG_SLOT ; DASH-04/07/08/09.

## Critères d'acceptation

Plusieurs bookers par territoires ; double validation de date selon mandat ; conflits d'options signalés ; un événement partagé non dupliqué ; temps de trajet indicatifs.

## Qualité et livraison

Contrôles d'accès et Zod côté serveur, Svelte 5/TypeScript, conformité RGPD, accessibilité et mobile ; tests unitaires/intégration/Playwright ciblés ; mise à jour conception, plan et démonstration selon docs/plan. Découper en lots exécutables courts si nécessaire.

---

## #46 — [DASH-16] Organisateur / Promoteur — lieux, jams et événements

[Issue GitHub](https://github.com/Pierre-FABIEN/linkmusician/issues/46)

Epic parente : https://github.com/Pierre-FABIEN/linkmusician/issues/30

Référence d'audit : main @ 3c787e1. Compléter les fonctionnalités existantes, ne pas les remplacer par des maquettes.

## Priorité

Lancement

## Périmètre

Mon espace événements ; Événements ; Programmation multi-scènes, créneaux, candidatures ; Lieux administrés par structures ; Jams (inscriptions, animateurs, liste d'attente, présence), Équipes, Budgets (devis, cachets, dépenses déclarées), Réseau ; séries et occurrences indépendantes ; billetterie externe.

## Dépendances / réutilisation

P5-05a/b, P5-03b/d, P5-04a/b, P5-06 ; DASH-02/06/07/08/09.

## Critères d'acceptation

Un organisateur délègue un événement sans transférer l'administration d'un lieu ; gère une jam récurrente et festival sans double réservation ; paiement non intégré.

## Qualité et livraison

Contrôles d'accès et Zod côté serveur, Svelte 5/TypeScript, conformité RGPD, accessibilité et mobile ; tests unitaires/intégration/Playwright ciblés ; mise à jour conception, plan et démonstration selon docs/plan. Découper en lots exécutables courts si nécessaire.

---

## #47 — [DASH-17] Label / Maison de disques — A&R, roster, sorties

[Issue GitHub](https://github.com/Pierre-FABIEN/linkmusician/issues/47)

Epic parente : https://github.com/Pierre-FABIEN/linkmusician/issues/30

Référence d'audit : main @ 3c787e1. Compléter les fonctionnalités existantes, ne pas les remplacer par des maquettes.

## Priorité

P2 — métier bientôt

## Périmètre

Espace label ; A&R avec soumissions configurables, évaluations individuelles privées et décision responsable ; Roster prospect/accompagné/signé avec validation de la relation publique ; productions, sorties, catalogue masters/ISRC, distributeurs externes et campagnes partagées.

## Dépendances / réutilisation

DASH-02/06/10 ; modules campagne ultérieurs. Ne pas activer le métier sans décision distincte.

## Critères d'acceptation

Notes A&R privées ; relation signée déclarée ≠ contrat vérifié ; label principal et partenaires avec territoires ; sortie externe non certifiée par Melokiva.

## Qualité et livraison

Contrôles d'accès et Zod côté serveur, Svelte 5/TypeScript, conformité RGPD, accessibilité et mobile ; tests unitaires/intégration/Playwright ciblés ; mise à jour conception, plan et démonstration selon docs/plan. Découper en lots exécutables courts si nécessaire.

---

## #48 — [DASH-18] Éditeur musical — œuvres, coédition et synchronisation

[Issue GitHub](https://github.com/Pierre-FABIEN/linkmusician/issues/48)

Epic parente : https://github.com/Pierre-FABIEN/linkmusician/issues/30

Référence d'audit : main @ 3c787e1. Compléter les fonctionnalités existantes, ne pas les remplacer par des maquettes.

## Priorité

P2 — métier bientôt

## Périmètre

Espace édition ; catalogue œuvres/ISWC et contributions, coéditions avec gestionnaire désigné et historique, soumissions configurables, briefs sync, propositions par personnes autorisées, placements et exploitations déclarés. Checklist droits inconnu/à confirmer/confirmé par déclaration.

## Dépendances / réutilisation

DASH-02/06/10 et propositions ; différencier ISWC/ISRC. Ne pas activer sans décision explicite.

## Critères d'acceptation

Créateur de fiche ≠ propriétaire ; autorisation de soumettre ≠ clearance ; permissions par œuvre/territoire, pas de certification juridique.

## Qualité et livraison

Contrôles d'accès et Zod côté serveur, Svelte 5/TypeScript, conformité RGPD, accessibilité et mobile ; tests unitaires/intégration/Playwright ciblés ; mise à jour conception, plan et démonstration selon docs/plan. Découper en lots exécutables courts si nécessaire.

---

## #49 — [DASH-19] Communication musicale — missions, campagnes et contenus

[Issue GitHub](https://github.com/Pierre-FABIEN/linkmusician/issues/49)

Epic parente : https://github.com/Pierre-FABIEN/linkmusician/issues/30

Référence d'audit : main @ 3c787e1. Compléter les fonctionnalités existantes, ne pas les remplacer par des maquettes.

## Priorité

P2 — métier bientôt

## Périmètre

Espace communication ; missions et espaces clients ; campagnes avec objectifs/budgets/tâches/bilans exportables ; bibliothèque de contenus versionnés et validations configurables ; presse (carnet partagé sécurisé, provenance) ; devis ; portfolio avec preuves, crédits, droits de réutilisation déclarés.

## Dépendances / réutilisation

DASH-02/06/09/10 ; campagnes Label/Organisateur partagées. Ne pas activer sans décision distincte.

## Critères d'acceptation

Accès technique ≠ droit juridique de publication ; données presse privées ; statistiques sourcées et déclaratives ; approbations revalidées après modification.

## Qualité et livraison

Contrôles d'accès et Zod côté serveur, Svelte 5/TypeScript, conformité RGPD, accessibilité et mobile ; tests unitaires/intégration/Playwright ciblés ; mise à jour conception, plan et démonstration selon docs/plan. Découper en lots exécutables courts si nécessaire.

---

## #50 — [DASH-20] Recette transverse : sécurité, parcours et non-régression

[Issue GitHub](https://github.com/Pierre-FABIEN/linkmusician/issues/50)

## État consolidé — 16/11/2026

Publication vérifiée le 16/11/2026 : `origin/main` contient `9a73d455ab03fff83ce9c1993b60b02fb1b42660` (ls-remote et ascendance des commits contrôlés). Aucun déploiement de production établi.

Issue maintenue ouverte : les recettes ciblées ne constituent pas la recette transverse complète. Dernières preuves publiées : #56 (11 barrières R1), #57 (36 cas de gestion Work), #58 (17 scénarios de proposition, 445 non-régressions, 1 368 unitaires, 4 E2E sans reprise ; 462 tests ciblés validés en passes distinctes). Types et lint ciblé conformes ; écarts globaux .shot-* préexistants consignés.

Restent la matrice transverse complète au fil des fonctionnalités livrées, les parcours SELF #51–#54, les extensions métier, et les critères ONB #28. Aucun nouveau test ni validation de production exécuté par le présent bilan.

---

Epic parente : https://github.com/Pierre-FABIEN/linkmusician/issues/30

Référence d'audit : main @ 3c787e1. Compléter les fonctionnalités existantes, ne pas les remplacer par des maquettes.

## Priorité

Lancement (tests continus)

## Périmètre

Parcours E2E entre métiers : musicien+ingé son, manager+artiste, booker+organisateur, groupe+lieu, projet+prestataire. Tests transitions, concurrence, révocation, confidentialité, mineurs, progression, mobile 390px, accessibilité axe ; conserver intégration ONB-14.

## Dépendances / réutilisation

#28 ; DASH-01 à DASH-19 selon activation ; règles docs/plan et tests existants.

## Critères d'acceptation

Aucun contournement d'autorisations côté API ; aucune duplication de ressource ; tests Vitest/Prisma/Playwright pertinents au vert ; vérifier les métiers bientôt masqués.

## Qualité et livraison

Contrôles d'accès et Zod côté serveur, Svelte 5/TypeScript, conformité RGPD, accessibilité et mobile ; tests unitaires/intégration/Playwright ciblés ; mise à jour conception, plan et démonstration selon docs/plan. Découper en lots exécutables courts si nécessaire.

---

## #59 — [Idéation] SUPER JAM & JAM BATTLE — expérience musicale multijoueur et 15 concepts

[Issue GitHub](https://github.com/Pierre-FABIEN/linkmusician/issues/59)

## Contexte et intention
Idées issues de la discussion produit du 17/11/2026 pour **Melokiva** (nom produit, dépôt historique LinkMusician). Conserver le **mode Jam classique** : spontané, sans pression, et l'application s'efface pendant la musique. Les expériences ci-dessous sont **optionnelles**, à explorer et valider avec des animateurs, musiciens et lieux partenaires de Toulouse.

## Trois formats
1. **Jam classique** : fonctionnement existant, inchangé.
2. **Super Jam** : session multijoueur en temps réel pour fluidifier une jam (QR code, participants, titres, votes, formations, animation).
3. **Jam Battle** : format événementiel de défis musicaux, pouvant réutiliser le moteur Super Jam.

## Inventaire des 15 concepts (backlog d'idéation)
- **01 Jam Radar** : jams et musiciens disponibles à proximité, sans localisation précise ni sollicitation de mineurs.
- **02 Jam Match** : suggestions d'affinités musicales (styles, instruments, disponibilités, expériences communes).
- **03 Jam Setlist** : morceaux proposés, tonalités, BPM, structure, grille d'accords licite et votes.
- **04 Jam Replay** : photos/vidéos/extraits et chronologie avec consentement et crédits.
- **05 Jam Chemistry** : valorisation des rencontres répétées ; proposer de rejouer ou de créer un projet (sans obligation).
- **06 Jam Now** : trouver des partenaires immédiatement et proposer une formation + lieu public admissible.
- **07 Jam DNA** : portrait musical fondé sur retours positifs réels, sans classement ou note négative.
- **08 Jam Battle** : soirées de défis, formations, manches, vote du public limité à l'événement.
- **09 Music Constellation** : graphe visuel privé du réseau et des rencontres.
- **10 Jam AI** : aide optionnelle à la setlist, tonalités, grilles autorisées, backing tracks, analyse d'enregistrements consentis.
- **11 Jam Passport** : souvenirs des lieux et scènes visités.
- **12 Jam Tour** : parcours des jams d'une ville.
- **13 Jam Festival** : programmation coordonnée de lieux partenaires.
- **14 Jam Ambassador** : référents locaux volontaires pour accueillir/guider, sans hiérarchie toxique.
- **15 Jam Discovery** : découverte, par les lieux, de formations ayant réellement joué ensemble (consentement).

## Super Jam — premier périmètre produit imaginé
- L'organisateur active le format sur une jam existante et ouvre/termine une **session live**.
- Les participants rejoignent via **QR code/lien** ; distinction participants, musiciens, animateur et éventuellement public (sans présumer que le scan prouve une présence réelle).
- **File d'attente** : « je veux jouer », instrument, disponibilités, rotation équitable, possibilité de décision manuelle du lead.
- **Proposition de titres** : métadonnées, tonalité, tempo, style, faisabilité et instruments nécessaires.
- **Votes en temps réel** : un vote par personne autorisée et par scrutin, changement de vote éventuel, fermeture explicite, résultat transparent ; anti-abus.
- **Validation** : mode hybride recommandé à explorer, où le collectif propose/vote et l'animateur confirme ou motive le choix final ; autres politiques possibles selon l'événement.
- **Composition des formations** : volontaires, postes manquants, invitation/confirmation, remplacement.
- **Affichages dédiés** : console animateur, mobile participant, écran public, éventuellement vue de scène minimaliste.
- **Fin de session** : restituer morceaux, collaborations consenties et souvenirs dans le carnet, sans distribuer de points pour les simples clics/votes.
- Pendant la musique, éviter toute obligation de consulter un écran.

## Jam Battle — formats proposés
- **Groove Battle** : deux formations improvisent sur le même groove.
- **Mystery Chords** : grille révélée au dernier moment.
- **Genre Switch** : réinterpréter un thème dans un genre tiré au sort.
- **Blind Formation** : équipes surprises parmi les volontaires.
- **Boss Jam** : défi coopératif avec un musicien expérimenté.
- Vote du public ou jury **festif et lié à la manche**, sans incidence automatique sur la réputation individuelle ou l'XP ; protections contre votes multiples et agressivité.

## Parcours conceptuel
`Trouver / se mettre dispo → rejoindre la session → proposer/voter → être appelé sur scène → jouer → retrouver et apprécier les personnes → garder contact → éventuellement projet Carrière`.

## Principes et garde-fous
- Ne pas modifier les règles de sécurité du mode Jam (lieux publics/professionnels, mineurs, vie privée, présence authentique).
- Jam **≠** carrière forcée ; opportunités carrière proposées uniquement si pertinentes.
- La décision musicale humaine prime toujours sur l'algorithme ; mode manuel et dégradé réseau.
- Contrôle d'accès serveur, état de scrutin autoritaire, transactions atomiques, rate limiting, idempotence et journal d'événements ; diffusion SSE/WebSocket/service realtime à étudier selon l'hébergement réel.
- Prévoir RGPD, consentements image/son, droits d'auteur pour les grilles/lyrics/enregistrements, modération et suppression.
- Accessibilité mobile et écrans publics ; s'assurer que l'animateur peut tout gérer simplement.

## Décisions ouvertes (ne pas considérer comme validées)
- Qui est autorisé à voter : public, musiciens, animateur, ou mode hybride paramétrable ?
- Le vote choisit-il directement le prochain morceau ou une proposition soumise au lead ?
- Comment départager les votes, éviter les reprises impossibles, gérer les passages et droits musicaux ?
- Quels besoins des lieux / contraintes Wi-Fi et matériel d'affichage ?
- Quels impacts sur le modèle Jam existant, les règles de présence et le carnet ?
- Nom commercial définitif, métriques d'adoption, priorités et découpage en lots.

## Suggestion d'ordre d'expérimentation (pas de validation de roadmap)
1. **POC sur une jam partenaire** : console animateur + QR + proposition/vote + affichage public + reprise manuelle.
2. File d'attente des musiciens, suggestions de formation, setlist et historique.
3. Jam Now / Jam Match / Jam Chemistry, en mesurant les rencontres réelles générées.
4. Jam Battle réutilisant le moteur de session.
5. Concepts plus coûteux : Replay, AI, Constellation, Festival, etc.

**Nature de cette issue : note d'idéation / cadrage, pas une demande d'implémentation immédiate.** Avant développement : revue de la documentation de conception, validation métier, UX et découpage en issues atomiques.


---

## #60 — [UX JAM · EPIC] Simplifier navigation, compréhension et parcours du mode Jam (audit main)

[Issue GitHub](https://github.com/Pierre-FABIEN/linkmusician/issues/60)

# Audit UX / IA — Mode Jam sur `main` (17/11/2026)

## Objectif produit
**Un musicien doit comprendre immédiatement où jouer, avec qui, ce qu'il doit faire maintenant, puis retrouver simplement les personnes rencontrées.** Simplifier la compréhension et la navigation **sans supprimer les fonctions métier**. Préparer une extension facultative Super Jam, **sans l'ajouter au flux standard**.

## Périmètre effectivement consulté
- `src/routes/(app)/jam/+page.svelte` (pivots Metro `jouer`, `mes-jams`, `reseau` ; NextStep et tuiles)
- `src/lib/components/linkmusician/metro/MetroHome.svelte`
- `src/routes/(app)/jam/agenda/+page.svelte` (calendrier en premier + liste par jour + lieux)
- `src/routes/(app)/jam/dispos/+page.svelte` (mise en disponibilité et liste des profils)
- `src/routes/(app)/jam/mes-jams/+page.svelte` (invitations hôte, animations, invitations à jouer, jams passées)
- `src/routes/(app)/jam/apprecier/+page.svelte`, `src/routes/(app)/jam/carnet/+page.svelte`
- `src/routes/(app)/jams/[id]/+page.svelte` (fiche riche, participation + outils de lead)
- `src/routes/(app)/jouer/+page.svelte` (accueil transversal avec pivot Jam)
- documentation `src/lib/aide/pages/02-mode-jam.md`

**Limite de l'audit :** lecture statique du code et du contenu. Aucune session navigateur ni test utilisateur n'a été exécuté. Les constats sont des **hypothèses UX à confirmer**, non des mesures de comportement.

## Constats transverses
1. **Navigation orientée destinations plutôt qu'intentions** : écran d'accueil en trois panoramas de tuiles et plusieurs formulations, alors que la question la plus simple est « où jouer maintenant ? ».
2. **Charge informationnelle et actions dispersées** : retrouver une jam, déclarer sa disponibilité, accepter une invitation, confirmer sa présence et apprécier les autres s'effectue via plusieurs destinations.
3. **Agenda par calendrier imposé** : le calendrier précède la liste d'événements, malgré un besoin fréquent de parcourir directement « prochaines jams ».
4. **Pages polyvalentes** : la fiche de jam juxtapose des informations utiles au musicien, des actions de participation et des contrôles avancés de lead/hôte.
5. **Après-jam éclaté** : `Mes jams`, `Apprécier`, `Qui était là ?` et `Carnet` doivent former une continuité explicite.
6. **Navigation mobile** : vérifier empilement des pivots horizontaux Metro, scroll vertical, landmarks et retour arrière — pas de conclusion sur leur ergonomie sans test réel.

## Principes de refonte
- **Priorité à l'essentiel** : 1 CTA dominant contextualisé, 2 niveaux d'information (essentiel + détails), faible densité au-dessus de la ligne de flottaison.
- **Navigation stable** organisée autour de `Découvrir` / `Mes jams` / `Mon réseau`, à tester avant de renommer les routes.
- **Progressive disclosure** : gestion des formations, matériel, modération et animations réservée aux autorisés dans des vues ou panneaux distincts.
- **Conserver NextStep**, mais vérifier que son CTA ne concurrence pas la première action visible.
- **États réels et accessibles** : visiteur sans ville, nouveau compte, mineur, sans jams, disponible, invité, déjà inscrit, hôte, jam en cours, passé.
- **Aucun changement implicite des règles métier** : disponibilité éphémère, mineurs, lieu autorisé, `Je viens` ≠ `J'y étais`, appréciations et anti-abus, confirmation de présence, carnet privé.
- **Identité Metro conservée** ; visuel agréable, mouvement discret (`prefers-reduced-motion`), clavier et lecteur d'écran, cibles tactiles, WCAG 2.2 AA visé.
- **Super Jam facultatif** : jamais de nouvelles tuiles permanentes en masse sur l'accueil ; rejoindre le live depuis la fiche d'une jam uniquement si une session existe.

## Découpage
Créer des issues de livraison distinctes : accueil, découverte / agenda, fiche et inscription, après-jam, navigation mobile et rôles organisateurs. Une issue vaut **un parcours vérifiable** ; pas de refonte globale monolithique.

## Définition de terminé transversale
- Documenter avant/après et carte des parcours ; valider avec un novice et un animateur de jam.
- Aucune route/fonctionnalité perdue ; anciens liens directs fonctionnels.
- États d'erreur, chargement et vide utiles ; performance et hydratation inchangées ou améliorées.
- Tests Playwright desktop/mobile : navigation clavier, écran lecteur d'écran à vérifier manuellement, sans régression de sécurité.
- Mettre à jour `docs/conception/`, `docs/decisions/` et `src/lib/aide/pages/02-mode-jam.md` **si les comportements changent**, conformément à `CLAUDE.md`.
- Ne pas implémenter de nouveau moteur temps réel ni les idées de l'issue #59 dans ces tickets.

## Références
- Vision et expérimentation Super Jam : #59
- Dépôt : branche `main`.

---

# Cahier des charges UX détaillé — cadrage et recette

> **Attention — cadre de décision** : les observations ci-dessous sont issues du code de main, pas d'une session filmée ni d'une étude statistique. Chaque changement d'architecture de navigation doit être validé avant implémentation. Ce chantier est **distinct** de l'idée Super Jam (#59).

## A. Synthèse exécutive et enjeu

**Problème à résoudre :** un musicien doit se demander « qu'est-ce que je peux faire maintenant ? » et non « quelle tuile contient la fonctionnalité ? ». Les interfaces actuelles présentent des chemins pertinents mais répartis entre l'accueil Jam, l'agenda, les disponibilités, Mes jams, la fiche, l'après-jam et le carnet. La quantité d'information utile dépasse parfois le besoin du moment. **Le problème n'est pas le nombre de fonctionnalités mais leur visibilité au mauvais moment.**

**Promesse UX attendue :** quel que soit son niveau, le musicien comprend, sans explication préalable :
1. Où il peut jouer prochainement.
2. Comment signaler qu'il est disponible **si le compte y est autorisé**.
3. Si une invitation demande une réponse.
4. S'il participe à une jam et ce qu'il doit apporter.
5. Que faire après avoir joué et comment retrouver ses rencontres.

La navigation doit rester immédiatement lisible **sur un téléphone**, même dans un bar, en luminosité difficile et avec peu de temps disponible. Préserver l'identité Metro, sans confondre impact graphique et quantité d'éléments visibles.

### Objectifs mesurables à valider pendant les tests (seuils proposés, pas résultats constatés)

| Indicateur | Hypothèse de cible de recette | Mesure |
|---|---|---|
| Compréhension de l'accueil | ≥ 80 % des participants peuvent expliquer « où trouver une jam » et « comment se mettre dispo » sans aide | Test modéré, 5 à 8 utilisateurs, à reconfirmer sur davantage de personnes |
| Trouver une jam future | ≥ 80 % terminent la tâche sans assistance | Chronométrage + réussite/échec |
| Répondre à une invitation | ≥ 90 % identifient l'action sans se tromper | Scénario invitation réelle de démo |
| Compréhension des états | 0 confusion critique entre « Je viens » et « J'y étais » dans la recette | Entretien + tâches |
| Régression | 0 parcours métier existant devenu inaccessible | Matrice de traçabilité + Playwright |
| Accessibilité bloquante | 0 piège de clavier, 0 élément essentiel non accessible | Tests automatisés + audit manuel |

Les pourcentages sont **des hypothèses de validation**, à ajuster selon effectifs et qualité de l'échantillon, jamais des garanties statistiques.

## B. Contrainte architecturale EXISTANTE : D50 / D55

**Point majeur découvert dans \`docs/design/README.md\` §5 :**

- **D50** : l'accueil d'un mode est **une page-menu** ; une tuile = une entrée vers un écran dédié, pas un tableau de bord où l'on empile formulaires, calendrier et listes.
- Le héros **NextStep** seul peut porter une action immédiate en un geste.
- **D55** : Metro (mosaïque, panoramas, tons fonctionnels, mouvements utiles) est la direction visuelle applicable.
- Passer à un **vrai tableau de bord**, afficher une liste d'événements directement dans \`/jam\` ou ajouter des contrôles de disponibilité sur cet accueil **nécessite une révision explicite de D50**, avant codage.
- **D52** : préserver la logique de fil d'Ariane / navigation telle que documentée.

**Deux options honnêtes à comparer en conception :**
- **Option A — optimisation compatible D50 (par défaut jusqu'à décision contraire)** : garder l'accueil menu Metro ; réordonner ses tuiles, réduire les textes redondants, clarifier les libellés, n'afficher que les résumés pertinents, améliorer le héros NextStep et guider vers les écrans fonctionnels. L'agenda peut afficher une liste immédiatement **dans /jam/agenda**, sans modifier le rôle de l'accueil.
- **Option B — accueil hybride plus direct** : raccourci disponibilité, aperçu de jams, action d'invitation sur l'accueil. **Nécessite une décision formelle révisant D50**, une étude de cohérence avec le mode Carrière, le réexamen de MetroHome et des tests comparatifs.

**Ne pas coder l'option B comme si elle était déjà validée.** Cette issue ne remplace pas les décisions prises.

## C. Inventaire des écrans et risques UX observables dans le code

| Route / composant | Ce qui existe | Risque ou friction à tester | Opportunité |
|---|---|---|---|
| \`/jouer\` | Choix des modes, pivot Jam, autres actualités | Deux portes d'entrée vers des informations Jam pouvant se recouper | Clarifier « choisir un mode » vs « consulter ma prochaine jam » |
| \`/jam\` + \`MetroHome\` | Menu Metro à 3 pivots, NextStep, compteurs ; premier pivot « jouer » | Plusieurs tuiles explicatives ; l'ordre fixe peut ne pas refléter les tâches pressantes | Libellés courts, priorités contextuelles, états utiles |
| \`/jam/dispos\` | Formulaire « Je suis dispo » et liste de musiciens disponibles | Deux intentions dans le même écran, description répétée ; statut visible mais pas forcément principal | Séparer visuellement mon statut et les profils ; action unique |
| \`/jam/agenda\` | Calendrier comme filtre principal, liste des jams du jour et lieux proches en bas | Un utilisateur qui veut la prochaine jam doit d'abord comprendre le calendrier | Vue liste chronologique prioritaire, calendrier conservé |
| \`/jam/mes-jams\` | Invitations à jouer, à animer, animations en cours, jams récentes | Mélange d'urgences, d'archives et de gestion | Sections « À traiter », « À venir », « Passées » et gestion hôte contextualisée |
| \`/jams/[id]\` | Détails, places, formation, matériel, participation, outils du lead | CTA de participation éloigné des données initiales et de nombreuses sections | Bloc résumé + CTA contextuel, détails progressifs |
| \`/jam/apprecier\` et \`/jams/[id]/presents\` | Actions d'après-jam, personnes reconnues, appréciations | Étapes comprises mais dispersées | Parcours guidé et retours de confirmation utiles |
| \`/jam/carnet\` | Statistiques, souvenirs, rencontres, réseau et retrait de contact | Écran dense après plusieurs jams ; historique et relations mélangés | Hiérarchie « Souvenirs » puis « Retrouver quelqu'un », ou inverse selon tâche |
| \`/jams/nouvelle\`, gestion des lieux/animations | Création et administration réservées aux rôles autorisés | Risque de charger les vues participant | Entrée « Gérer » réservée aux autorisés |

**Ne pas conclure sans essai** que le panorama est inaccessible ou que le calendrier est inutilisable. La lecture du code permet de signaler des risques, pas de prouver une friction ressentie.

## D. Architecture de l'information cible : test avant décision

### Trois questions, trois intentions

1. **Découvrir** — « Où et avec qui puis-je jouer ? » → agenda, jams proches, disponibilité, profils disponibles, lieux.
2. **Mes jams** — « Qu'ai-je prévu ou à faire ? » → invitations, participations, action après-jam, éventuelle gestion d'événements.
3. **Mon réseau** — « Qui ai-je rencontré et avec qui rejouer ? » → carnet, contacts, appreciations passées, reprise de contact.

Ce sont des **catégories mentales à tester** ; elles ne prescrivent pas obligatoirement trois nouveaux onglets permanents ni des changements d'URL. Définir une source de navigation unique pour les titres et labels, sans duplications incohérentes.

### Principes impératifs

- **Une action principale par état**, pas forcément un seul bouton sur toute la page.
- Pas plus d'une explication courte quand l'action est évidente ; **ne pas cacher une information critique** sous une expansion.
- Le titre répond à « où suis-je ? » et le CTA répond à « que puis-je faire ? ».
- Regrouper les éléments de même nature ; ne pas répéter dates/lieux et compteurs sous plusieurs formats.
- Privilégier **la reconnaissance à la mémorisation** : libellés descriptifs, contexte conservé, lien retour clair.
- Garder les contenus secondaires dans les écrans dédiés pour rester cohérent avec D50.
- Le décor Metro ne masque jamais les informations ; animations adaptées à \`prefers-reduced-motion\`.
- Les paramètres organisateur n'apparaissent jamais comme des actions à exécuter par un musicien ordinaire.

## E. Règles de priorité conditionnelle (à spécifier, tester, valider)

Ne pas programmer une priorité arbitraire côté composant sans vérifier les règles produit et les états du serveur. Proposition de matrice de décisions **pour le héros de l'accueil**, compatible D50 :

| État de l'utilisateur | Besoin le plus probable | Action candidate | À éviter |
|---|---|---|---|
| Pas de commune | Débloquer la découverte locale | « Indiquer ma ville » | Faire croire qu'une recherche locale précise fonctionne |
| Mineur | Trouver une jam admissible | « Voir les jams accessibles » | « Je suis dispo », invitations non autorisées |
| Invitation à jouer en attente | Répondre à une vraie sollicitation | « Répondre à l'invitation » | La dissimuler sous « Mes jams » |
| Invitation d'animation en attente | Décider d'accepter un rôle | « Répondre à l'invitation d'animation » | La confondre avec une invitation de musicien |
| Déjà inscrit à une jam proche | Préparer sa participation | « Voir ma prochaine jam » | Encourager une double inscription |
| Jam commencée | Confirmer seulement si réellement présent | « Qui est là ? » / « J'y étais » | Inférer la présence du RSVP |
| Jam finie et retour possible | Apprécier / garder le contact | « Retrouver les musiciens » | Récompenser le clic |
| Disponible et aucune invitation | Trouver des partenaires ou une jam | « Voir les musiciens disponibles » | Double CTA « se mettre dispo » |
| Aucun événement proche | Explorer les lieux, rencontrer | « Découvrir les lieux » | Écran vide sans issue |
| Organisateur | Actions d'animation pertinentes | Entrée « Gérer mes jams » | Afficher l'outil de gestion à tous |

**Conflits d'états** : plusieurs éléments peuvent être vrais ; en atelier produit, définir l'ordre explicite, tester une invitation urgente face à une jam en cours, et ne pas masquer les autres actions dans la navigation. Les résultats de \`jamNextStep\` et \`NextStep\` doivent être audités avant toute modification : réutiliser la logique existante autant que possible.

## F. Parcours utilisateurs complets à vérifier

### P1 — Nouveau musicien qui ne connaît personne
\`/jouer → /jam → /jam/agenda → /jams/[id] → Je viens\`.
**Attendu** : comprend la promesse « sans pression », trouve une date, identifie lieu/heure/style, sait s'il doit apporter du matériel, participe avec ou sans instrument. Aucun contenu inutile dans le premier écran.

### P2 — Je veux jouer ce soir mais aucune jam ne convient
\`/jam → /jam/dispos → choisir ce soir/demain/week-end → voir profils → message\`.
**Attendu** : comprend que sa disponibilité est temporaire, voit son état actif et peut l'annuler, contacte une personne sans numéro personnel. Pas de sollicitation non autorisée.

### P3 — Invitation en attente
\`/jam → /jam/mes-jams ou fiche directe → accepter/refuser\`.
**Attendu** : l'origine, l'instrument et la réservation sont visibles avant décision ; état actualisé après action ; aucun CTA contradictoire.

### P4 — Soirée commencée
\`fiche jam → présent·es → J'y étais → appréciations\`.
**Attendu** : différence explicite RSVP vs présence déclarée ; droits et délai respectés ; ne pas attribuer de points pour la seule présence.

### P5 — Après la jam
\`Mes jams → Qui était là ? → appréciation → Garder le contact → Carnet/Contacts\`.
**Attendu** : étapes claires, feedback concis, retour possible sans action obligatoire ; aucune note négative ni pression.

### P6 — Animateur
\`Mes jams / lieu → gérer formation, invitation, matériel, lead\`.
**Attendu** : commandes accessibles au rôle autorisé, séparées visuellement du parcours de participation et sans aucun élargissement des autorisations serveur.

### P7 — Élève d'une école
\`Mon école → atelier → Je viens → après-jam si autorisé\`.
**Attendu** : pas de confusion entre atelier réservé et jam publique ; restrictions mineurs et visibilité élève inchangées.

### P8 — Retour d'un musicien expérimenté
\`/jam → prochaine jam ou action en attente → contenu voulu\`.
**Attendu** : navigation rapide, pas de tutoriel répétitif, relecture du statut sans parcours inutile.

### P9 — Deep link et retour
\`notification / partage → /jams/[id] → action → retour\`.
**Attendu** : l'utilisateur comprend le contexte même sans passer par l'accueil ; le retour ne réinitialise pas de façon trompeuse les filtres.

## G. Spécifications de contenu et de microcopy

- **Verbes cohérents** : « Je viens » = intention de participer ; « J'y étais » = présence réelle déclarée ; « Je suis dispo » = signal temporaire ; « Garder le contact » = intention relationnelle.
- **Éviter les synonymes interchangeables** : « invitation à animer » vs « invitation à jouer », « places ouvertes » vs « réservation de formation ».
- **Texte court et opérationnel** : titre orienté résultat + métadonnée (date/lieu) + état + action. Pas de paragraphes marketing répétés sur les écrans d'action.
- **Libellés explicites** : jamais un icône seul pour un acte critique sans nom accessible.
- **Confirmation contextualisée** : l'état après envoi doit être visible, pas seulement via toast éphémère.
- **Erreurs réparables** : expliquer ce qui bloque, conserver la saisie et proposer une solution légitime.
- **Zéro culpabilisation** : refuser une invitation, ne pas donner d'appréciation, quitter une jam ou ne pas être disponible ne pénalise pas l'utilisateur.

## H. Densité, responsive et accessibilité

### Layout / visibilité
- Sur mobile : titre + contexte + action principale accessibles sans scroller à travers un grand bloc décoratif **dans les états prioritaires** (à vérifier sur plusieurs hauteurs, ne pas imposer de pixels magiques).
- Si plusieurs cartes sont visibles, limiter la quantité de métadonnées à celles utiles au choix.
- Réduire les badges purement décoratifs ; une couleur doit exprimer une fonction ou un état.
- Un accordéon pour les détails optionnels, **jamais** pour cacher date, adresse du lieu public, participation, sécurité ou confirmation essentielle.
- Éviter les actions destructrices côte à côte avec le CTA primaire sans distinction claire.

### Accessibilité WCAG 2.2 AA visée
- Navigation entièrement clavier ; focus visible non masqué par éléments sticky ; ordre DOM logique.
- Labels explicites et association des descriptions / erreurs au bon contrôle.
- Contraste texte et contrôles ; pas d'information portée seulement par la couleur.
- Zoom 200 % et redistribution 320 CSS px sans perte fonctionnelle ; tester à 400 % pour les parcours essentiels selon le contexte.
- Cibles tactiles dimensionnées ; vérifier exigences WCAG 2.2 (minimum ou espacement équivalent) et objectifs confort ≥ 44px lorsque pertinent.
- \`prefers-reduced-motion\`, sans animations nécessaires pour comprendre un état.
- Respect des titres, landmarks, lecteurs d'écran, \`aria-live\` limité aux changements réellement pertinents.
- Dialogues et disclosure : gestion du focus et échappement ; ne pas ajouter des modales pour des tâches simples.
- Calendrier : navigation au clavier déjà présente dans le code ; **ne pas régresser** en le convertissant en vue secondaire.
- Couleurs/ombres Metro testées en clair et sombre et \`forced-colors\` lorsque pertinent.

### Qualité de réseau/performance
- Pas de dépendance à un temps réel pour le Jam classique.
- Préserver les formulaires SvelteKit (\`POST\`, progressive enhancement) et la robustesse sans JS là où elle existe.
- Éviter une multiplication d'appels serveur sur chaque navigation, conserver le chargement utile et limiter les animations coûteuses.
- États chargement, vide, erreur et reconnexion expliqués sans masquer une action possible.
- Vérifier que les données sensibles ne fuitent pas dans \`load\` des rôles non autorisés.

## I. Traçabilité : aucune fonctionnalité perdue

| Besoin existant | Point d'accès à préserver | Risque si oublié |
|---|---|---|
| Se mettre dispo / annuler | \`/jam/dispos\` | Perte de la rencontre spontanée |
| Chercher un musicien dispo / envoyer un message | \`/jam/dispos\` | Disparition du mode Jam hors événement |
| Rechercher les jams à venir | \`/jam/agenda\` | Découverte bloquée |
| Choisir une date | calendrier de \`/jam/agenda\` | Usage planifié dégradé |
| Consulter les lieux | \`/lieux\`, depuis agenda | Découverte locale réduite |
| Rejoindre / quitter une jam | \`/jams/[id]\` | RSVP cassé |
| Voir les besoins en instruments et backline | \`/jams/[id]\` | Mauvaise préparation |
| Répondre aux invitations de musicien | \`/jam/mes-jams\` et fiche | Places réservées bloquées |
| Publier une jam autorisée | \`/jams/nouvelle\` | Organisateurs empêchés |
| Inviter / configurer / confier le lead | fiche jam autorisée | Hôtes incapables d'animer |
| Accepter invitation pour animer un lieu | \`/jam/mes-jams\` | Rupture de la gestion lieu |
| Voir atelier d'école | \`/ecoles\` | Parcours élèves cassé |
| Déclarer présence, apprécier, garder contact | \`/jams/[id]/presents\` | Rupture de l'après-jam |
| Consulter son carnet et ses contacts | \`/jam/carnet\`, \`/messages/contacts\` | Rétention/réseau dégradés |
| Continuer vers Carrière | navigation existante | Passage de mode rompu |

**Important :** le changement de présentation ne doit pas fusionner, migrer ni simplifier abusivement le modèle métier.

## J. Plan de recherche UX et livrables préalables

Avant implémentation :
1. **Capturer l'existant** à partir de \`main\` sur mobile et desktop, en clair et sombre, avec des jeux de données représentatifs. Utiliser les seeds de démonstration documentés ; relever le commit testé.
2. Construire une **carte du parcours réel** avec écrans, actions, retours arrière et dépendances.
3. Produire des maquettes basse fidélité **Option A (D50)** et, uniquement pour arbitrage, **Option B (révision D50)**.
4. Test qualitatif avec profils divers : nouveau musicien, musicien régulier, organisateur/lead, si possible un élève et au moins une personne utilisant le clavier ou un lecteur d'écran.
5. Documenter observations : tâche, succès, hésitation, erreur, citation anonymisée, fréquence, gravité ; distinguer faits d'hypothèses.
6. Décider explicitement de l'architecture retenue ; **si D50 change, rédiger une décision** et vérifier les conséquences sur les autres modes.
7. Livrer une **spécification par écran** : informations visibles au premier niveau, priorités, labels, CTA, états vides, interactions, accessibilité, liens et permissions.

### Matrice de gravité
- **Bloquant (P0)** : impossible de réaliser une action métier importante, permission erronée, comportement inaccessible, confusion dangereuse RSVP/présence.
- **Majeur (P1)** : action importante difficile à trouver, obstacle récurrent ou charge cognitive importante.
- **Modéré (P2)** : texte redondant, métadonnée secondaire envahissante, navigation perfectible sans blocage.
- **Mineur (P3)** : finition visuelle purement cosmétique.

**Ne pas utiliser la gravité comme une mesure sans observation.**

## K. Recette détaillée et tests automatisés

### Automatisation Playwright
- Parcours **P1–P9** en desktop et mobile ; scénarios de compte, invitations et niveaux d'accès.
- Navigation par clavier (Tab, Shift+Tab, Entrée, Échap si dialogue, flèches calendrier).
- Clics / retours arrière / accès direct avec query parameters préservés lorsque nécessaires.
- Formulaires : envoi correct, validation, erreur serveur, réponse idempotente lorsque prévue.
- Captures visuelles responsive des états à forte valeur, comparaison avant/après (attention aux animations et données dynamiques).
- Contrôle des messages d'état et alertes, pas uniquement vérification d'URL.
- Tests négatifs : un mineur ou non-organisateur n'accède pas à une action interdite par manipulation d'URL ou d'appel.

### Vérifications manuelles obligatoires
- Audit clavier complet des principaux parcours.
- Vérification lecteur d'écran : titres, noms accessibles, annonces d'état, pagination et calendrier.
- Zoom/réflow, thèmes, contrastes, réduction de mouvement.
- Revue en conditions de connexion lente et écran mobile réel.
- Test d'utilisabilité sur les tâches prioritaires : observations et arbitrages consignés.

### Suite technique
- Conventions \`CLAUDE.md\`, \`CONTRIBUTING.md\`, \`docs/plan/README.md\`.
- \`npm run check\`, \`npm run lint\`, tests unitaires ciblés et \`npm run test:e2e\` selon la définition de terminé.
- Svelte 5 **runes uniquement** ; réutiliser les composants Metro, ne pas dupliquer les systèmes d'état ou modèles de données.
- Ne pas toucher à Prisma, aux niveaux/XP ni aux mécanismes d'anti-abus sans nécessité justifiée et décision documentée.

## L. Contrôle du périmètre / dépendances

| Issue | Objet | Livrable propre |
|---|---|---|
| #61 | Accueil /jam et NextStep | Menu/CTA par état + non-régression D50 |
| #62 | Agenda | Découverte directe sans renoncer au calendrier |
| #63 | Fiche jam | CTA contextuel et informations progressives |
| #64 | Après-jam | Flux présence / apprécie / contact / carnet |
| #65 | Mes jams + animation | Hiérarchie invitations / événements / outil hôte |
| #66 | Mobile / accessibilité | Audit transversal et règles testables |
| #59 | Super Jam, hors périmètre | Exploration indépendante, aucune implémentation dans cet audit |

**Ordre proposé :** cadrer #66 et la décision D50 avant de toucher l'accueil ; réaliser #61 → #62 → #63 → #64 → #65, en appliquant la recette #66 à chaque lot. Un lot = un ensemble petit et vérifiable. Les dépendances techniques réelles seront confirmées au démarrage.

## M. Checklist de fin de chantier

- [ ] Parcours existants cartographiés et captures avant disponibles.
- [ ] Risques UX confirmés/infirmés lors de tests ; preuves enregistrées.
- [ ] Décision D50 maintenue ou officiellement révisée **avant** une architecture différente.
- [ ] Navigation univoque ; titres, actions et états compréhensibles.
- [ ] Les neuf parcours P1–P9 passent en recette.
- [ ] Les états mineur, hôte, lead, élève, non inscrit et jam passée sont couverts.
- [ ] Aucune fonctionnalité ou URL d'entrée perdue.
- [ ] Accessibilité vérifiée par automatisation **et** inspection humaine.
- [ ] Ergonomie testée sur petites fenêtres, mobile réel et desktop.
- [ ] Aucune régression de performance, confidentialité, autorisation, présence ou XP.
- [ ] Documentation d'aide et décisions à jour, avec les preuves et commits.
- [ ] Aucun développement Super Jam / Battle / Roulette / Morphing / Reunion introduit par erreur.

## N. Ce qui n'est PAS autorisé par cette issue

- Transformer de lui-même toutes les pages de l'application en tableau de bord.
- Modifier D50/D55 par simple interprétation, sans décision explicitement validée.
- Supprimer l'accès aux fonctionnalités organisateur pour « alléger » l'UI.
- Fusionner RSVP et présence déclarée, ou changer les règles d'appréciation.
- Ajouter des données de localisation précise, exposer publiquement le carnet ou les élèves.
- Créer un nouveau système de navigation générique pour toute l'application avant d'avoir validé le besoin.
- Déployer le mode Super Jam (#59) dans les travaux de simplification.

## O. Définition du succès

La meilleure UX ne signifie pas « le moins de contenu possible ». Elle signifie **voir les informations exactes au moment où elles sont utiles**. Une nouvelle personne peut jouer sans connaître le produit, une personne régulière rejoint sa prochaine jam sans chercher, l'animateur retrouve ses commandes sans être encombré, et chacun comprend comment revoir les musiciens rencontrés.

**Livrable final attendu : une expérience Jam plus simple et plus rapide, avec exactement les mêmes garanties métier et un chemin d'extension propre vers Super Jam.**


---

## #61 — [UX JAM · 01] Accueil orienté action : jouer, découvrir, invitations prioritaires

[Issue GitHub](https://github.com/Pierre-FABIEN/linkmusician/issues/61)

Parent : #60. **Constat sur main** : `/jam` utilise `MetroHome` à 3 pivots (`jouer`, `mes-jams`, `reseau`) présentant des menus de tuiles. `NextStep` est présent, mais l'action du moment cohabite avec des entrées génériques ; `Apprécier les musicos croisés` apparaît avant la découverte même quand aucune appréciation n'est en attente.

**À étudier / livrer** : écran d'accueil centré sur « jouer maintenant », statut de disponibilité et prochains événements ; invitation urgente ou action après-jam visible *uniquement* si pertinente. Conserver accès à toutes les fonctions (agenda, dispos, invitations, école, organiser, carnet) via navigation secondaire explicite. Tester 3 destinations stables Découvrir / Mes jams / Mon réseau ; ne pas supprimer arbitrairement Metro. Vérifier cohérence avec `/jouer`.

**Critères d'acceptation** : un novice trouve une jam et sa disponibilité sans déduire quel pivot ouvrir ; une invitation en attente est prioritaire ; aucun bloc vide inutile ; mineurs n'ont pas CTA disponibilité ; l'organisateur conserve Lancer une jam ; tous les liens restent accessibles ; navigation clavier et mobile testée. **Tests** : Playwright comptes nouveau/actif/invité/mineur/organisateur ; captures responsive et revue manuelle. **Hors scope** : Super Jam #59.

---

## #62 — [UX JAM · 02] Découvrir les jams : liste chronologique prioritaire, calendrier secondaire

[Issue GitHub](https://github.com/Pierre-FABIEN/linkmusician/issues/62)

Parent : #60. **Constat** : `/jam/agenda` présente d'abord un grand calendrier, une sélection de jour puis les jams associées, avec la liste des lieux en bas. Pour chercher simplement « où jouer bientôt », cela ajoute une étape.

**À étudier / livrer** : présenter directement les prochaines jams ordonnées avec jour, heure, lieu, style, disponibilité des instruments et état « Je viens ». Calendrier conservé comme vue/filtre optionnel ; sélection de date accessible. Distinguer clairement journées sans jam et absence totale de jams ; lien vers les lieux sans surcharger l'écran initial. Maintenir l'URL et l'accès clavier au calendrier.

**Critères** : liste utile visible rapidement sans date préalable ; retour au calendrier simple ; filtres/états conservés à la navigation ; aucun changement de données, d'accès mineur, d'heures Europe/Paris ; CTA vers fiche de jam clair. **Tests** : Playwright 0/1/multiples jams, traversée de mois, mobile, clavier, fuseau horaire.

---

## #63 — [UX JAM · 03] Fiche jam : une action principale contextuelle et détails progressifs

[Issue GitHub](https://github.com/Pierre-FABIEN/linkmusician/issues/63)

Parent : #60. **Constat** : `/jams/[id]` enchaîne titre, méta, description, matériel à apporter, places, formation, backline, participation, puis commandes lead. La bonne action peut être éloignée du haut de page.

**À étudier / livrer** : synthèse compacte date/lieu/style/état ; CTA contextualisé très tôt : `Je viens`, `Répondre`, `Je ne viens plus`, `Qui était là ?` selon permission/état. Mettre « quoi apporter » en évidence pour inscrit ; fusionner visuellement formation et places sans les confondre ; détails matériels, description longue et outils de lead à la demande ou onglet de gestion dédié. Éviter CTA concurrents ; maintenir une confirmation claire sur actions destructives si nécessaire.

**Critères** : états visiteur/invité/inscrit/hôte/lead/jam commencée/past lisibles ; toutes actions et champs accessibles ; aucun changement des règles de réservation/participation ; retour depuis l'agenda préservé ; accessibilité sans accordéon indispensable caché. **Tests** : Playwright états multiples, soumission formulaire, clavier, petits écrans.

---

## #64 — [UX JAM · 04] Après-jam : parcours continu présence → appréciations → contact → carnet

[Issue GitHub](https://github.com/Pierre-FABIEN/linkmusician/issues/64)

Parent : #60. **Constat** : `/jam/apprecier`, `/jams/[id]/presents`, `/jam/mes-jams`, `/jam/carnet` exposent un parcours métier cohérent mais distribué en plusieurs pages ; l'utilisateur doit retrouver où commencer.

**À étudier / livrer** : proposer depuis l'accueil ou `Mes jams` une action pertinente uniquement si jam récente/éligible ; enchaîner `J'y étais` → `Qui était là ?` → apprécier / garder contact → retour au carnet, avec états terminés distincts ; un seul message simple à chaque étape ; conserver libre sortie et navigation arrière. Pas de points ajoutés pour la présence ni de fausse confirmation.

**Critères** : présence différente d'inscription ; délai d'appréciation et conditions de confiance inchangés ; pas d'incitation répétée après traitement ; carnet privé ; appréciations toujours positives ; refus/absence correctement gérés. **Tests** : Playwright participé/non participé/délai expiré/sans droit/bloqué, échec réseau et retours.

---

## #65 — [UX JAM · 05] Mes jams et animation : séparer invitations, événements, gestion hôte

[Issue GitHub](https://github.com/Pierre-FABIEN/linkmusician/issues/65)

Parent : #60. **Constat** : `/jam/mes-jams` regroupe invitations à animer, animations en cours, invitations à jouer et jams récentes ; les actions ne sont pas de même nature. La fiche d'une jam mélange participation et commandes de gestion pour les leads.

**À étudier / livrer** : hiérarchie `À traiter` (invitations) / `À venir` / `Passées`, et entrée `Gérer mes jams` visible seulement si habilité. Organisateur/hôte : tableau de pilotage dédié et compact (formation, invités, backline, lead), sans créer de doublon de données ni modifier les permissions ; participants : ne montrer que l'information nécessaire.

**Critères** : invitation à animer distincte d'invitation à jouer ; aucun droit élargi ; actions d'acceptation/déclin correctement contextualisées ; rôles hôte, lead, lieu et musicien vérifiés ; pas de modification du contrat des jams récurrentes. **Tests** : autorisations serveur, E2E hôte/lead/musicien/lieu, mobile.

---

## #66 — [UX JAM · 06] Navigation mobile, densité visuelle et accessibilité du mode Jam

[Issue GitHub](https://github.com/Pierre-FABIEN/linkmusician/issues/66)

Parent : #60. **Constat** : le menu Metro repose sur un panorama horizontal de pivots ; les pages secondaires ont chacune de nombreux blocs et des méthodes de retour variables. La qualité réelle sur mobile doit être validée en navigateur.

**À étudier / livrer** : audit de navigation sur 320/375/768/desktop, scroll horizontal vs vertical et orientation ; conserver un repère de section stable, retour vers la source pertinente, états focus. Réduire texte explicatif et badges répétitifs, limiter une action dominante par contexte, hiérarchiser H1/H2, labels de boutons et zones tactiles. Préserver le design Metro sans sacrifier contrastes, lecture ou performances ; animations non essentielles respectent `prefers-reduced-motion`.

**Critères** : aucun débordement ou piège de scroll ; navigation clavier complète, focus visibles, labels correctement annoncés ; WCAG 2.2 AA visé (audit manuel nécessaire) ; lisibilité à zoom 200 %, 320px et thèmes clair/sombre ; pas de changement du contrat métier. **Tests** : Playwright desktop/mobile (dont captures), axe automatisé en complément de vérification manuelle lecteur d'écran.

---

## #70 — [UX JAM · DESIGN SYSTEM] Catalogue de tuiles Metro adaptatives et hiérarchie contextuelle

[Issue GitHub](https://github.com/Pierre-FABIEN/linkmusician/issues/70)

# UX JAM — Système de tuiles Metro adaptatives, hiérarchisées et contextualisées

> **Statut : spécification UX à valider, pas implémentation autorisée.** En complément de #60 (audit) et #61–#66 (parcours). Le besoin confirmé : **l'interface doit rester majoritairement composée de tuiles**, comme une application Metro, avec des compositions adaptées à leur sens et des priorités fortes ; ne pas remplacer la mosaïque par une liste uniforme ou un dashboard chargé.

## 1. Vision explicite
La tuile est une **unité de contenu et d'action**, pas une simple carte décorative. Sa **taille, position, densité, visuel et CTA** expriment la pertinence à ce moment. Plusieurs tuiles peuvent utiliser un même socle, tout en ayant des compositions distinctes selon leur usage. Conserver lisibilité, personnalité, modularité, accessibilité et efficacité mobile.

**Question à résoudre sur chaque tuile :** Que dois-je comprendre en 2 secondes ? Que puis-je faire ? Pourquoi est-ce prioritaire pour moi ?

## 2. État actuel dans `main` (lecture vérifiée)
- `docs/design/README.md` §4–5, décisions **D50** (accueil page-menu) et **D55** (Metro), couleurs par signification, mosaïque, règles d'action unique.
- `Tile.svelte` : primitive avec `tone`, `size`, `framed`, `icon`, `fx`, comportement lien/bouton/bloc. Garder la primitive.
- `tones.ts` : tailles `sm 2×1`, `md 2×2`, `wide 4×2`, `band 4×1`, `tall 2×3`, `big 4×3`. **Ne pas redéfinir ces tailles sans preuve de besoin.**
- `MetroMenu.svelte` : tuiles de menu actuellement uniformes avec icône, titre, phrase et résumé vivant. Les contrastes et priorités passent principalement par le texte et `highlight`.
- `EventTile.svelte`, `ProfileTile.svelte` : compositions métier déjà présentes, à **auditer et réutiliser avant de créer une variante**.
- `MetroHome.svelte` : panorama en pivots et héros `NextStep` ; `/jam` utilise 3 pivots « jouer », « mes jams », « réseau ».

**Attention :** les `EventTile`/`ProfileTile` existants ont des compositions riches ; vérifier si elles respectent tous les usages (menu, navigation, boutons internes, accessibilité), pas les généraliser aveuglément.

## 3. Deux couches : primitive de design et fiches métier
**Socle** : `Tile` + `TileFrame` + tokens Metro ; gestion ton, taille, action, focus, animations, responsive. **Ne pas créer 20 composants copiant le même cadre ou CSS.**

**Fiches de composition réutilisables** (composants dédiés uniquement si récurrence réelle) : nom, priorité et contenu sont déterminés par le métier. Distinguer :
- **Tuile de navigation** : conduit à une page dédiée, conformément à D50.
- **Tuile d'action** : déclenche un seul geste permis par D50 (héros) ou propose une seule action contextuelle dans la page de détail.
- **Tuile informationnelle** : annonce un état, sans clic trompeur.
- **Tuile métier** : date, musicien, invitation, présence, souvenir, outil organisateur.

**Règle composant** : variante = **différence d'organisation du contenu ou d'interaction** démontrée ; ne pas créer une variante pour une simple couleur ou taille. Les données/permissions restent dans la couche serveur/domain, pas dans un composant de rendu.

## 4. Catalogue initial de fiches de tuiles (12 cas à maqueter)

| Fiche | Rôle / contenu premier niveau | Hiérarchie suggérée | Comportement |
|---|---|---|---|
| **T01 Héros Jam / NextStep** | Étape suivante, phrase courte, **1 CTA** | Dominante (`big` ou équivalent selon contexte du pivot) | N'apparaît qu'avec action valide ; pas de formulaire long |
| **T02 Jam imminente** | Titre, jour/heure, lieu, état « Je viens » | Forte si inscrite ou imminente, sinon moyenne | Ouvre la fiche ; pas de second bouton dans la tuile lien |
| **T03 Découvrir des jams** | Prochaine date, nombre de jams et intitulé très court | Moyenne, entrée menu principale | Lien `/jam/agenda` |
| **T04 Disponibilité** | « Disponible ce soir » ou « Me mettre dispo », durée | Forte si pertinent, sinon moyenne | Lien `/jam/dispos` ; aucune dispo exposée aux mineurs |
| **T05 Musiciens proches** | Nombre de musiciens disponibles + instrument/style pertinents si fiable | Moyenne | Lien `/jam/dispos`, pas de données privées |
| **T06 Invitation à jouer** | Nom de la jam, date, instrument, état « Réponse attendue » | Forte si en attente | Ouvre fiche pour répondre |
| **T07 Invitation à animer** | Lieu et responsabilité, distinction nette de l'invitation à jouer | Forte si en attente, réservée au rôle autorisé | Lien de gestion/réponse |
| **T08 Après-jam à traiter** | Jam, personnes à apprécier si autorisé, fenêtre de temps | Forte si réellement actionnable | Lien `/jam/apprecier` ou page présents |
| **T09 Carnet & souvenirs** | Dernière jam, nombre de rencontres, souvenir personnel | Moyenne ou faible | Lien `/jam/carnet` |
| **T10 Contact / rejouer** | Profil, instrument, contexte « 2 jams ensemble » si vrai | Moyenne | Lien contact/profil ; pas de sollicitation non autorisée |
| **T11 Organiser / gérer** | Jam gérée, prochaine date, action d'organisation | Moyenne uniquement si droit confirmé | Lien `/jams/nouvelle` ou gestion existante |
| **T12 État vide utile** | « Aucune jam proche » + une seule solution possible | Occupe juste l'espace nécessaire | Lien vers agenda/dispos/ville ; pas de faux compteur |

Ce catalogue est un **inventaire UX**, pas une obligation de créer 12 nouveaux composants. Certaines fiches peuvent utiliser `MetroMenu` enrichi, `EventTile`, `ProfileTile`, `ActionTile`, `MetroEmpty` déjà disponibles.

## 5. Format obligatoire d'une fiche de conception de tuile
Documenter pour chaque fiche : **ID/nom, objectif et profil, contexte d'affichage, état et permissions, source de données, contenu essentiel, secondaire, informations volontairement absentes, taille recommandée, ton sémantique, action, focus/nom accessible, mobile 360px, état vide/loading/erreur, critères d'acceptation, composant existant réutilisé et test E2E**.

Exemple :
### Fiche T06 — Invitation à jouer
- **Question** : « On m'invite où, quand et pour quel instrument ? »
- **Priorité** : haute tant que réponse attendue ; après réponse, devient simple état de participation.
- **Données affichées** : titre de la jam, date/heure localisées, instrument réservé, libellé « Invitation en attente ».
- **Non affiché** : description longue du lieu, statistiques de l'événement, options du lead.
- **Action unique** : ouvrir la fiche jam où accepter/refuser sont contextualisés ; ne jamais imbriquer deux boutons dans une tuile déjà lien.
- **État sans donnée** : tuile absente, pas un grand carré vide « aucune invitation ».
- **Accessibilité** : nom du lien explicite, focus visible, statut textuel, pas uniquement une bordure colorée.
- **Recette** : invitation active, expirée/retirée, acceptée, refusée, mineur si applicable, sortie/reconnexion.

## 6. Algorithme de hiérarchie visuelle : règles et non hasard
Décider d'abord **la priorité métier**, puis seulement la taille/couleur/position.
- **P0 immédiat** : action réellement attendue (invitation, décision indispensable) : une seule tuile principale à un instant donné.
- **P1 prochain événement / disponibilité** : prochaine jam inscrite, possibilité de se mettre dispo si autorisé.
- **P2 exploration** : agenda, musiciens disponibles, lieux.
- **P3 historique et options** : carnet, contacts, organisation s'il n'y a aucune action urgente.

La priorité varie par contexte et non par valeur commerciale, nombre de clics ou niveau d'XP. En présence de plusieurs urgences, conserver les accès secondaires et définir un arbitre explicite côté domaine. **Ne pas réordonner toute la grille à chaque chargement** si cela désoriente ; stabilité de position et de regroupements, avec mise en avant contextuelle.

## 7. Règles de composition Metro
- Une tuile = **une intention sémantique** ; pas plusieurs phrases de marketing ou plusieurs CTA concurrents.
- **Titres courts** et description facultative ; chiffres mis en avant seulement quand utiles.
- Un `summary` vivant maximum dans une tuile-menu D50 ; ne pas transformer chaque tuile en mini-dashboard.
- Utiliser la taille pour l'importance et la complexité, **pas uniquement pour remplir la mosaïque**.
- Maximum **3 tons vifs par écran** (règle design existante). Palette : Jam orange ; temps/dispo cyan ; réseau rose ; confirmation lime ; priorités amber.
- Les blocs informatifs neutres prennent `paper`/`ink` pour laisser respirer la page.
- Préférer un élément graphiquement fort et peu de texte plutôt que cinq puces.
- Ne pas tronquer des informations critiques (date, état, instrument, action) ; vérifier le wrapping et les hauteurs en mosaïque.
- Animation `fx` pour les tuiles importantes, **2 maximum par écran** selon `docs/design`.
- `framed` / transform/opacity pour les mouvements performants ; pas d'effet coûteux permanent sur toutes les tuiles.
- Sur mobile 360px : vraie lecture, pas de case vide, clipping ou cible réduite. Si une taille `sm` ne contient pas son texte, raccourcir le contenu ou choisir une variante autorisée ; ne pas baisser la taille des polices arbitrairement.

## 8. Compatibilité avec les décisions D50/D55
La demande utilisateur **renforce** la direction Metro et **n'autorise pas** à convertir automatiquement `/jam` en dashboard de listes et formulaires. Conserver la page-menu de tuiles et ses pivots tant qu'une décision explicite n'a pas changé. **Variété de forme dans la mosaïque ≠ tableau de bord surchargé**. Chaque entrée ouvre une page dédiée ; le héros porte le geste rapide prévu.
Si l'équipe souhaite des tuiles d'actions directes supplémentaires sur l'accueil ou changer le paradigme du panorama, proposer une révision D50 **avant** le code.

## 9. Architecture technique proposée
- Garder `Tile` primitive ; ajouter des **presets de contenu typés** ou compositions Svelte 5 réutilisables selon la fréquence réelle.
- Configuration de tuile définie par des **view models** typés et testables : `id`, `kind`, `priority`, `tone`, `size`, `href`/action, `label`, `summary`, `state` ; ne pas exposer données privées.
- Le choix de priorité se calcule une seule fois de manière déterministe à partir des données serveur existantes ; isoler la logique pure pour tests unitaires.
- Ne jamais laisser le client décider des permissions/états sécurisés ; aucune action nouvelle sans contrat serveur.
- Svelte 5 runes only, TS strict, pas de duplication des éléments de `metro.css`.
- Respecter `AppShell`, `Panorama`, `Pivot`, `MetroHome`, `MetroMenu`, `TileFrame` et les tokens, en préservant les tests existants.

## 10. Livrables attendus avant code
1. **Inventaire** des tuiles actuelles du mode Jam (route, données, action, taille/ton, capture mobile/desktop).
2. **Catalogue de fiches** T01–T12, chacune avec composition concise et états variantes.
3. **Maquettes comparatives** de l'accueil Jam nouveau/régulier/invité/mineur/organisateur ; clair/sombre ; mobile/desktop.
4. **Matrice des priorités** et du comportement en cas de plusieurs états concurrents, à valider.
5. **Analyse de réutilisation** : quels composants du design Metro existent, quelles compositions manquent, justification pour toute nouvelle abstraction.
6. Protocole de test utilisateur « identifier en 5 secondes où jouer / répondre / retrouver ses contacts », et restitution des observations.

## 11. Critères d'acceptation
- [ ] L'accueil est toujours composé principalement de **tuiles hiérarchisées** ; pas de longue liste uniforme substituée au Metro.
- [ ] La différence entre P0/P1/P2/P3 se voit **sans lire tous les textes** et sans dépendre uniquement de la couleur.
- [ ] L'importance et le contenu influencent la **taille et la composition** ; pas 12 tuiles identiques.
- [ ] Les 12 fiches sont documentées, avec réutilisation vérifiée des composants existants ; aucune bibliothèque parallèle.
- [ ] Une action dominante contextualisée ; pas de CTA contradictoires ni de lien/bouton imbriqué dans une tuile cliquable.
- [ ] L'état mineur, nouveau membre, invité, inscrit, après-jam, organisateur est couvert et sécurisé.
- [ ] L'utilisateur trouve agenda/dispo/invitation/contacts ; tous les chemins existants restent accessibles.
- [ ] Pas de surcharge visuelle : maximum 3 tons vifs, icônes animées limitées, pas de paragraphe dans toutes les tuiles.
- [ ] 360px et desktop, clair/sombre, zoom, lecteur d'écran, navigation clavier, focus et mouvement réduit validés.
- [ ] Les performances restent bonnes (pas de calcul de layout en boucle ni rafraîchissements inutiles).
- [ ] Tests unitaires de priorisation + Playwright des parcours, et revue visuelle avant/après.
- [ ] Conformité D50/D55 ; aucune modification métier non validée.

## 12. Liens et ordre
- **#60** : audit et exigences transverses ; harmoniser le ticket avec cette vision tuiles.
- **#61** : application prioritaire des fiches à `/jam` (après validation).
- **#62–#65** : compositions métier dans les pages de détail et parcours.
- **#66** : recette mobile/accessibilité des variantes.
- **#59** : Super Jam ; ses tuiles live feront l'objet de leur propre conception ultérieure, hors portée ici.

**Conclusion :** développer potentiellement de nombreuses **compositions** de tuiles ne signifie pas multiplier les CSS ou les comportements ; construire un petit **design system robuste** qui sélectionne le bon modèle visuel pour la bonne information, au bon moment.


---

## #71 — [UX CARRIÈRE · CADRAGE] Le projet musical au centre : parcours évolutif, réseau carrière et tuiles Metro

[Issue GitHub](https://github.com/Pierre-FABIEN/linkmusician/issues/71)

# Vision validée — Carrière centrée sur les projets musicaux

> **Statut : ticket de clarification produit, architecture UX et audit d'alignement du code sur \`main\`. Pas une autorisation implicite de refondre l'application ou de modifier le schéma.**
>
> **Décision d'intention exprimée :** l'utilisateur entre dans Carrière pour **créer ou retrouver un projet**, puis **faire avancer ce projet étape par étape**. Les musiciens et professionnels sont proposés **au bon moment**, facultativement. Le réseau personnel Carrière constitue le socle transversal. **Aucun sujet Jam dans l'interface Carrière.**

## 1. Problème à résoudre

Le mode Carrière dispose aujourd'hui de plusieurs destinations utiles : objectifs, ambition, carte de carrière, équipe, groupes, morceaux, campagnes, collaborations, agenda, fiche, journal, progression, accompagnement. **Elles doivent être présentées comme les outils d'une histoire cohérente**, pas comme une collection d'applications qu'il faut comprendre avant d'agir.

### Phrase directrice

**« Je crée mon projet musical. Melokiva m'indique la prochaine étape pour le faire avancer, m'aide à trouver les bonnes personnes si j'en ai besoin et conserve l'histoire réelle de ce projet. »**

### Ce que l'utilisateur doit comprendre sans tutoriel
1. **Je possède un espace Carrière personnel** avec mon réseau et l'ensemble de mes projets.
2. **Je peux créer un projet musical**, ou reprendre un projet existant.
3. **Chaque projet dispose de son propre parcours**, ses membres, morceaux, besoins, collaborations, réalisations.
4. **Une action principale** me fait avancer ; les autres possibilités restent accessibles sans submerger l'écran.
5. Je peux **faire moi-même, collaborer ou remettre à plus tard** selon l'étape et les contraintes métiers.
6. Mes réalisations personnelles sont **distinctes** de celles de chaque projet.
7. Le **mode Jam est séparé** : aucune jam, disponibilité, carnet de jam, vote ou Super Jam dans les vues propres à Carrière.

## 2. Architecture de l'information cible

\`\`\`text
MODE CARRIÈRE
├── Mes projets                         ← entrée principale
│   ├── Créer un projet                 ← proposition évidente si aucun projet
│   ├── Projet A                        ← état + prochaine action
│   │   ├── Vue d'ensemble
│   │   ├── Parcours du projet          ← progression contextualisée
│   │   ├── Équipe et invitations
│   │   ├── Morceaux et maquettes
│   │   ├── Prestations / professionnels
│   │   ├── Dates / sorties / réalisations
│   │   └── Historique et éléments de preuve
│   └── Projet B                        ← parcours totalement indépendant
├── Mon réseau Carrière                 ← contacts, échanges et collaborations pro
├── Mes contributions                   ← ce que je fais sur plusieurs projets
├── Mes demandes / confirmations        ← uniquement celles liées à Carrière
└── Mon parcours personnel              ← réalisations, progression, fiche
\`\`\`

**Cette structure est un modèle mental / une proposition UX, pas une liste de nouvelles routes à créer.** Examiner les écrans et entités existants et privilégier composition/navigation plutôt que duplication.

### Règle non négociable
Le **projet** est l'axe principal du parcours. Une **étape** appartient à un **projet donné** ; un même musicien peut donc avoir plusieurs projets, chacun à un stade différent.

## 3. Parcours simple de référence

\`\`\`text
J'arrive dans Carrière
  → Je crée mon projet musical (ou je sélectionne un projet)
  → « Constituer l'équipe »
      → inviter des musiciens suggérés OU continuer seul
  → « Créer une première maquette »
      → créer un morceau, créditer des membres si besoin, joindre une démo
  → « Enregistrer »
      → moi-même / quelqu'un de l'équipe / trouver un ingé son / plus tard
  → « Mixer / masteriser / produire »
      → choix contextualisés de prise en charge ou de professionnel
  → « Préparer une sortie »
      → crédits, documents, distribution, éléments nécessaires
  → « Promouvoir / développer le public »
      → ressources et métiers adéquats si réellement disponibles
  → « Trouver des concerts »
      → opportunités, organisateurs, bookers, dates, confirmations
  → « Développer le projet »
      → accompagnement, équipe élargie, prochaines réalisations
\`\`\`

**Le parcours est une suggestion, pas un tunnel rigide ni des portes bloquantes.** Le musicien peut sauter une étape, la faire plus tard, créer plusieurs morceaux, lancer des concerts avant une sortie, travailler avec un ingé son dès la première maquette, etc. Si une action est impossible, afficher précisément pourquoi.

### Distinction indispensable : progression d'un projet et progression d'un morceau
Un projet/groupe **contient potentiellement plusieurs morceaux**. Chacun possède ses propres étapes de production et son équipe de crédits.
- **Projet** : identité, membres, jalons collectifs, prestations, sorties, concerts, développement.
- **Morceau** : idée, maquette, crédits, enregistrement, mixage, mastering, production, éventuelle sortie.
- **Contributions personnelles** : participations dans plusieurs morceaux, groupes et prestations ; une réalisation confirmée remonte sans double comptage.
**Ne pas confondre la maquette d'un morceau avec l'avancement global du groupe** ; plusieurs morceaux peuvent être simultanément à des stades différents.

## 4. Cas métier à trancher avant toute nouvelle entité

L'utilisateur dit « projet → (groupe) ». Le code possède déjà des modèles **groupe/BAND**, **morceau/Work**, **collaboration**, organisations et suivis d'étapes ; il serait contre-productif de créer une entité \`Project\` en doublon par réflexe.

**Questions à documenter par vérification code + atelier :**
1. Un « projet » est-il toujours un \`BAND\` existant, avec le **solo comme groupe à un membre**, ou faut-il une abstraction supérieure ?
2. Un musicien qui crée juste un morceau solo sans groupe : doit-il créer un projet automatiquement, en créer un explicitement, ou garder un morceau personnel rattaché à sa carrière ?
3. Comment représenter un collectif informel avant toute invitation acceptée, sans donner faussement le statut « groupe formé » ?
4. Comment afficher des collaborations ponctuelles sans les transformer en membres du groupe ?
5. Qui peut gérer les différentes étapes, inviter, valider, retirer, et qu'advient-il d'un projet après le départ de son fondateur ?
6. Comment gérer un artiste solo ayant plusieurs projets distincts ou contribuant aux projets d'autres personnes ?

**Par défaut : réutiliser les entités existantes et ne changer aucune règle d'autorisation / preuve sans décision formalisée.**

## 5. UX Metro : tuiles hiérarchisées et adaptatives

**La direction Metro est maintenue** (D50, D55 et catalogue de tuiles #70). Il ne faut pas remplacer la mosaïque par un écran administratif en listes interminables.

### Accueil Carrière
- **Tuile dominante** : projet à reprendre / prochaine action réellement utile. Si aucun projet, CTA « Créer mon projet ».
- **Tuiles projets** : une tuile par projet avec nom, état court, prochaine étape et éventuel indicateur d'attente.
- **Tuiles secondaires** : Mon réseau Carrière, Mes contributions, Demandes à confirmer, Mon parcours personnel.
- **Ne pas afficher** tous les objectifs, niveaux, XP, badges, invitations et étapes de production simultanément.
- Conserver une navigation claire pour plusieurs projets, et un comportement stable sans réordonner constamment les tuiles.
- **Attention D50 :** si l'on veut transformer l'accueil page-menu en véritable dashboard de contenus/actions, il faut une décision explicite révisant la règle existante. Une mosaïque de liens contextuels reste compatible D50.

### Vue projet
- En tête : identité du projet + **étape actuelle ou proposition d'action**, sans promettre une progression linéaire absolue.
- Tuiles spécialisées : équipe, morceau en cours, besoins de collaborateurs, production, dates, réalisations.
- **Une seule action primaire** à un moment donné ; autres actions visibles ou accessibles à la demande.
- Afficher les états : **À faire / En cours / En attente d'un tiers / Terminé / Non applicable**. Ils ne constituent pas automatiquement une preuve ni de l'XP.
- Les suggestions d'intervenants sont **strictement contextuelles et facultatives**, avec choix explicite avant de contacter quelqu'un.
- Respecter design Metro : taille significative, texte court, tons sémantiques, pas plus de 3 tons vifs, animations limitées, contraste et focus.
- **Utiliser \`Tile\` / \`TileFrame\` / compositions métier** existantes ; variantes justifiées par nature du contenu, pas par duplication CSS.

### Fiches de tuiles à concevoir
\`CareerProjectTile\` (projet), \`ProjectNextStepTile\` (étape), \`ProjectTeamTile\` (équipe), \`ProjectWorkTile\` (morceau), \`ProjectNeedTile\` (intervenant à trouver), \`ProjectTaskTile\` (prise en charge), \`ProjectMilestoneTile\` (preuve/réalisation), \`CareerContactTile\` (réseau) et \`CareerContributionTile\` (contribution personnelle).
**Noms conceptuels uniquement** : inventorier les composants déjà existants avant de décider s'il faut réellement les créer.

## 6. Séparation nette Jam / Carrière

**Aucun sujet Jam dans le mode Carrière.** L'interface Carrière ne doit pas présenter :
- calendrier de jams, disponibilité de jam, participation « Je viens », « J'y étais », carnet de jams, appréciations de jam, Super Jam, Jam Roulette, Jam Battle ;
- étapes Jam comme prérequis, ni incitations à participer à une jam pour faire avancer son projet.

Le mode Carrière conserve ses **contacts professionnels, collaborations, demandes, événements professionnels et dates de projets**.

**Nuance technique importante :** ne pas effacer l'historique légalement ou métier valide, ni casser les services transversaux existants. Si les collaborations ou statistiques existantes ont une origine Jam, définir une **projection / filtration explicite à l'interface** et documenter séparément tout changement de source de vérité. Le passage volontaire d'un contact vers un projet peut exister sans afficher de contenu Jam dans Carrière. Réviser les documents actuels qui mélangent agenda Jam / Carrière avant de modifier leur comportement.

## 7. Situation actuelle vérifiée dans le dépôt

- \`src/routes/(app)/espace/+page.svelte\` : accueil autour des pivots \`avancer\`, \`parcours\`, \`reseau\`, \`reperes\`, avec NextStep et les priorités. **Il ne commence pas par « Mes projets ».**
- \`src/routes/(app)/espace/+page.server.ts\` : rassemble progression personnelle, \`bandCounts\`, \`campaigns\`, carte de carrière, suggestions et accompagnements. Cela peut fournir des briques pour une UI projet sans nouveau backend.
- \`src/routes/(app)/espace/agenda\` et la documentation de l'aide incluent actuellement des jams : **écart explicite avec la cible validée**.
- \`src/routes/(app)/groupes\`, \`/groupes/[handle]\`, \`/morceaux\`, \`/morceaux/[id]\`, \`/morceaux/[id]/etapes\` : fonctions existantes à raccorder au parcours, pas à reproduire.
- \`src/routes/(app)/morceaux/[id]/etapes/+page.svelte\` : prise en charge personnelle de l'enregistrement, statuts et historique déjà présents. **Ne pas nier ce qui est livré sur main** ; l'audit statique ARCH-MET-01 du 15/11 peut être partiellement périmé sur ce point.
- \`docs/conception/07-modes-de-jeu.md\`, \`08-carrieres-par-role.md\`, \`10-navigation-metiers.md\`, \`17-audit-capacites-services.md\` : distinguer règles actuelles, alternatives de conception et futures capacités.
- \`RoleSpace.svelte\` : métiers non-musiciens affichent déjà leur menu dédié. Le parcours « Mes projets » ne doit **pas** écraser les espaces ingénieur du son, producteur, organisateur, manager, booker ; clarifier la place des projets musicaux dans l'accueil musicien et dans les autres contextes métier.
- \`docs/design/README.md\` : D50/D55 et règles de tuiles. Se référer aussi à #70.

## 8. Scénarios de recette à écrire

**S1 — Nouveau guitariste** : aucun projet → création → proposition d'inviter des musiciens ou rester seul → prochaine action maquette. L'utilisateur ne passe pas par Jam.

**S2 — Projet solo** : création sans aucun invité → morceau solo → enregistrement autonome au home studio → peut poursuivre sans ingé son ni faux crédit tiers.

**S3 — Groupe** : invitations envoyées, acceptées/refusées, rôles de responsables → étape d'équipe reflète la réalité, sans inventer de présence ni de validation.

**S4 — Plusieurs projets** : deux groupes / projets à des étapes différentes → sélection et reprise indépendantes, aucune contamination d'état.

**S5 — Plusieurs morceaux par projet** : une maquette, un morceau en mixage, une sortie → la synthèse du projet n'affiche pas un état unique trompeur.

**S6 — Professionnel facultatif** : à l'enregistrement, propositions d'ingé son réellement pertinents et autorisés → l'utilisateur choisit sans sollicitation automatique → collaboration confirmée suivant règles existantes.

**S7 — Contribution externe** : musicien invité sur un morceau d'un autre projet → ses crédits apparaissent dans « Mes contributions » mais pas comme un projet qu'il gère.

**S8 — Réseau Carrière** : accès aux contacts et conversations liés au travail musical, sans calendrier ni langage Jam.

**S9 — Autres métiers** : contexte ingénieur, producteur, manager, booker, organisateur → menus métier existants conservés ; aucune attribution de droits via le changement de contexte.

**S10 — Navigation et sécurité** : deep links, retour arrière, mobile 360px, clavier, lecture d'écran, mineurs, blocages, retrait d'adhésion, permissions serveur.

## 9. Critères d'acceptation et livrables

### Cadrage (ce ticket)
- [ ] Inventaire code **route → entité → action → permission** du parcours Carrière existant.
- [ ] Clarification et décision documentée : « Projet = groupe/BAND ? », solo, multi-projet, contribution externe.
- [ ] Cartographie séparée **Carrière personnelle / Projet / Morceau** et des propriétés/permissions de chacune.
- [ ] Arbre de navigation cible avec **zéro entrée Jam**, sans perte de fonctions Carrière.
- [ ] Identification des textes/services/agrégats actuels contenant des jams, stratégie de séparation sans altérer les faits.
- [ ] Maquettes Metro accueil et projet (vide, solo, groupe, multi-projet, attente d'un tiers), mobile + desktop, clair/sombre.
- [ ] Fiches des tuiles adaptées au contenu, tailles/tons, priorités et interactions, selon #70.
- [ ] Matrice de transitions à chaque étape : auto / équipe / pro / plus tard / réalisé, et règles métier déjà disponibles.
- [ ] Matrice des cas limites et décisions requises (pas d'implémentation arbitraire).
- [ ] Validation explicite des éventuelles révisions de D50 et de toute règle métier.
- [ ] Découpage en petits tickets d'implémentation avec dépendances et tests.

### Suite technique (tickets ultérieurs, pas celui-ci)
- [ ] Aucun changement de droits, XP, preuves, confidentialité ou schéma non justifié.
- [ ] Svelte 5 runes uniquement, TypeScript strict, réutilisation du design system Metro.
- [ ] Tests unitaires des projections et de la priorité ; Playwright S1–S10 ; vérification manuelle accessibilité WCAG 2.2 AA.
- [ ] \`npm run check\`, \`npm run lint\`, tests requis par \`CLAUDE.md\`.
- [ ] Mises à jour de \`docs/conception/\`, \`docs/decisions/\`, aide utilisateur et plan avant livraison.

## 10. Hors périmètre explicite

- Développement Super Jam / refonte du mode Jam (#59, #60, #70).
- Création automatique d'un nouveau modèle \`Project\` sans audit du modèle BAND/Work.
- Implémentation immédiate de toutes les étapes futures (label, édition, communication, distribution, tâches avancées).
- Présentation de fonctionnalités « bientôt » comme déjà utilisables.
- Fusion des niveaux/XP, des faits de carrière, des étapes d'un groupe et des statuts d'un morceau.
- Croisement automatique des membres ou contacts entre projets.
- Ajout de formules ou d'écrans surchargés pour « remplir » les tuiles.

## 11. Relation avec le travail existant

- #30 : épopée espaces métier — périmètre transversal.
- #41 : musicien/chanteur — espace professionnel.
- #51–#54 : étapes autonomes et UX d'enregistrement.
- #70 : catalogue de tuiles Metro adaptatives.
- #60–#66 : refonte Jam, **distincte de ce chantier**.

**Livrable recherché :** un mode Carrière où l'utilisateur **ne parcourt pas des fonctionnalités**, mais **fait avancer un ou plusieurs projets musicaux**, étape par étape, avec une interface Metro claire, contextualisée et adaptable.

---

## #72 — [UX CARRIÈRE · GRAPHE] Parcours non linéaires, branches indépendantes et suggestions contextuelles par projet

[Issue GitHub](https://github.com/Pierre-FABIEN/linkmusician/issues/72)

# Objectif

**Modéliser l'évolution d'un projet musical comme un graphe de capacités et de réalisations indépendantes, pas comme un tunnel chronologique.** Le projet peut composer 10 morceaux avant d'en enregistrer un, faire des concerts avant toute maquette, publier sans jouer sur scène, enregistrer seul, faire intervenir un professionnel sur plusieurs titres, ou être déjà actif depuis des années lors de son inscription.

Ce ticket **approfondit #71** (Carrière centrée sur le projet), conserve la direction UX **Metro** (#70), et **ne lance aucune implémentation**. On attend d'abord une spécification validée, puis un découpage de lots.

## 0. Principes fondamentaux à respecter

1. **Projet = point d'entrée du mode Carrière** (avec cas solo à clarifier). Un artiste peut gérer plusieurs projets et contribuer à ceux d'autrui.
2. Chaque projet comporte **plusieurs branches simultanées** : équipe, création/répertoire, production, scène, diffusion, développement/structuration.
3. **Aucun chemin imposé** : ce sont des possibilités et des suggestions, pas une liste bloquante.
4. Chaque morceau a son propre cycle de vie ; **le projet peut avoir N morceaux à des stades très différents**.
5. Une session/prestation peut concerner plusieurs titres ; la réalisation et sa preuve restent **attachées aux bons objets**, jamais propagées automatiquement.
6. **Un concert n'exige ni maquette ni enregistrement ni sortie.** Un projet orienté reprises et scène doit pouvoir progresser pleinement.
7. **Prérequis métier ≠ recommandation produit ≠ indépendance fonctionnelle**. Seuls les véritables prérequis conditionnent une opération.
8. **États opérationnels ≠ preuves ≠ progression personnelle/XP**. Un travail « terminé » ne devient pas automatiquement un fait corroboré ou vérifié.
9. Melokiva suggère l'étape suivante en fonction **des ambitions du projet et de son état réel**, sans spammer l'utilisateur ni lui imposer de collaborateur.
10. **Séparation Jam / Carrière** : aucune date de jam, disponibilité ou incitation Jam dans les vues et recommandations Carrière. Ne pas détruire les données historiques transversales pour autant.
11. Interface principalement composée de **tuiles Metro hiérarchiques et contextuelles**, informations limitées, styles distincts selon le contenu ; respecter D50/D55 ou documenter toute demande de révision.
12. **Pas de modèle Prisma Project/Task/Session inventé** avant audit des objets et services existants.

## 1. Modèle conceptuel à spécifier

\`\`\`text
Carrière personnelle
  ├── réseau Carrière / contacts / contributions / validations
  └── Projets que je possède ou auxquels je contribue
       └── Projet musical (groupe / solo : décision à prendre)
            ├── Équipe & collaborateurs
            ├── Création & répertoire
            │    ├── Morceau A → idée → maquette → enregistrer → mixer → ...
            │    ├── Morceau B → composition (peut rester à ce stade)
            │    └── Morceau C → master / sortie
            ├── Production & prestations
            │    └── Session/prestation X → Morceaux A, C, D (à étudier)
            ├── Scène
            │    └── Répertoire → candidatures/dates → concerts → tournée
            ├── Diffusion et promotion
            │    └── sorties → communication → audiences (suivant disponibilité réelle)
            └── Développement / accompagnement
                 └── manager, booker, organisation et structuration
\`\`\`

**À documenter explicitement :**
- distinction des objets \`Person/Actor\`, \`BAND\`, \`Work\`, \`WorkContributor\`, \`Collaboration\`, \`Milestone\`, \`WorkStep\`, structures/mandats/opportunités ;
- **propriété/gestion/membership/crédit/participation** sont des relations différentes ;
- droits propres au projet, au morceau, à une prestation et à un concert ;
- une réalisation collective peut contribuer à une carrière personnelle **uniquement** par la logique métier de preuve existante ;
- l'historique doit permettre de comprendre « qui a fait quoi, quand, avec quelle preuve » sans inventer des faits.

## 2. Branches et capacités (graphe, pas parcours unique)

| Branche | Capacités possibles | Évolutions indépendantes | Prérequis réels à confirmer |
| --- | --- | --- | --- |
| **Équipe** | projet solo, invitation, arrivée/départ de membres, collaboration ponctuelle, responsabilités | une équipe n'est pas obligatoire pour composer, jouer ou enregistrer seul | consentement, droits d'invitation et d'administration |
| **Création** | idée, composition, répertoire reprises/originaux, maquette, plusieurs morceaux | N compositions avant studio ; morceau solo ou collectif ; répertoire scénique sans œuvre originale | crédit confirmé pour *certaines preuves* de composition collective, pas pour créer une idée |
| **Production** | préproduction, prises, enregistrement maison/studio, mixage, mastering, production artistique | un titre produit avant les autres ; plusieurs titres pendant une session ; prestation externe facultative | accès au morceau, choix du responsable, confirmations propres aux prestations |
| **Scène** | formation live, répertoire, dates, candidatures, répétitions, concerts, tournée | concerts avant enregistrements ; reprises sans maquettes ; dates parallèles à la production | droits d'organisateur/candidature, concert effectivement joué et règles de vérification |
| **Diffusion** | identité publique, single/EP/album, distribution, communication, documents | sortie sans tournée ; promotion d'un live ; plusieurs sorties successives | droits sur œuvres/crédits et règles de vérification de sortie ; ne pas prétendre que la distribution est déjà implémentée |
| **Structuration** | manager/booker, réseau pro, mandat, accompagnement, organisation | demander du soutien avant ou après les concerts ; plusieurs collaborations | consentement explicite, permissions de structure, mandat borné, majorité selon action |

**Important :** « accessible comme possibilité » ne signifie pas « fonctionnalité livrée ». Documenter, pour chaque capacité, \`Disponible / Partiel / Futur\` en citant une route/service/test de \`main\`.

## 3. Matrice des dépendances : spécification centrale à produire

Pour chaque action/capacité, établir une ligne structurée avec :
\`id\`, \`scope\` (\`person/project/work/performance\`), \`trigger\`, \`requiresHard\`, \`recommendsSoft\`, \`unrelated\`, \`conditionsPermissions\`, \`canSkip\`, \`outcomes\`, \`evidencePolicy\`, \`nextCandidates\`, \`implementationStatus\`.

Exemples illustratifs à valider contre les règles existantes :

| Action | Hard dependency (exigence) | Soft recommendation (conseil) | Indépendant de |
| --- | --- | --- | --- |
| Inviter un musicien | droits de gestion, compte cible admissible, règles de consentement | un besoin instrumental | maquette, concert |
| Créer un morceau | droits sur le porteur du morceau | projet actif, nom/répertoire | groupe complet, studio |
| Ajouter une maquette | accès à la gestion du morceau et média valide | morceau identifiable | enregistrement professionnel |
| Enregistrer chez soi | droit de gérer / prendre l'étape, conditions du service ouvert | maquette de travail | ingénieur du son extérieur, scène |
| Faire appel à un ingénieur | contact/sollicitation autorisée, accord réciproque pour la prestation | titre(s) préparé(s), besoin identifié | concerts déjà joués |
| Jouer un concert | conditions d'événement/rôle et de validation existantes | répertoire et disponibilité des musiciens | tout enregistrement, sortie, producteur |
| Déclarer une sortie | règles de propriété/crédits et preuve adaptées au type de sortie | master disponible | concert |
| Confirmer une collaboration | participants et validations réelles requises | aucun | XP acquise ou rang affiché |

**Règle anti-faux blocage :** aucune relation de type « enregistré avant concert », « formation complète avant composition », « album avant manager » ne doit devenir un \`requiresHard\` sans fondement métier/juridique/documenté.

## 4. Production de plusieurs morceaux / sessions communes

Analyser précisément les situations suivantes :
- 8 morceaux créés, 6 démos, 0 enregistrement : préparer une session commune **sans dupliquer huit fiches de professionnel**.
- 4 morceaux enregistrés lors d'une même journée, 2 effectivement finalisés et 2 à reprendre.
- 1 ingénieur du son participant à plusieurs morceaux d'un même projet, éventuellement à des dates différentes.
- 1 morceau enregistré en plusieurs sessions et avec différents intervenants.
- enregistrement maison + complément de prises en studio ; nouvelles versions, nouvelles tentatives ;
- préproduction, mixage, mastering à des moments différents par titre.
- annulation/report d'une session : aucune réalisation ne doit être « gagnée » ni conservée à tort.

**À trancher :** nécessaire ou non d'un objet mutualisant les prestations/sessions ; si oui, étudier réutilisation de \`Collaboration\` / modèles actuels, cardinalités (1:N / N:N) et politiques de validation. Cela **ne fait pas partie du MVP de ce ticket** et ne doit pas entraîner une migration anticipée.

## 5. Scène sans studio : parcours complet autonome

Le projet peut déclarer une orientation live, définir son répertoire (reprises/compositions), proposer sa formation sur scène, découvrir des dates/plateaux et jouer des concerts **sans Work enregistré ni master publié**.

À préciser :
- répertoire scénique et liste de morceaux enregistrés **ne sont pas le même objet métier** ; vérifier si le modèle actuel permet de décrire reprises et setlists sans tromper les crédits ;
- concert annoncé, candidature, concert accepté, joué, corroboré, vérifié sont des états distincts ;
- un projet de reprises ne doit pas afficher en permanence « enregistrer une maquette » comme tâche bloquante ;
- le caractère « premier concert » est une réalisation historique ; les concerts suivants doivent continuer à être utilisables ;
- tournée : uniquement selon critères factuels documentés, pas sur simple déclaration.

## 6. Orientation du projet et suggestions

**Distinguer \`Person.ambition\` (existe) de l'orientation collective du projet** (à étudier, non existante par défaut). Un artiste peut vouloir devenir pro alors que son groupe de reprises vise uniquement la scène.

Proposition de préférences **multiples, modifiables, non bloquantes** :
- composer et développer un répertoire ;
- se produire régulièrement en concert ;
- enregistrer et publier ;
- recruter/former une équipe ;
- développer une activité professionnelle.

Une orientation doit simplement influencer l'ordre des suggestions et pouvoir être ignorée ; pas de malus, perte d'XP ou suppression de capacité.

### Moteur de recommandations déterministe (cible)

**Entrées** : projet courant, branche/objectif, rôles et permissions de l'utilisateur, morceaux et états, réalisations prouvées, demandes en attente, réseau pro visible, besoins ouverts et travaux engagés.

**Sortie** : liste bornée de candidates typées, ordonnées ; chacune explique \`why\`, \`where\`, \`actionHref\`, \`priority\`, \`dismissal\` et \`scope\`, sans exposer de données privées.

Priorités proposées :
1. action qui attend réellement une décision de l'utilisateur ;
2. poursuivre un travail déjà commencé ;
3. avancer vers les ambitions choisies pour CE projet ;
4. opportunité contextuelle réellement pertinente ;
5. exploration facultative d'une nouvelle branche.

**Contraintes** :
- suggestions autorisées uniquement après filtre serveur permissions/visibilité/blocage ;
- ne jamais présenter une recommandation comme une obligation ;
- « plus tard » ou « pas pertinent » ne supprime pas la capacité et ne réapparaît pas immédiatement ;
- ne pas transformer une simple absence de données en défaut culpabilisant ;
- éviter le « prochain morceau à enregistrer » si l'utilisateur développe actuellement la scène ;
- pas de service IA requis, pas de scoring à base d'XP, pas de sollicitation automatique de professionnels ;
- règles pures TS testables + projection serveur + composants de présentation Svelte, **sans logique de permission en front**.

## 7. États, preuves et progression : trois dimensions

**État opérationnel suggéré :** \`UNEXPLORED\`, \`PLANNED\`, \`IN_PROGRESS\`, \`WAITING\`, \`DONE\`, \`NOT_RELEVANT\` (proposition conceptuelle ; ne pas substituer cet enum aux statuts existants \`TODO/IN_PROGRESS/DONE\` sans analyse).

**Niveau de preuve :** auto-déclaré / corroboré / vérifié, selon les modèles et règles existants.

**Progression et reconnaissance :** XP, paliers et célébrations sont calculés **uniquement à partir des faits métier admissibles** ; une tâche \`DONE\`, un projet créé ou un contact trouvé ne sont pas automatiquement des preuves.

Ne pas inventer des réalisations « concert vérifié », « studio confirmé », « sortie distribuée » sur une simple opération UI.

## 8. UX cible : mosaïque Metro à information progressive

### Accueil Carrière (niveau personnel)
- entrée **Mes projets** prioritaire ; création guidée si aucun projet ;
- tuiles projets distinctes (nom, état utile, action contextuelle) ;
- réseau Carrière, contributions externes, demandes professionnelles, parcours personnel en secondaire ;
- **aucune fonction Jam** (agenda Jam, J'y étais, disponibilités, carnet, coups de pouce Jam) ;
- garder les outils métiers des ingénieurs, producteurs, managers, bookers, organisateurs dans leurs propres contextes sans les écraser.

### Dans un projet
- **Tuile dominante : une action suggérée pertinente** (et possibilité de choisir autre chose) ;
- tuiles de branches : Équipe, Création, Production, Scène, Diffusion, Développement ;
- indicateur d'avancement **factuel**, pas « 35 % de carrière » arbitraire ;
- détails via navigation dédiée ; une tuile = une intention principale ;
- ne pas afficher toute la roadmap à chaque visite ;
- « à faire / en cours / en attente / réalisé / non pertinent » sans confondre preuve ;
- projets multiples : sélection stable et retour cohérent ;
- mobile 360px, clavier, lecteurs d'écran, contrastes, modes clair/sombre, \`prefers-reduced-motion\`.

**Attention D50/D55 :** respecter page-menu et composants \`Tile\`, \`MetroHome\`, \`TileFrame\` tant qu'aucune décision n'autorise une transformation en dashboard complexe. Catalogue des tuiles Jam #70 = référence de *principes*, pas une dépendance permettant de réutiliser aveuglément les données Jam.

## 9. Audit du code actuel : points d'ancrage et écarts connus

- \`src/routes/(app)/espace/+page.svelte\` et \`+page.server.ts\` : accueil Carrière personnalisé et navigation métier, mais non encore centré sur les projets.
- \`src/lib/career/ambition.ts\` : ambition **personnelle** uniquement.
- \`src/lib/server/career/map.ts\` : carte des **faits personnels** ; certains actes utilisent des données Jam → **ne pas afficher comme axe de projet**.
- \`src/lib/server/works/service.ts\` : \`Work\` porté par une personne ou un groupe ; crédits et preuves ; déjà applicable à plusieurs morceaux.
- \`src/lib/server/works/journey.ts\` : récap de production pour **un morceau**, pas un graphe multi-branches du projet.
- \`src/lib/works/steps.ts\` : prise en charge autonome **ouverte seulement pour RECORDING** (\`OPEN_WORK_STEP_KINDS\`), autres étapes prévues mais **non disponibles sous ce même mécanisme**.
- \`src/lib/server/career/nudges.ts\` : coups de pouce existants basés sur réseau, besoins de morceaux et **jams à venir** → filtrer/séparer pour la cible « carrière sans Jam ».
- \`docs/conception/08-carrieres-par-role.md\`, \`docs/conception/17-audit-capacites-services.md\` : statuts Disponible/Partiel/Futur ; un audit ancien n'est pas nécessairement l'état exact de \`main\`.
- #51–#54 : étapes autonomes, prise en charge, crédits et E2E déjà spécifiés/livrés partiellement. Ne pas créer de ticket concurrent sans analyse.

## 10. Scénarios exhaustifs de recette produit

| ID | Situation | Résultat attendu |
| --- | --- | --- |
| S01 | 10 compositions avant studio | 10 morceaux, projet cohérent, aucune étape « enregistrer » obligatoire |
| S02 | 20 concerts de reprises, zéro composition | Scène accessible, progression scénique, pas de fausse erreur « pas de maquette » |
| S03 | Auteur solo sans groupe constitué | Création/production possible, sans invitation obligatoire |
| S04 | Groupe mixte : 8 morceaux (2 sortis, 2 masterisés, 4 maquettes) | États individuels conservés ; synthèse exacte, sans pourcentage fictif |
| S05 | 4 morceaux dans une session studio | Une session peut partager intervenants, mais chaque titre a son résultat propre |
| S06 | 2 sessions pour un même morceau | Historique chronologique et validation non dupliquée |
| S07 | Studio maison puis prestation pro | Déclarations, preuves et crédits correctement distingués |
| S08 | Premier concert avant première composition | Aucun blocage artificiel ; parcours Scène reconnu |
| S09 | Sortie sans concert | Sortie reconnue selon sa preuve ; aucune dépendance Scène |
| S10 | Groupe existant avant inscription | Déclaration historique possible selon règles ; pas d'XP indu ni preuve inventée |
| S11 | Changement d'ambition / branche préférée | Suggestions réordonnées, faits conservés |
| S12 | Projet de reprises refuse le studio | Suggestion masquée/suspendue, branche Production accessible sur demande |
| S13 | Trois projets à des stades distincts | Aucune confusion de données, équipe ou priorité |
| S14 | Musicien contribue chez autrui | Contribution personnelle visible, pas de droit implicite de gestion |
| S15 | Départ d'un membre / mandat terminé | Droits réévalués sans effacer historiques légitimes |
| S16 | Invitation/refus/bloquage | Suggestion admissible seulement si droits et consentement |
| S17 | Projet veut réserver/contacter un pro | Aucune disponibilité inventée ni message envoyé sans accord |
| S18 | Compte mineur | Toutes règles de visibilité, contacts et prestations existantes préservées |
| S19 | Aucun objectif, aucun morceau | Proposition créer / explorer, sans fausse urgence ni écran vide |
| S20 | Deep link, mobile et connexion lente | Contexte projet maintenu, états de chargement lisibles, aucune action perdue |

**Pour chaque scénario :** identifier la capacité actuellement livrée, les écarts et les règles/écrans à préciser, puis tests unitaires et Playwright. Ne pas prétendre qu'un scénario futur est déjà testable de bout en bout.

## 11. Livrables de ce ticket — PAS de codage en première étape

- [ ] Inventaire \`main\` des entités, relations, routes, règles, permissions, services et tests déjà présents.
- [ ] Diagramme de domaine séparant Carrière personnelle / Projet / Work / Session / Concert / Preuve.
- [ ] **Graphe de capacités par branche**, avec chaque lien qualifié en \`hard/soft/independent\`.
- [ ] Matrice des statuts \`Disponible/Partiel/Futur\` et des véritables dépendances produit.
- [ ] Décision explicite **Projet = BAND ?**, y compris solo/multi-projet/contributions externes.
- [ ] Définition des **orientations de projet** et de leur droit de modification.
- [ ] Contrat de moteur de suggestions : entrées, sorties, règles, priorité, explications, opt-out, tests.
- [ ] Politique de tâches/états distincte des validations, preuves, crédits et XP.
- [ ] Étude multi-Work et sessions groupées (sans migration anticipée).
- [ ] Maquettes Metro accueil Carrière et vue projet : solo, groupe, reprises, multi-morceaux, multi-projets, en attente.
- [ ] Protocole de validation utilisateur : débutant, groupe actif, musicien live, artiste studio, organisateur/pro.
- [ ] Vérification de la **séparation Jam / Carrière** dans navigation, agenda, nudges et projections, sans altérer l'historique métier.
- [ ] Proposition de lots de réalisation indépendants (POC → pilote → extensions) et critères de recette.
- [ ] Toute révision de D50/D55 ou des règles de progression explicitement présentée en décision, jamais imposée en silence.

## 12. Hors périmètre

- Ne pas implémenter immédiatement un moteur de règles, un nouveau modèle DB, un scheduler, des statuts génériques ou un workflow engine.
- Ne pas imposer un chemin unique « équipe → maquette → studio → concert ».
- Ne pas coder la réservation multi-titres, la distribution ou des fonctions label/édition encore futures comme si elles étaient livrées.
- Ne pas afficher des données Jam dans le mode Carrière, ni effacer des événements historiques légitimes pour satisfaire cet objectif d'interface.
- Ne pas mélanger ordre visuel des tuiles avec règles de preuve, XP ou autorisation.
- Ne pas dupliquer le socle groupes/morceaux/collaborations pour créer de nouvelles « fiches projet » concurrentes.

## 13. Définition de terminé du cadrage

Le cadrage est prêt lorsqu'un agent peut, **sans inventer de règles**, expliquer pour les 20 scénarios :
1. quel objet est concerné ;
2. ce qui est déjà faisable sur \`main\` ;
3. les véritables prérequis et permissions ;
4. les chemins alternatifs possibles ;
5. la prochaine action suggérable et sa justification ;
6. son niveau de preuve, le cas échéant ;
7. l'endroit précis où son état apparaît en **tuile Metro** ;
8. ce qu'il reste à développer et dans quel lot.

**Références :** #71 (vision projet Carrière), #70 (système de tuiles Metro), #30/#41 (espaces métiers), #51–#54 (production autonome). Mode Jam #59/#60–#66 **distinct**.

**Résultat attendu :** un graphe de possibilités musicales réalistes, composable et testable, qui permet de faire avancer le projet dans plusieurs directions simultanément sans surcharger l'interface ni compromettre les preuves métier.

---

## #73 — [MELO-EPIC] Rencontre & Collab — agenda culturel, annuaire et revendication

[Issue GitHub](https://github.com/Pierre-FABIEN/linkmusician/issues/73)

## Plan consolidé — 18/11/2026

Le [plan G0–G6 publié sur `main`](https://github.com/Pierre-FABIEN/linkmusician/blob/main/docs/plan/audit-structurel-roadmap-2026-11-18.md) devient le point d'entrée transversal des travaux nouveaux. Priorité : **G0 audit/choix du domaine (#84 → #83)**, puis UX Rencontre/Collab (#74–#76), cœur Collab et agenda culturel (#77, #38, #46), import/revendication (#78–#81), recette Toulouse (#82/#50). Le périmètre #79 **doit auditer et étendre `VenueClaim` existant**, pas concevoir une seconde revendication indépendante. Aucun renommage de routes/enums, aucune migration sans arbitrage explicite.

---

## Vision validée — Melokiva (18/11/2026)
**Rencontre** = découvrir, participer et développer son réseau musical. **Collab** = créer, travailler ensemble et faire avancer des projets. Les deux univers restent accessibles à tous les métiers ; les jams participatives sont distinctes des événements culturels.

## Issues de réalisation
- [ ] #74 — Accueil : Rencontre / Collab (P0)
- [ ] #75 — Clarifier les neuf métiers et les contenus selon le rôle (P0)
- [ ] #76 — Rencontre : Jams, Agenda culturel, Communauté (P0)
- [ ] #77 — Agenda culturel généraliste et événementiel des structures (P1)
- [ ] #78 — Annuaire prérempli : collecte légale, provenance et déduplication (P1)
- [ ] #79 — Revendication sécurisée des structures (P1)
- [ ] #80 — Administration, autorisations et programmation (P1)
- [ ] #81 — Synchronisation des événements partenaires (P2)
- [ ] #82 — Pilote Toulouse et recette UX/sécurité (P2)

*P0/P1/P2 = ordre recommandé, non des labels GitHub.*

## Contraintes transverses
Auditer l'existant, préserver les routes et données historiques, les permissions et la gamification Jam ; ne pas accorder d'administration par simple import. Réutiliser Organization, lieux, écrans et systèmes de droits plutôt que créer des doublons. Sources autorisées, licences, attribution, RGPD, modération, mécanismes de correction, suppression et anti-usurpation.

## Dépendances et références
#30 #32 #38 #46 #50 #60 #70 #71 #72. Les tickets documentent le travail ; aucune modification applicative n'est impliquée par leur création.

---

## #74 — [MELO-01] Accueil : remplacer Jam / Carrière par Rencontre / Collab

[Issue GitHub](https://github.com/Pierre-FABIEN/linkmusician/issues/74)

## Objectif
Objectif : sur l'interface, Rencontre (« Découvrir & partager ») et Collab (« Créer & développer ») doivent décrire deux intentions, pas des catégories de personnes. Le choix reste libre et réversible pour tous les métiers.

## Travail 1
Auditer /jouer, les introductions des modes, l'aide, le shell et les tuiles Metro. Adapter titres, sous-titres et CTAs ; communiquer que Collab inclut amateurs et professionnels non instrumentistes ; conserver les mécaniques spécialisées derrière les libellés.

## Travail 2
Ne pas renommer automatiquement enums, préférences, URLs ou bases de données ; préserver les routes et migrations éventuelles séparées.

## Critères / liens
Acceptation : parcours compris par débutant, musicien, manager et ingé son ; mobile 320/390 px, clavier, a11y et E2E sans régression. Liens #60 #70 #71 #72.

---

## #76 — [MELO-03] Rencontre : séparer Jams, Agenda culturel et Communauté

[Issue GitHub](https://github.com/Pierre-FABIEN/linkmusician/issues/76)

## Objectif
Objectif : une jam = activité participative avec présence et appréciations ; un concert ou atelier = événement culturel non assimilé à une jam.

## Travail 1
Auditer /jam, /jam/agenda, /jams, /lieux et Découvrir. Proposer trois entrées Rencontre : Jams, Agenda, Communauté ; distinguer les cartes, CTAs et fiches. Une jam publique peut figurer dans une vue agenda transversale, mais conserve sa logique et son cycle de vie.

## Critères / liens
Acceptation : trouver une jam pour jouer versus un concert pour assister est évident ; aucune XP/appreciation d'une simple présence à un concert ; règles mineurs et modération Jam préservées, E2E/a11y/mobile. Liens #38 #60 #61 #62 #70.

---

## #77 — [MELO-04] Agenda culturel généraliste : modèle, recherche et événements des structures

[Issue GitHub](https://github.com/Pierre-FABIEN/linkmusician/issues/77)

## Objectif
Objectif : concerts, festivals, showcases, ateliers, masterclass, auditions, tremplins, rencontres pro, conférences ; rattachement à lieux, artistes et organisations.

## Travail 1
Auditer et réutiliser les domaines Event/GIG/plateaux/JamSeries/VenueProfile avant toute extension additive ; définir types, dates/fuseaux, lieux, organisateur, participants, source, visibilité, statut, annulation, liens officiels ; vues agenda chronologique et filtres.

## Travail 2
Prévoir création et édition autorisées par structure, modération et signalement, liens de réservation externes. Les jams peuvent être projetées dans l'agenda sans fusion de cycle de vie.

## Critères / liens
Acceptation : publication/édition/annulation, critères d'autorisation serveur, événements multi-structures, déduplication, a11y et tests unitaires/integration/E2E. Liens #38 #46.

---

## #78 — [MELO-05] Annuaire musical prérempli : sources autorisées, provenance et déduplication

[Issue GitHub](https://github.com/Pierre-FABIEN/linkmusician/issues/78)

## Objectif
Objectif : fiches publiques non revendiquées de studios, salles, écoles, associations, festivals et autres acteurs, en commençant par Toulouse.

## Travail 1
Étudier les sources OSM (ODbL), Sirene, données locales, flux OpenAgenda et partenaires ; vérifier par source droit de réutilisation, attribution, restrictions, minimisation RGPD, correction/retrait. Pas de scraping massif Google Maps ni d'images/textes protégés sans autorisation.

## Travail 2
Pipeline idempotent import -> validation -> rapprochement -> publication -> actualisation ; stocker identifiant externe, source, licence, date, confiance et provenance par champ. Dédupliquer noms/adresses/coordonnées ; distinguer établissement physique et organisation juridique ; réutiliser Organization et lieux existants.

## Critères / liens
Afficher « fiche issue de données publiques, non revendiquée », sources et possibilité de corriger/signaler. Objectif pilote 100–200 fiches pertinentes (à valider). Acceptation : aucun droit admin par import, aucun doublon au rejeu, audit licence/RGPD et tests d'obsolescence. Liens #32 #38 #46.

---

## #79 — [MELO-06] Revendication sécurisée des fiches de structures

[Issue GitHub](https://github.com/Pierre-FABIEN/linkmusician/issues/79)

## Objectif
Objectif : une personne habilitée peut demander à administrer une fiche sans qu'un tiers puisse détourner le contrôle.

## Travail 1
Cycle : compte authentifié -> demande -> preuves -> revue -> approbation/refus -> droits distincts -> recours/révocation. Preuves combinées : contrôle domaine, email pro, représentant confirmé, vérification indépendante, justificatifs sous rétention minimale. SIRET public, email seul ou domaine seul ne prouvent pas le mandat.

## Travail 2
En cas de demandes concurrentes, d'admins déjà présents ou de litige : arbitrage humain, aucun transfert automatique. Rate limits, jetons courts à usage unique, CSRF, anti-énumération, audit, permissions serveur, stockage protégé, idempotence et transaction.

## Critères / liens
Acceptation : tests anti-usurpation et concurrence, aucune suppression silencieuse des administrateurs existants, contestation/recours, RGPD. Dépend MELO-05 ; liens #32 #30.

---

## #80 — [MELO-07] Administration des structures revendiquées et programmation d'événements

[Issue GitHub](https://github.com/Pierre-FABIEN/linkmusician/issues/80)

## Objectif
Objectif : après vérification du mandat, donner des droits granulaires sur une fiche, ses équipes et son agenda culturel.

## Travail 1
Auditer Organization et permissions #32, les écrans organisateur #46 ; distinguer propriétaire/admin/éditeur événement, invitation/révocation, structure et lieu. Permettre modifications sourcées de fiche, liens, publication et annulation d'événements, rattachements d'artistes consentis, historique et modération.

## Critères / liens
Acceptation : aucune édition par tiers, droits vérifiés serveur, provenance des champs importés conservée, audit et tests E2E multi-structures. Dépend MELO-04, MELO-06 ; liens #32 #38 #46.

---

## #81 — [MELO-08] Importer et synchroniser des agendas partenaires autorisés

[Issue GitHub](https://github.com/Pierre-FABIEN/linkmusician/issues/81)

## Objectif
Objectif : alimenter l'agenda avant inscriptions via flux OpenAgenda et partenaires locaux légalement exploitables.

## Travail 1
Pour chaque source : licence, attribution, champs et droit de reproduction explicités ; pas d'import d'images ou descriptions sous droits incompatibles. Flux incrémentaux avec source ID, déduplication, dates et fuseaux, synchronisation de corrections/annulations/suppressions, backoff et observabilité.

## Travail 2
Distinguer événement importé non confirmé et publié par organisateur ; arbitrer conflits entre données importées et corrections du propriétaire vérifié.

## Critères / liens
Acceptation : rejeu sans doublon, annulation reflétée, sources/attribution visibles, aucun droit admin par import, tests de panne API. Dépend MELO-04/05 ; liens #38 #46.

---

## #82 — [MELO-09] Pilote Toulouse et recette UX/sécurité multirôle

[Issue GitHub](https://github.com/Pierre-FABIEN/linkmusician/issues/82)

## Objectif
Tester la compréhension Rencontre/Collab avec musicien amateur, ingé son, producteur, manager, communication et organisateur ; observer Jam versus événement culturel, et la pertinence des fiches lieux.

## Travail 1
Recette : recherche agenda, rôles multiples, profil importé sourcé, revendication autorisée/refusée, demandes concurrentes, SIRET connu, email frauduleux, transferts, droits de publication, données obsolètes et annulations.

## Travail 2
Critères de sortie : retours qualitatifs documentés (au moins 5 profils), RGPD/licences validés, tests E2E mobile/desktop, accessibilité, aucun XP indu ; décider go/no-go avant déploiement géographique.

## Critères / liens
Dépend des MELO-01 à MELO-08 ; liens #50 #60 #71.

---

## #83 — [COLLAB · MODÈLE MÉTIER] Groupe, projets multiples et chaîne de collaborations musicales

[Issue GitHub](https://github.com/Pierre-FABIEN/linkmusician/issues/83)

## État de l'audit statique — 18/11/2026

[Document d'audit et plan d'exécution](https://github.com/Pierre-FABIEN/linkmusician/blob/main/docs/plan/audit-structurel-roadmap-2026-11-18.md). Confirmé : `Organization(BAND)` et `Membership` existent, `Work` peut appartenir à une personne ou un groupe, les collaborations confirmées sont des actes entre participants, `WorkStep`/SELF est livré. **Aucun modèle `Project` autonome identifié**, mais cette observation ne démontre pas à elle seule qu'une nouvelle entité est indispensable. Décider d'abord les cardinalités et capacités manquantes via #84. Conserver les droits, crédits et historiques existants.

---

## Contexte et objectif

Melokiva doit distinguer clairement **un groupe**, **un projet musical**, **une réalisation** et **une contribution**. Un groupe est un collectif durable qui peut porter plusieurs projets en parallèle ou successivement ; un projet réunit des acteurs de toute la chaîne musicale, sans se limiter aux instrumentistes. Un artiste solo, un producteur ou un organisateur doit aussi pouvoir porter des projets **sans créer artificiellement un groupe**.

Cette issue complète **#71** (UX centrée projets) et **#72** (parcours non linéaires). Elle formalise les **relations métier et autorisations** ; elle ne prescrit pas la création immédiate d'une table `Project`.

## Invariants métier à respecter

- **Groupe / collectif** : identité, membres, rôles et droits propres, continuité dans le temps ; un groupe peut porter 0..n projets.
- **Projet / initiative** : objectif situé (EP, album, tournée, concert, festival, campagne, production…) ; un projet peut être initié par une personne, un groupe ou une structure habilitée ; ne pas présumer qu'un projet exige un groupe.
- **Réalisation / livrable** : morceau, enregistrement, concert, clip, sortie, campagne… ; peut suivre son propre cycle de vie et être associé à plusieurs contextes selon des règles explicites.
- **Collaboration / contribution** : participation d'un acteur à un projet ou à une réalisation, dans un rôle et un périmètre définis ; être collaborateur **n'implique jamais** appartenir au groupe ni représenter l'organisation.
- **Organisation / structure** : studio, salle, association, label, organisateur, etc. ; peut proposer des prestations, porter ou participer à plusieurs projets ; conserver la séparation personne/organisation et les mandats explicites.
- Les réalisations et crédits **déclarés, confirmés ou vérifiés** gardent leurs niveaux de preuve ; ni XP, ni rang, ni autorisation dérivés automatiquement d'une simple déclaration ou d'une relation supposée.
- Permettre les contributions ponctuelles, les collaborations spontanées et les créations solo sans tunnel de configuration obligatoire.

## Scénarios fonctionnels de référence

1. Un groupe de funk porte **un EP et une tournée** simultanément, avec calendriers, intervenants et jalons distincts.
2. L'EP comporte **quatre morceaux** à des stades de production différents ; l'avancement de chaque morceau ne vaut pas celui du projet entier.
3. Un ingénieur du son mixe un morceau : crédit et livrable confirmables, sans devenir membre du groupe.
4. Un manager accompagne plusieurs artistes/projets ; ses permissions résultent de mandats, pas de son métier déclaré.
5. Un organisateur porte un festival avec plusieurs groupes ; les artistes programmés ne deviennent pas membres de sa structure.
6. Un artiste solo produit un single et sollicite un producteur, sans passer par « créer un groupe ».
7. Un même professionnel contribue à plusieurs projets et retrouve un historique de ses contributions sans se voir attribuer des projets qu'il ne gère pas.
8. Une campagne de promotion et un clip peuvent être des activités d'un projet de sortie ou des projets autonomes : la modélisation évite une hiérarchie artificiellement obligatoire.

## Analyse technique à mener avant toute implémentation

- Inventorier les modèles et API existants : `BAND`, `Organization`, `Work`, morceaux/campagnes, étapes, participations, crédits, collaborations, rôles, permissions et événements.
- Produire une matrice **entité → propriétaire/porteur → participants → droits → preuves → cycle de vie**.
- Étudier les cardinalités réelles et les liens entre groupe, projet, réalisations et intervenants. Évaluer la réutilisation des entités en place avant d'introduire `Project` ou une table pivot.
- Définir invitations/acceptations, retrait, départ du fondateur, transfert de responsabilité, conflit d'attribution, révocation et historique.
- Documenter les ambiguïtés (projet vs campagne existante, groupe solo, multi-portage, projet inter-organisations, livrable partagé).
- Prévoir une UX simple : **« Créer un projet »** en entrée principale de Collab, **« Créer un groupe »** comme action indépendante/facultative ; demander « Qu'as-tu envie de réaliser ? » plutôt qu'imposer un collectif.

## Critères d'acceptation

- [ ] Modèle conceptuel et règles de cardinalité documentés, cohérents avec les entités déjà présentes.
- [ ] Scénarios 1–8 couverts sans créer de groupe factice ni imposer des étapes linéaires.
- [ ] Membres de groupe, responsables de projet, contributeurs et prestataires distingués dans les permissions **côté serveur**.
- [ ] Liens et crédits avec preuve explicite ; pas d'élévation implicite de privilèges ni de double comptage des réalisations.
- [ ] Décision d'architecture argumentée : réutilisation/extension ou nouveau concept et plan de migration additive seulement si nécessaire.
- [ ] Plan de tests unitaires, intégration et E2E (multi-projet, multi-rôle, permissions, retraits, concurrence).
- [ ] Alignement UX avec **#71**, **#72**, **#74** (Rencontre/Collab) et l'epic **#73**.

> Ticket de **conception et cadrage** : ne pas modifier les modèles ou les données avant validation des décisions de domaine et des conséquences sur les parcours existants.

---

## #84 — [COLLAB · AUDIT STRUCTUREL] Cartographier les concepts, relations, responsabilités et angles morts

[Issue GitHub](https://github.com/Pierre-FABIEN/linkmusician/issues/84)

## Premier livrable de l'audit — 18/11/2026

[Analyse statique du dépôt et feuille de route réorganisée, commit `35d4f87`](https://github.com/Pierre-FABIEN/linkmusician/blob/main/docs/plan/audit-structurel-roadmap-2026-11-18.md).

**Constats contrôlés** : groupe via `Organization(BAND)` et adhésions, morceau solo ou groupe via `Work`, travaux/collaborations et crédits, étapes SELF déjà présentes, revendication `VenueClaim` existante. **À approfondir** : cartographie exhaustive service/permission/test, choix d'agrégat « projet », règles multi-organisations, scénarios exécutés, tests et décision d'architecture validée.

Le livrable est une **première analyse statique**, pas l'audit exhaustif ni une validation de migration. **L'issue reste ouverte.**
---

# Compte rendu — Analyse structurelle du domaine Collab

> **Nature : audit de conception à réaliser, pas une demande de refonte immédiate.**
> **Contexte :** discussions produit Melokiva du 18 novembre 2026. Complète [#83](https://github.com/Pierre-FABIEN/linkmusician/issues/83) (distinction groupe/projets/contributions), [#71](https://github.com/Pierre-FABIEN/linkmusician/issues/71) (UX projet central), [#72](https://github.com/Pierre-FABIEN/linkmusician/issues/72) (parcours non linéaire) et [#74](https://github.com/Pierre-FABIEN/linkmusician/issues/74) (Collab / Rencontre).

## 1. Pourquoi cet audit ?

La conception initiale semblait privilégier le scénario : **un musicien crée un groupe, puis compose, enregistre et joue sur scène**. Ce scénario existe, mais il ne couvre pas l'ensemble des activités de la filière musicale.

Notre analyse conceptuelle fait apparaître une organisation plus riche :
- Un **groupe** est un collectif avec identité, membres et gouvernance ; il peut porter plusieurs projets, simultanément ou successivement.
- Un **projet** est une initiative poursuivant un objectif (EP, concert, tournée, production, événement, promotion...) ; il peut exister sans groupe et mobiliser plusieurs personnes/structures.
- Une **réalisation** (morceau, enregistrement, concert, sortie, clip, etc.) possède son propre cycle de vie ; elle n'est pas identique au projet qui la porte.
- Une **contribution/collaboration** décrit une intervention dans un périmètre donné, sans adhésion implicite au groupe ni droit sur l'organisation.
- Une **structure** (studio, salle, label, association…) peut porter ou soutenir des projets ; son identité juridique, ses responsables et ses mandats restent distincts de la personne.
- Les parcours ne sont **ni uniques ni linéaires**. On peut enregistrer avant un concert, se produire avant une sortie, composer plusieurs œuvres en parallèle ou participer ponctuellement sans projet formalisé.

**Ces éléments sont des hypothèses de modélisation et des besoins produit à confronter au code et à des scénarios réels ; ne pas présenter les lacunes comme des bugs constatés sans vérification.**

## 2. La méthode d'analyse à appliquer à chaque concept

Pour **Groupe, Projet, Morceau/Œuvre/Enregistrement, Collaboration, Organisation, Concert/Événement et Parcours personnel** :

1. **Identité** : qu'est-ce que l'objet représente, et qu'est-ce qu'il ne représente pas ?
2. **Relations** : avec quelles entités interagit-il ? Cardinalités, liens facultatifs, multi-appartenance.
3. **Responsabilités** : qui crée, invite, valide, modifie, représente, révoque, transfère et archive ? Distinguer auteur, contributeur, membre, responsable et mandataire.
4. **Cycle de vie** : création, brouillon, activité, suspension, fin, suppression ; historique et preuve.
5. **Cas limites** : solo, collectifs informels, groupes séparés, fondateur parti, œuvres préexistantes, réalisations communes, prestataire intervenant sur plusieurs projets, deux organisations partenaires.
6. **Implémentation** : cartographier modèle Prisma, services, API, écrans, permissions, données, règles de progression et tests existants avant d'envisager une migration.

## 3. Angles morts à rechercher (questions, non conclusions)

- Un projet est-il implicitement contraint à être un `BAND` ? Peut-on entreprendre sans groupe ?
- Un groupe peut-il porter plusieurs projets indépendants ? Qui décide pour chacun ?
- Un morceau créé avant l'existence du groupe reste-t-il attaché à son auteur ? Distingue-t-on **œuvre/composition, enregistrement, interprétation, diffusion** et rattachement à un projet lorsque nécessaire ?
- Une contribution externe est-elle reconnue sans adhésion à l'équipe ? Un crédit est-il déclaré, confirmé, vérifié ? Qui peut le contester ?
- Peut-on rattacher plusieurs acteurs/structures à un projet sans créer de droits implicites ?
- Le départ d'un fondateur, la dissolution d'un groupe ou la révocation d'un mandat préservent-ils l'historique et les réalisations ?
- Le moteur de progression suggère-t-il des étapes pertinentes sans forcer un ordre unique ?
- Existe-t-il des objets redondants, des liens manquants ou des validations placées seulement dans l'interface ?

## 4. Livrables de l'audit (avant code)

- [ ] **Inventaire actuel** : tableau `concept → modèles Prisma → services/actions → écrans → permissions → tests`, références précises au dépôt et décisions documentées.
- [ ] **Carte relationnelle cible** : cardinalités, invariants, provenance, niveaux de preuve ; signaler les alternatives lorsque la décision n'est pas tranchée.
- [ ] **Matrice d'écarts** : « existe / partiel / absent / choix produit », sévérité, exemples reproductibles et impact.
- [ ] **Scénarios de validation** : (a) groupe avec EP + tournée ; (b) EP à 4 morceaux aux stades différents ; (c) mixage par prestataire externe ; (d) artiste solo ; (e) festival multi-groupes ; (f) manager multi-artistes ; (g) morceau composé avant le groupe ; (h) départ du fondateur ; (i) contribution croisée.
- [ ] **Décisions d'architecture motivées** : réutiliser les objets `BAND`, `Work`, `Organization`, campagnes/collaborations et permissions lorsque possible ; ne créer `Project` ou de nouveaux liens qu'après preuve de nécessité. En cas de changement : migration additive, compatibilité et stratégie de reprise.
- [ ] **Découpage en tickets d'exécution** uniquement après validation des décisions, avec critères d'acceptation, tests unitaires/intégration/E2E et risques de sécurité.

## 5. Principes UX et métier

- « **Créer un projet** » et « **Créer un groupe** » sont deux intentions différentes. Le groupe est facultatif pour lancer une initiative ; son rôle ne doit pas être minimisé lorsqu'il existe.
- L'application peut avoir un modèle de domaine riche, mais l'utilisateur doit pouvoir **créer un morceau ou collaborer sans remplir un tunnel administratif**.
- Suggestions d'intervenants contextuelles et facultatives, fondées sur les besoins réels, sans contacts automatiques.
- Pas de confusion entre possession, droits d'auteur, crédits artistiques, membres d'un groupe, contributeurs externes et permissions applicatives.
- Éviter les hiérarchies rigides artificielles : préférer des relations explicites, un cycle de vie propre à chaque réalisation et des validations côté serveur.
- Protéger la traçabilité, les règles d'autorisation, le consentement des participants et la non-régression.

## 6. Ce que ce ticket ne décide PAS

- Il **n'impose pas** un nouveau modèle `Project`, une base graphe ni une refonte des routes.
- Il **ne tranche pas** la propriété juridique des œuvres ni le partage des droits.
- Il **n'invalide pas** les parcours et services déjà livrés : chaque écart doit être démontré.
- Il **ne duplique pas #83** : #83 porte la modélisation fonctionnelle Groupe/Projet/Collaboration ; **ce ticket porte l'audit transversal, la méthode de comparaison actuel/cible et la découverte systématique des angles morts**.

## 7. Critère de clôture

La phase d'audit est terminée lorsque la cartographie de l'existant, les décisions ouvertes, les scénarios et une proposition priorisée de corrections sont publiés et vérifiables. **Ne pas fermer au simple dépôt d'une proposition non confrontée au code.**

**Priorité proposée :** cadrage avant implémentation des évolutions structurelles de Collab.

---

## #undefined — [MELO-02] Clarification des 9 métiers et contenus contextualisés par rôle

[Issue GitHub](https://github.com/Pierre-FABIEN/linkmusician/issues/undefined)

## Objectif
Objectif : clarifier les rôles à un public non expert et personnaliser les explications Rencontre/Collab sans filtrer l'accès.

## Travail 1
Auditer les descriptions du référentiel des neuf métiers et l'onboarding. Désambiguïser producteur/ingé son, manager/booker/programmateur/organisateur, éditeur/label et communication. Expliquer le cumul des rôles et les intentions Je propose/Je recherche.

## Travail 2
Dans Rencontre un manager voit par exemple les artistes, lieux et événements ; dans Collab ses projets/accompagnements. Ne promettre que les capacités réellement livrées, afficher bientôt sinon.

## Critères / liens
Acceptation : tests qualitatifs sur cinq personas, navigation multirôle, a11y, aucune permission implicite par sélection du métier. Liens #14 #15 #29 #31.
