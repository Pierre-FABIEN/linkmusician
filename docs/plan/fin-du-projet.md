# Finir LinkMusician

> Rédigé le 11/11/2026. **Seul document de route** jusqu'à la fin du
> projet : ce qui reste, dans l'ordre, avec la fiche de chaque lot.
> L'état d'avancement vit dans le tableau §5 de [README.md](./README.md) ;
> les questions laissées pour plus tard dans [a-trancher.md](./a-trancher.md).
>
> Les fiches des lots terminés (phases 0 à 4, P5-01 à P5-03a), les revues
> de phase et les anciens prompts ont été retirés de `docs/plan/` le
> 11/11/2026. Ils restent dans l'historique git (commit `2e1cb24` et
> avant) ; le code et `docs/conception/` disent ce qui a été construit.

## 1. Où on en est

**95 lots terminés sur 113** (84 %) ; **≈ 90 % du périmètre du
lancement**. Phases 0 à 2 complètes, phase 3 complète sauf l'ouverture,
phase 4 complète pour le lancement, phase 5 commencée (P5-01, P5-02,
P5-03a, P5-03b, P5-03d, P5-04a, P5-04b, P5-05a, P5-05b, P5-06, P5-07, P5-08). La phase 6 vient après le lancement.

| Étape                              | Lots                                                          | Quand                     |
| ---------------------------------- | ------------------------------------------------------------- | ------------------------- |
| A. Finir la scène                  | P5-11                                                         | Nov. → déc. 2026          |
| B. Revue de phase 5 et revue UX    | Revue de fin de phase, Metro (MET-01 à 07), suite e2e (P0-01) | Déc. 2026 → janv. 2027    |
| C. Audit de sécurité (bloquant)    | P3-10a                                                        | Janv. → fév. 2027         |
| D. Ouverture publique à Toulouse   | P3-10                                                         | Objectif début mars 2027  |
| E. Après le lancement              | P5-00, P5-09, P5-10, P5-03c, P4-08, P4-11, P4-12              | Après 3 mois d'usage réel |
| F. Phase 6 : sortie, développement | P6-01 à P6-07                                                 | Selon les indicateurs     |

On a de l'avance sur la feuille de route (D28, février pour la phase 5) :
le temps gagné va à la revue UX et à l'audit, **pas** à de nouveaux lots.

**Méthode inchangée** (CLAUDE.md, [README §3-4](./README.md)) : une
session = un lot, sur `main`, commits préfixés par l'ID ; définition de
terminé ; une question ouverte prend un défaut et une ligne dans
`a-trancher.md`, sans bloquer.

## 2. Étape A — Finir la scène (lancement)

Repérage technique de chaque lot (modèle à copier, schéma, pièges) :
[preparation-phase-5.md](./preparation-phase-5.md). Ordre conseillé : les
concerts s'appuient sur l'organisateur et le lieu, les jams publiques
sur l'organisation du lieu.

### P5-05 — Organisateur·rice ✅ (découpé)

**P5-05a ✅** (11/11/2026) : piste `PROMOTER` ouverte, profil
(`/profil/organisateur`), plateaux `GIG_SLOT` publiés dans un lieu validé
avec conditions (rang de groupe, genre, zone ; **jamais l'XP**),
candidature au nom d'un groupe, recherche `?metier=organisateur`, carte
publique, objectifs, rang lu dans `gig.held`, RGPD, e2e.

**P5-05b ✅** (11/11/2026) : organisation `PROMOTER` (`/organisations`)
gérée à plusieurs, vérifiable (SIRET, P5-02), plateaux publiés en son nom,
page publique `/@handle`. Festivals : jams « off » publiées comme des jams ;
stages et masterclasses avec les écoles (P5-11). Voir
[docs/scene](../scene/README.md).

### P5-03b — Lieux : fiche, agenda et rang ✅ (découpé)

**P5-03b ✅** (11/11/2026) : `VenueProfile`, `/lieux/[id]/gerer` (fiche,
publication, dates publiées au nom du lieu, quêtes et « apprendre le
métier », vérification, co-gestion), page `/lieux/[id]` enrichie (fiche,
dates à venir, rang), rang lu dans les faits, notification de la décision
de revendication (Q29). Voir [docs/jam](../jam/README.md#fiche-du-lieu-p5-03b).

### P5-03d — Lieux : photos ✅

**P5-03d ✅** (11/11/2026) : photos de la fiche du lieu (8 au plus),
portées par son organisation, envoyées et retirées par sa gestion ;
galerie sur `/lieux/[id]`.

### P5-06 — Concerts vérifiés ✅

**P5-06 ✅** (11/11/2026) : collaboration `GIG` entre le groupe et l'hôte
(lieu ou organisation), « Premier concert » vérifié par un hôte vérifié
(corroboré sinon), « Première tournée » (≥3 concerts vérifiés, ≥3
communes, 30 jours), `gig.held` (organisateur·rice et rang du lieu). Voir
[docs/etapes](../etapes/README.md#concerts-et-tournée-vérifiés-p5-06).

### P5-04 — Jams publiques des lieux (découpé)

**P5-04a ✅** (11/11/2026) : scène ouverte **récurrente** publiée par la
gestion du lieu (`JamSeries`, `/lieux/[id]/gerer/scene-ouverte`), jams des
4 semaines à venir créées par le job quotidien, toute la gestion du lieu
hôte, « Tous les jeudis » dans le mode jam ; « jam publique tenue » au 3ᵉ
« J'y étais » (`jam.held`, 50 × confiance pour qui l'a publiée, une date
pour le rang du lieu ; rien pour les présent·es, D27) ; mineur·es : lieu
`ADULTS` caché ; `lieux.spec.ts` corrigé (Q30) ; e2e « je trouve la scène
ouverte du jeudi dans le mode jam ». Voir [docs/jam](../jam/README.md).

**P5-04b ✅** (12/11/2026) : animateur·rices affilié·es au lieu
(`VenueHost` : la gestion invite une personne D51, elle accepte dans « Mes
jams », notification `VENUE_HOST_INVITE`) ; page « Qui anime »
(`/lieux/[id]/gerer/animation`) avec suggestions à moins de 30 km, triées
par appréciations reçues puis jams animées, jamais l'XP, sans mineur·e ni
personne bloquée ; lead par défaut d'une série (`JamSeries.leadId`),
copié sur les jams à venir et suivantes ; RGPD ; e2e « le lieu invite une
animatrice suggérée, elle devient lead du prochain jeudi ». Q45 à Q47.

### P5-08 — Carte : acte V ✅

**P5-08 ✅** (12/11/2026) : acte V « La scène » jouable, épreuve lue dans
les faits (« Premier concert » vérifié par un hôte vérifié, d'un groupe
dont on était membre à la date ; un concert corroboré ne suffit pas) ;
la tournée vérifiée en épreuve de plus, affichée, jamais bloquante ;
appel « Candidater à un plateau » ; carte souvenir du concert (groupe,
hôte, mois) ; radar des pros « bientôt » (P4-11). e2e de l'acte V dans
`carriere.spec.ts`. Voir [docs/carriere](../carriere/README.md#carte-de-carrière-p3-13-d53).

### P5-07 — Booker et manager ✅

**P5-07 ✅** (12/11/2026) : pistes `MANAGER` et `BOOKER` ouvertes ;
accompagnement (`Representation`) proposé par l'agent, confirmé par
l'artiste ou la gestion du groupe (`management.confirmed` : 200 au
manager, rien au booker) ; **un accompagnement non confirmé ne rapporte
rien** (test d'intégration) ; « Booké par » sur un concert, parmi les
bookers confirmés (`gig.held`), tournée bookée (`tour.booked`, 400) ; rang
`agentTier` (artistes confirmés, groupes passés deux rangs) ; profil
léger, recherche, carte publique, objectifs, RGPD ; e2e `booker.spec.ts`.
Q48 à Q51. La part de 10 % reste reportée (Q21). Voir
[docs/scene](../scene/README.md#booker-et-manager-p5-07).

### P5-11 — Écoles, MJC, conservatoires (D29)

- **Dépend de** : P5-02 ✅, P2-14c ✅.
- **Tâches** : organisation `SCHOOL` ; un·e prof invite ses élèves (lien
  d'invitation) et publie des **ateliers jam** (lead = le prof) ; quête
  « De l'atelier à la scène » ; réputation des confirmé·es qui animent
  ou parrainent (_Passeur_) ; aucune liste d'élèves publique ; mineur·es
  (D5) inchangé ; parrainage des responsables d'école : non (Q23).
- **Fin** : e2e « la prof invite un élève, il rejoint l'atelier puis une
  jam publique » ; un·e mineur·e ne voit que les ateliers finis avant
  22 h (test).

## 3. Étape B — Revue de fin de phase 5 et revue UX

Une session de revue, puis des lots courts de corrections si besoin
(`UX-01`, `UX-02`…), un par parcours.

- **Direction visuelle Metro dans toute l'app (D55)** : lots `MET-01`
  (socle) à `MET-07`, par parcours, dans l'ordre MET-01, MET-02, MET-07,
  MET-03, MET-04, MET-05, MET-06. Règles, correspondance, méthode et
  liste de contrôle par page : [docs/design](../design/README.md). La
  revue UX par rôle se fait sur les écrans **migrés**.

- **Revue de phase** : critères de fin vérifiés ; calibrage des
  personas de la scène relu sur les vrais écrans ; questions Q18 à Q30 de
  [a-trancher.md](./a-trancher.md) passées en revue avec l'utilisateur.
- **Revue UX, mobile d'abord**, un parcours par rôle : musicien·ne
  (jam et carrière), groupe, ingé son, studio, producteur·rice, lieu,
  organisateur·rice, booker et manager, école. Vérifier la navigation en
  menus (D50) et le fil d'Ariane (D52).
- **Avant l'ouverture** (repris des points ouverts) :
  - **P0-01** : faire passer la **suite e2e complète** (interrompue par
    des échecs d'authentification ; `lieux.spec.ts`, Q30) ;
  - e2e « quota TL0 » instable dans `messagerie.spec.ts` (dépend de
    l'ordre des specs) ;
  - tests d'intégration lancés ensemble qui se gênent sur le schéma
    `e2e` (isoler les données ou `--no-file-parallelism`) ;
  - multiplicateur « ×0,1 » affiché le premier jour, quand tout le monde
    est TL0 : préinscrire les leads du réseau (D29) et les passer TL1, ou
    masquer le multiplicateur du libellé ;
  - vocabulaire du mode Carrière : « projet » plutôt que « groupe » dans
    les interfaces, sans renommer les modèles ;
  - relecture des 8 fiches `/demarches` par quelqu'un du métier (V1, V2).

## 4. Étape C — P3-10a Audit de sécurité avant production

- **Dépend de** : toute l'étape A. **Bloquant** pour P3-10 : aucune
  ouverture tant qu'un point reste ouvert.
- **Checklist** :
  1. Specs de sécurité du boilerplate au vert (`e2e/admin/security.spec.ts`,
     `users.spec.ts`, `exports.spec.ts`, `auth/gdpr-data.spec.ts`,
     remontée n° 18) : cause établie, corrigée ou remontée en amont.
  2. Lieux (D26) : aucune jam dans un lieu non validé ; lieux ajoutés par
     un compte récent invisibles jusqu'à confirmation.
  3. Mineur·es (D5) : chaque fonction (jams, formation du lead,
     invitations, suggestions, messagerie, appréciations, ateliers)
     respecte le couvre-feu de 22 h, la dispo invisible, la messagerie
     restreinte et l'absence de suggestion à des adultes inconnu·es ; un
     test par fonction.
  4. Limiteurs de débit : tous sur Redis (Upstash) en production ; test
     de charge (k6) sur les actions limitées.
  5. HTML injecté : chaque `{@html}` nettoyé ; aucun texte d'utilisateur
     rendu en HTML (test XSS).
  6. Service worker : aucune page connectée ni réponse privée en cache.
  7. Accès par identifiant : pour chaque route `[id]` et chaque action, un
     test avec l'identifiant d'un autre compte (non-membre, bloqué,
     mineur·e, contenu retiré).
  8. En-têtes (CSP, HSTS, cookies `Secure`, `HttpOnly`, `SameSite`),
     origine des actions, `npm audit` sans faille haute ou critique.
  9. Données qui ne sortent jamais : score de réputation, date de
     naissance, point de localisation, e-mail, SIRET d'une organisation ;
     test qui inspecte les réponses JSON de chaque page.
  10. Abus de jeu : collusion, faux présents à une jam, faux concerts
      (farmeur de dates, P5-01), rendements décroissants vérifiés.
  11. RGPD : export et anonymisation couvrent chaque donnée personnelle
      (relecture de bout en bout du schéma).
  12. Secrets et accès : variables de production, comptes admin avec
      double authentification, journal d'audit de la modération.
- **Outils** : `/security-review` sur tout le code ; pentest externe si
  le budget le permet.
- **Fin** : checklist cochée, consignée dans
  `docs/securite/audit-lancement.md` avec les preuves.

## 5. Étape D — P3-10 Ouverture publique (pas de bêta, D23)

- **Dépend de** : P3-10a et tout le reste.
- **Hors code, à lancer tôt** : nom de domaine et DNS (SPF, DKIM, DMARC,
  `SMTP_FROM` définitif) ; comptes de production (Vercel, Neon,
  Upstash, Cloudinary) ; revue juridique des pages légales ; feuille de
  route de la startup ([docs/lancement](../lancement/README.md)).
- **Tâches** : pages légales réécrites (CGU, confidentialité, registre
  RGPD, mentions) ; déploiement en production ; supervision et alertes
  (`alerting.ts`) ; sauvegardes ; page d'accueil publique ; tableau des
  indicateurs (P1-13) suivi chaque semaine.
- **Fin** : l'app est ouverte au public ; inscription, onboarding, jam,
  collaboration et profil public fonctionnent en production (smoke
  test) ; **bilan après 3 mois d'usage réel** sur les indicateurs
  (conception 05 §2).

## 6. Étape E — Après le lancement

Dans l'ordre où le pilote les rendra utiles.

### P5-00 — Validation juridique de la monétisation (D25)

- **Avant** P5-09 et P5-10 : faire valider par un juriste la commission
  sur prestations (présomption de salariat des artistes, GUSO, statut de
  la plateforme, CGV) ; choisir le partenaire de portage éventuel.

### P4-11 — Radar des pros

- **Dépend de** : P2-08 ✅.
- **Tâches** : flux « projets qui montent » (réputation, rangs, vitesse
  de franchissement) ; alertes par genre et zone ; jamais d'XP.
- **Fin** : un groupe qui franchit deux rangs en un mois remonte dans le
  flux (intégration).

### P5-09 — Offre pro

- **Dépend de** : P4-11, P5-00.
- **Tâches** : abonnements **lieux** (agenda, appels à groupes, jams
  publiques, aide licence et GUSO) et **pros** (Stripe) : recherche
  avancée, alertes, flux étendu ; **jamais** de visibilité organique, de
  place dans le mode jam ni d'XP achetée.
- **Fin** : aucun produit payant n'écrit dans le registre XP (test).

### P5-10 — Réservation de studio

- **Dépend de** : P4-03 ✅, P5-00.
- **Tâches** : agenda et réservation, paiement par Stripe Connect
  (commission) ; une réservation honorée **vérifie** l'étape « Première
  répétition » ; réservation honorée 100 pour le studio (02 §2.2).
- **Fin** : e2e « je réserve et paie un créneau » (Stripe en mode test).

### P5-03c — Lieux : gérant vérifié (niveau 2, D31)

- **Dépend de** : P5-03a ✅ ; réponse de la DINUM sur ProConnect.
- **Tâches** : identité comparée aux dirigeants (API Recherche
  d'entreprises, champ `dirigeants`), sinon documents en modération ;
  exigé pour les outils payants et pour contester une fiche (Q20).

### P4-08 — Vitrine des propositions

- **Dépend de** : P4-07 ✅ ; gratuité ou offre pro à trancher.
- **Tâches** : `WorkPitch` (morceau, ce qui est cherché, public visé,
  expiration) ; proposer et retirer (opt-in de l'équipe) ; vitrine
  filtrée par genre, zone, besoin, **jamais triée par XP** ; contact par
  la messagerie ; règles des mineur·es.
- **Fin** : un morceau retiré disparaît aussitôt ; ni XP ni confiance
  dans la vitrine (test) ; e2e « Nora découvre le morceau et propose une
  production ».

### P4-12 — Messagerie temps réel

- **Dépend de** : P2-04 ✅ ; D8.
- **Tâches** : Ably ou Pusher à la place du polling ; présence ; repli
  sur le polling si le service tombe (`circuit-breaker.ts`).
- **Fin** : un message arrive en moins d'une seconde ; le repli marche.

## 7. Étape F — Phase 6 : sortie et développement (actes VI à VIII)

**But** : sorties vérifiées et accompagnées, labels et éditeurs, défis
collectifs, carrière complète. Chaque métier ouvert suit la liste de
08 §16 (référentiel pur, organisation et vérification, règles d'XP
calibrées par personas, rangs, quêtes, carte, `available: true`, RGPD,
e2e du parcours).

### P6-01 — Personas et barème de la sortie

- **Tâches** : personas (label indépendant, éditeur, attachée de presse,
  webzine local) ; barème ; preuves de placement de l'éditeur.
- **Fin** : barème consigné (02, 08 §11 à §13).

### P6-02 — Label

- **Dépend de** : P6-01, P5-02 ✅.
- **Tâches** : `Organization(LABEL)` vérifiée ; signature (seul
  validateur, confirmée par l'artiste) ; catalogue ; rangs.
- **Fin** : une signature non confirmée par les deux n'existe pas.

### P6-03 — Éditeur·rice

- **Dépend de** : P6-01.
- **Tâches** : contrats d'édition et placements confirmés ; preuves
  (ISWC, lien vers l'œuvre placée).
- **Fin** : intégration des preuves retenues.

### P6-04 — Communication musicale

- **Dépend de** : P6-01.
- **Tâches** : campagnes et couvertures confirmées par l'artiste ;
  corroboration d'une sortie ou d'un concert par un article lié.
- **Fin** : un simple partage ne rapporte rien (test).

### P6-05 — Carte : actes VI à VIII

- **Dépend de** : P3-07 ✅, P6-02.
- **Tâches** : actes sortie, développement, carrière jouables ; quêtes
  de méthode (préparer une sortie 4 semaines avant, dossier de presse,
  clip) ; épreuves « sortie vérifiée », « signature ».
- **Fin** : e2e de la carte complète sur un jeu de données.

### P6-06 — Défis collectifs par ville

- **Dépend de** : P5-04 ; D3.
- **Tâches** : défis coopératifs opt-in (« 50 morceaux enregistrés à
  Toulouse ce mois-ci », la fête de la musique) ; jamais de classement
  entre personnes.
- **Fin** : un défi réussi crédite un succès collectif.

### P6-07 — Autres rôles

- **Dépend de** : indicateurs par métier (P1-13 ✅).
- **Tâches** : ouvrir les rôles de 06 §3.11 selon la demande mesurée
  (vidéastes, graphistes, DJ, techniciens, magasins, loueurs, profs,
  tremplins, radios…), un lot par rôle.
- **Fin** : chaque rôle ouvert suit la liste de 08 §16.

## 8. À surveiller pendant le pilote (hors lots)

Une ligne réglée est retirée ; le `git log` en garde la trace.

| Sujet                               | Ce qui reste                                                                                                                       | Quand                                          |
| ----------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------- |
| Désabonnement email en un clic      | `List-Unsubscribe-Post` (RFC 8058) : route exemptée de la protection CSRF ; aujourd'hui l'en-tête mène à la page de confirmation   | Avant 5 000 emails par jour                    |
| Heure du digest                     | Cron à 17 h UTC (18 h l'hiver, 19 h l'été) ; à revoir selon les retours                                                            | Après le pilote                                |
| Web Push                            | Reporté (D34), avec l'app des stores ou si des demandes sont ratées faute d'alerte                                                 | Après le pilote                                |
| Réputation et tri de la recherche   | Poids `ln(1 + n)`, seuil de réactivité et D33 posés sans données réelles : à calibrer                                              | Revue après le pilote                          |
| Coût du traitement des événements   | Chaque événement recalcule confiance et réputation : passer en job QStash si les actions ralentissent                              | Dès le pilote                                  |
| Coût du digest et des suggestions   | Requêtes par personne (digest), PostGIS sur 200 candidat·es à chaque ouverture (suggestions) : regrouper, mettre en cache          | Au-delà de quelques milliers de comptes        |
| Détection de collusion              | Seuils posés sans données ; une collusion confirmée ne reprend pas encore l'XP du cercle ; empreinte limitée aux sessions vivantes | Au premier cas confirmé, revue après le pilote |
| Suggestions et attentes réciproques | Ajuster selon « Pas intéressé·e », distinguer pairs, recrutement et transmission, sans faire du niveau un filtre (07 §7.1)         | Revue après le pilote                          |
| Plafond des habitué·es des jams     | Un même cercle donne au plus 70 XP par personne et par an (voulu) : vérifier sur les données                                       | Revue après le pilote                          |
| Mémoire de `svelte-check`           | Portée à 6 Go ; pistes : types Prisma plus légers, `skipLibCheck` sur `@prisma/client`                                             | Surveiller                                     |
| Amorcer la communauté               | Lieux relais, écoles, liste d'attente : piste non technique, suivie dans [docs/lancement](../lancement/README.md)                  | En continu                                     |
