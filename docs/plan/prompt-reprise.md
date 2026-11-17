# Prompt de reprise — après ARCH-MET-02c

```markdown
Reprends LinkMusician dans /home/utilisateur/linkmusician. Une session = un lot.
Travaille directement sur main, sans push. Commence par git status, git log
et git ls-remote origin refs/heads/main ; fetch seulement si nécessaire, en
préservant tous les commits et toutes les modifications présents.

Bilan du 16/11/2026 : 20 issues fermées sur 45 (44,4 %), 25 ouvertes ;
voir docs/plan/bilan-issues-2026-11-16.md. Les épopées et sous-lots se recouvrent :
ce pourcentage ne mesure ni la charge restante ni la préparation à la production.
Onze corps d’issues ont été actualisés, sans clôture ni suppression supplémentaire.

Publication confirmée : 9a73d455ab03fff83ce9c1993b60b02fb1b42660 sur origin/main.
ARCH-MET-01, 02a, 02b et 02c (#55–#58) sont publiés et les issues closes.
Le bilan documentaire BILAN-01 est ensuite commité localement, sans push ;
retrouver son SHA dans git log. Aucun déploiement de production établi.
Revérifie publications et états au démarrage ; les récits « livraison locale »
conservent leur état historique et ne décrivent pas forcément la publication.

Lis CLAUDE.md, CONTRIBUTING.md, docs/plan/README.md (§4 et recette 02c),
docs/plan/preuves-arch-met-02c.md, docs/plan/fin-du-projet.md,
docs/plan/a-trancher.md et docs/conception/17-audit-capacites-services.md.
Ne rejoue pas les anciennes recettes sans lien avec les chemins modifiés.

02c : clé collaboration-proposal:<conversationId>:<jour UTC happenedOn stocké>,
commune aux proposants et types. Le contrôle précoce conserve les erreurs,
mais seul le count relu sous la clé transactionnelle décide. Collaboration,
participants et notification partagent le même TransactionClient. PROPOSED,
ACCEPTED et COMPLETED bloquent ; CANCELLED autorise une nouvelle ligne, jamais
une réactivation. Refus par CollaborationError, jamais retour de l’ancien objet.
Actes, auteurs et consentements ne passent pas d’une ligne à l’autre.
Une annulation non validée peut laisser refuser ; un nouvel essai après son
commit peut réussir. Aucun nouveau verrou d’annulation ni migration.

Les 17 scénarios PostgreSQL du lot observent les attentes dans pg_locks et
conservent le rouge initial (deux collaborations et deux notifications).
La finalisation gardée n’ajoute ni événement, ni crédit, ni XP en double et
ne reconstitue aucun acte humain. Voir les totaux et limites dans le suivi.
Aucune correction générale de R4, extraction 03 ou fonctionnalité SELF livrée.

Suite proposée : un lot distinct de caractérisation et cadrage de R4, avant
toute correction générale de processEvent. Examiner les appels réels et les
contrats de relecture/effets après plusieurs événements ; reproduire seulement
les courses pertinentes avec barrières et vraies transactions e2e. Dédupliquer
le ledger d’un événement ne prouve pas une exécution unique de tous les effets.
Rechercher une issue existante ; en créer une distincte avant du code si une
correction est justifiée. Définir le périmètre et les critères avant de toucher
le processeur ; ne pas promettre une livraison « exactement une fois » globale.
Si aucune correction utile n’est établie, conserver une conclusion documentée,
avec ses limites, sans refactorisation de principe.

Préserver collaboration → work avant écritures de participants existants,
work → band avant acteurs, union triée transactionnelle des acteurs des
émissions successives, périodes historiques et candidats présentateurs figés
puis traités conditionnellement. Les mutations Work relisent existence et
gestion sous work/band : personne porteuse ou OWNER/ADMIN actifs d’un BAND
vivant seulement ; création avec identifiant Work privé préalloué. Ni MEMBER,
crédit, métier ni mandat ne donnent la gestion. Préparation oEmbed hors verrous,
média neuf/publication/association dans le tx commun, rollback SQL sans DELETE
de média existant/partagé. Aucun réseau sous verrou ni transaction imbriquée.

Toute recette SQL qualifiée définit DATABASE_URL avec le même schéma e2e que
son client Prisma, sans exposer les secrets. Check hors E2E ; tests ciblés à
barrières et non-régressions justifiées, unitaires, lint ciblé séparé du global,
E2E concernés sans reprise. Conserver les écarts préexistants des scripts
.shot-metro.mjs/.shot-tmp.mjs, sans nettoyage opportuniste.

SELF #51–#54 reste distinct ; #36 et #30/#35/#50 sont les références. Valider
le modèle exact de #51 avant son code. Aucun SELF/HOME, WorkPitch, Project
générique ou métier futur dans une correction R4. Extraction ARCH-MET-03
seulement si utile et cadrée séparément.

Termine le lot choisi : conception, docs de domaine, tableau, preuves, issue,
prompt suivant et commit local français sur main, sans push. Distingue résultats
locaux, publication GitHub et production ; expose tout critère restant.
```
