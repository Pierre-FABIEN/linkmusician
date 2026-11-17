# Prompt de reprise — après ONB-12c1

```markdown
Reprends LinkMusician dans /home/pierre/linkmusician. Une session = un lot.
Travaille directement sur main, sans push. Commence par git status, git log
et git ls-remote origin refs/heads/main ; préserve commits et modifications.
Les issues GitHub sont publiques : lis-les par l'API (curl), sans les modifier
sans instruction.

Bilan du 16/11/2026 : 20 issues fermées sur 45 (44,4 %), 25 ouvertes ;
voir docs/plan/bilan-issues-2026-11-16.md. Les épopées et sous-lots se recouvrent :
ce pourcentage ne mesure ni la charge restante ni la préparation à la production.
Onze corps d’issues ont été actualisés, sans clôture ni suppression supplémentaire.

Publication confirmée : 9a73d455ab03fff83ce9c1993b60b02fb1b42660 sur origin/main.
ARCH-MET-01, 02a, 02b et 02c (#55–#58) sont publiés et les issues closes.
Le bilan documentaire BILAN-01 (e786ba4) est publié sur origin/main. Aucun déploiement de production établi.
Revérifie publications et états au démarrage ; les récits « livraison locale »
conservent leur état historique et ne décrivent pas forcément la publication.

ONB-12c1 (#26, D64) livré dans un commit local identifié par cet ID : table
additive band_profiles (formation SOLO/DUO/TRIO/BAND, répertoire
COVERS/ORIGINALS/BOTH), fiche du groupe gérée par OWNER/ADMIN sous le verrou
band:, « Sur scène » public et déclaré, valeur absente = non précisé.
Règles formationMatch/repertoireMatch (#lib/bands/lineup) : yes/no/unknown,
unknown n'exclut jamais. Migration 20261117023015_band_profiles appliquée sur
public et e2e. Revérifie si ce commit a été publié.

Lot suivant proposé : ONB-13b (#27, D63) — annonces qualifiées. Lis
CLAUDE.md, docs/plan/README.md §4, docs/plan/fin-du-projet.md §3.1,
docs/conception/06-metiers.md §1.3, docs/annonces/README.md et
docs/groupes/README.md (formation et répertoire).
Champs facultatifs sur opportunities (migration additive, db:nouvelle-migration,
relecture, db:deploy puis db:deploy:e2e) : rémunération et fourchette,
formation (réutiliser l'enum BandFormation), répertoire si utile, engagement,
présence. Critère bloquant seulement quand le profil dit explicitement le
contraire ; inconnu affiché « non précisé ». GIG_SLOT : comparer à
band_profiles. Engagement : MusicCommitment du profil musicien ; présence :
CraftMobility des métiers du son. Scénarios #29 : 1, 3 et 4. Aucune XP, aucun
tri par XP. Revérifier les conditions sous transaction à la candidature.

Ensuite seulement DASH-07 (#37) : candidature déléguée par un droit nouveau,
explicite et consenti (aucun mandat, métier, rôle d'agence ni VIEW/END_MANDATE
n'autorise à candidater) ; auteur réel (sentById) distinct de l'artiste
représenté ; recrutement exclu tant qu'il ferait adhérer sans consentement.

ONB-12c2 reste ouvert : portfolio, matériel, tarifs, visibilité rate/gear,
« postproduction ». DASH-05/06 hors périmètre sauf correction nécessaire.
Check jamais en même temps que les E2E (mémoire WSL). Termine par conception,
docs de domaine, aide, démo, tableau, prompt suivant et commit local français.
```
