# Prompt de reprise — après ONB-13b

```markdown
Reprends LinkMusician dans /home/pierre/linkmusician. Une session = un lot.
Travaille directement sur main, sans push (l'utilisateur pousse depuis VS Code ;
ce terminal n'a ni gh ni identifiants GitHub). Commence par git status, git log
et git ls-remote origin refs/heads/main ; préserve commits et modifications,
y compris celles d'une autre session (ne commite pas un travail qui n'est pas
le tien sans le dire). Les issues GitHub sont publiques : lis-les par l'API
(curl), sans les modifier sans instruction.

État au 17/11/2026 :
- Publiés sur origin/main (4c773a0, puis 5b91004 si poussé) : DASH-06a à 06d
  (#51–#54, D68 à D70) et la refonte de l'aide (/aide/<page>/<section>).
  Commentaires de clôture des issues #52–#54 préparés pour l'utilisateur.
- ONB-13b (#27, D63) livré en local, commit « (ONB-13b) » à vérifier :
  conditions facultatives sur opportunities (pay + fourchette payMinEuros/
  payMaxEuros, commitment, presence, formation, repertoire ; migration
  20261117142644_opportunity_qualification, contrainte
  opportunities_pay_range_check). Règles pures #lib/opportunities/qualification :
  bloquant seulement si le profil dit le contraire (MusicCommitment,
  CraftMobility, band_profiles), sinon « non précisé » ; rémunération
  informative. applyTo et applyAsBand verrouillent l'annonce (FOR UPDATE) et
  revérifient statut, doublon et conditions dans la transaction.
  eligibilityFor renvoie désormais { unmet, unknown }.
- Écart d'environnement connu : deux tests à barrières de
  locking.integration.test.ts dépassent leur lock_timeout (55P03), à
  l'identique sur le code d'origine. Pas une régression.

Lot suivant : DASH-07 (#37) — candidature déléguée. Lis CLAUDE.md,
docs/plan/README.md §4, docs/plan/fin-du-projet.md (DASH-07 et §3.1),
docs/conception/13-mandats-individuels.md, 15-affectations-delegations.md,
17-audit-capacites-services.md, docs/annonces/README.md (candidatures,
plateaux, annonces qualifiées) et src/lib/representation/delegations.ts.
Audite d'abord, propose le modèle à l'utilisateur, consigne la décision
(D71) avant toute migration.

Contrat attendu :
- Un manager ou un booker candidate au nom d'un artiste (personne ou groupe)
  seulement par un **droit nouveau, explicite et consenti** par l'artiste
  (pour un groupe : sa gestion), borné dans le temps et révocable. Aucun
  mandat, métier, rôle d'agence, ni VIEW_MANDATE/END_MANDATE n'autorise à
  candidater. Droit relu sous verrou au moment de l'envoi.
- Auteur réel (Application.sentById) distinct de l'artiste représenté
  (applicantActorId) ; l'artiste voit la candidature envoyée en son nom et
  peut la retirer ; notification à l'artiste.
- Mêmes conditions que la candidature directe (eligibilityFor / checkBand
  sur l'artiste, pas sur l'agent), revérifiées dans la transaction ; mêmes
  blocages, visibilité et règles des mineur·es ; pas de doublon (unique
  opportunity/applicant).
- Recrutement d'un groupe (RECRUIT_MEMBER) exclu tant qu'il ferait adhérer
  sans consentement de la personne.
- Acte répétable en ajout seul (donner, utiliser, révoquer le droit), export
  et anonymisation RGPD. Aucune XP pour l'agent par la candidature.
- Tests : unitaires (droit, périmètre, expiration), intégration (droit
  absent/révoqué/expiré refusé, course révocation contre envoi, mineur·e,
  groupe), E2E ciblé (390 px, clavier, axe, POST forgé).
Si le lot dépasse 1 à 4 jours, découpe (DASH-07a : le droit et son
consentement ; DASH-07b : la candidature déléguée).

Restent ensuite : ONB-12c2 (#26 : portfolio, matériel, tarifs, visibilité
rate/gear, « postproduction » dans SoundSpecialty), ONB-14 (#28, recette
continue), suite de #36 (affectation à un membre avec accord, prestataire
externe, mixage/mastering/production pris soi-même, versions et validations).

Ne lance jamais npm run check pendant les E2E (mémoire WSL) ; ne régénère pas
le client Prisma pendant qu'un E2E tourne. Migrations : db:nouvelle-migration,
relecture, db:deploy puis db:deploy:e2e. Termine par conception, docs de
domaine, aide, démo, tableau §5, prompt suivant et commit local en français.
```
