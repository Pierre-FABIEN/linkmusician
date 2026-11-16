# Prompt de reprise — après ARCH-MET-02b, proposition concurrente

```markdown
Reprends LinkMusician dans /home/utilisateur/linkmusician. Une session = un lot.
Travaille directement sur main, sans push. Commence par git status, git log
et git ls-remote origin refs/heads/main ; fetch si nécessaire, en préservant
les commits et toutes les modifications présents.

État du 16/11/2026 : ARCH-MET-02a, 8cdf0b585bd4c79f7ea4598dfe98c03ebab17568,
est publié sur origin/main ; #55/#56 closes. Sa publication est désormais
explicitée dans #56 au-dessus de la livraison locale historique. Aucun
déploiement de production établi.
ARCH-MET-02b est suivi dans #57 ; retrouver son commit et sa recette finale
dans git log, docs/plan/README.md et l’issue. Distinguer sa livraison locale,
la mise à jour GitHub et une éventuelle publication ultérieure du code.
Le commit documentaire initial 5e9d6b3 a été préservé.
Recette 02b : 1 368 unitaires, 461 tests ciblés dans 44 fichiers, 3 intégrations
médias séparées et 6 E2E sans reprise réussis ; types sans erreur/avertissement,
lint ciblé conforme et réserves globales .shot-* préexistantes consignées.
Les 36 cas de gestion et les 11 barrières 02a passent. Aucune migration 02b.

Lis CLAUDE.md, CONTRIBUTING.md, docs/plan/README.md (§4 et recettes 02a/02b),
docs/plan/fin-du-projet.md (fiche 02c et dépendances), docs/plan/a-trancher.md,
docs/conception/17-audit-capacites-services.md (R1/R2 corrigés, R3/R4 distincts),
et les documentations collaborations/messages concernées.
Vérifie le résultat réel de #57 et tout critère restant avant de commencer.

Suite proposée : ARCH-MET-02c, proposition concurrente, indépendante de SELF.
Relis #55/#56/#57 et recherche une issue 02c existante ; crée une issue
distincte avant le code si elle manque, sans doublon, puis note-la dans le plan.

Caractérise R3 avec de vraies transactions PostgreSQL et barrières déterministes :
proposeCollaboration compte avant son tx, sans unicité conversation/jour.
Définis la clé d’intention et les cas annulation/nouvel essai, sans déduire
l’unicité d’une proposition de l’idempotence XP d’un événement donné.
Préserve les exports publics, consentements, actes humains, lectures privées,
mineur·es/blocages/quotas, et le TransactionClient de l’appelant.
Aucun acte ancien reconstitué, aucun faux collaboration.completed.

Contrat à préserver : collaboration → work avant toute écriture de participant ;
work → band avant acteurs, union triée transactionnelle des acteurs des
émissions successives, périodes historiques et candidats présentateurs figés
puis traités conditionnellement. Les mutations Work relisent existence et
gestion sous work/band ; OWNER/ADMIN actifs d’un BAND vivant seulement,
ou personne porteuse. Ni MEMBER ni crédit ni métier ni mandat ne gèrent.
La création préalloue un identifiant Work privé pour suivre work → band.
La préparation oEmbed est hors verrous SQL ; média neuf, publication et
association sont atomiques et se compensent par rollback SQL, sans DELETE
de média existant ou partagé. Ne pas réintroduire une transaction imbriquée.

Recette : scénarios à barrières du lot et non-régressions justifiées,
11 barrières 02a et gestion 02b si leurs chemins sont touchés ; check,
unitaires, lint et E2E concernés sans reprise. Jamais check pendant E2E.
Les scripts .shot-metro.mjs/.shot-tmp.mjs gardent leurs écarts préexistants :
les consigner, sans nettoyage opportuniste, et vérifier lint ciblé séparément.
Les tests SQL qualifiés doivent définir DATABASE_URL avec le même schéma e2e
que leur client Prisma, sans exposer ses secrets.

Pas de migration par principe ; si nécessaire, justifier, employer les scripts
db:* et relire le SQL. Retour applicatif cohérent conservant les données,
avec documentation du risque réintroduit. R4, extraction ARCH-MET-03 et
SELF #51–#54 restent distincts. #36 et #30/#35/#50 restent les références ;
le modèle exact de #51 doit être validé avant son code.
Aucun SELF/HOME, WorkPitch, Project générique ou métier futur dans 02c.

Termine le lot : conception, docs de domaine, tableau, preuves, issue,
prompt suivant et commit local en français avec ARCH-MET-02c, sans push.
Distingue résultats locaux, publication GitHub et production ; signale tout
critère restant au lieu de le présenter comme livré.
```
