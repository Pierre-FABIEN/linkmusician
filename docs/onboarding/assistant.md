# Assistant d'inscription (P3-17, D47)

> Livré le 10/11/2026. **Désactivé par défaut** : à n'allumer qu'après la
> vérification du fournisseur ci-dessous.

Sur « Qui es-tu ? », une aide **facultative** transforme une description
libre en **propositions** pour les écrans de l'onboarding (métiers,
instruments et niveau dit, genres, nom de commune, rayon dit, intention).
Rien n'est enregistré par l'aide : chaque écran est pré-rempli, la personne
vérifie et envoie le formulaire habituel. Le parcours manuel reste
identique, toujours six écrans.

## Comment c'est fait

| Morceau                      | Fichier                                                                  |
| ---------------------------- | ------------------------------------------------------------------------ |
| Règles pures                 | `src/lib/onboarding/assistant.ts`                                        |
| Service (quota, fournisseur) | `src/lib/server/onboarding-assistant.ts`                                 |
| API                          | `POST /api/onboarding/assistant`, `POST /api/onboarding/assistant/usage` |
| Panneau sur « Qui es-tu ? »  | `src/lib/components/linkmusician/onboarding/OnboardingAssistant.svelte`  |
| Propositions entre écrans    | `src/lib/onboarding/proposals.ts` (`sessionStorage`)                     |
| Bandeau « Pré-rempli »       | `ProposedNotice.svelte` sur instruments, genres, ville, intention        |

1. La personne déplie le panneau, lit l'avis, coche l'accord, écrit (20 à
   1 000 caractères) et lance l'analyse.
2. Le serveur vérifie l'interrupteur, que l'onboarding est en cours, puis
   **réserve** une analyse (`Person.assistantRuns`, au plus 3, mise à jour
   atomique).
3. `minimize` retire emails, liens, téléphones, adresses, codes postaux et
   `@pseudos` avant l'envoi.
4. Appel à Claude Haiku (`claude-haiku-5-5`) : `messages.parse` avec une
   **sortie structurée** (`zodOutputFormat(MODEL_OUTPUT)`), effort bas,
   2 048 jetons au plus, 20 s, une seule nouvelle tentative, **aucun outil**.
   Le prompt liste les identifiants des référentiels et dit que le texte
   est une donnée, pas une consigne.
5. `validateProposals` ne garde que des identifiants connus (instruments et
   genres actifs, métiers, intentions), au plus 3 instruments et 5 genres,
   un niveau seulement s'il est dit et dans les bornes, un nom de commune
   sans chiffre, un rayon de la liste. Le reste est écarté et compté.
6. Échec du fournisseur ou réponse illisible : l'analyse est **rendue**, le
   message dit que rien n'a été enregistré.
7. Le navigateur affiche les propositions (chacune se retire), puis
   « Utiliser ces propositions » coche les métiers et garde le reste dans
   `sessionStorage`. Chaque écran reprend sa part une fois ; la commune se
   choisit toujours dans la liste du sélecteur ; « Tout retirer » vide
   l'écran.

## Ce qui n'est jamais fait

- Ni le texte ni la réponse brute ne sont stockés ou journalisés (une
  erreur est journalisée par sa classe et son statut seulement).
- Aucun email, mot de passe, date de naissance, identifiant de compte ou
  coordonnée précise n'est envoyé au modèle.
- Aucun enregistrement de profil, aucun envoi de formulaire, aucune XP.
- Aucune déduction du niveau à partir des années de pratique.

## Mesure

Compteurs Redis (`incrementMetric`), sans texte ni valeur :
`onboarding_assistant.run`, `.failed`, `.empty`, `.quota`,
`.proposed_fields`, `.dropped`, `.input_tokens`, `.output_tokens`, et côté
navigateur `.applied`, `.ignored`, `.removed`. Comparer le taux de fin
d'inscription avec et sans aide reste à faire dans `/admin/metrics`.

## Données personnelles (RGPD)

`Person.assistantRuns` (un nombre) est dans l'export
(`analyses_assistant_inscription`) et remis à 0 à l'anonymisation.

## Mise en service

Variables : `ONBOARDING_ASSISTANT_ENABLED=1` et `ANTHROPIC_API_KEY`. Pour
les e2e et le dev, `ONBOARDING_ASSISTANT_FAKE=1` branche un fournisseur
factice et déterministe (mots-clés, aucun appel), refusé en production.

**Avant d'activer en production (D47)**, vérifier sur les conditions
d'Anthropic en vigueur et consigner ici, avec la date :

- [ ] durée de conservation des requêtes et des réponses de l'API ;
- [ ] absence d'usage pour l'entraînement des données de l'API ;
- [ ] sous-traitants et lieux de traitement (transfert hors UE, clauses) ;
- [ ] possibilité d'un accord de conservation nulle (ZDR) ;
- [ ] mention du fournisseur dans la politique de confidentialité ;
- [ ] budget mensuel plafonné dans la console du fournisseur.

## Tests

- Unitaires : `src/lib/onboarding/assistant.test.ts` (minimisation,
  validation, prompt, conversion du schéma pour la sortie structurée).
- Intégration (fournisseur simulé) :
  `src/lib/server/onboarding-assistant.integration.test.ts`.
- E2E (fournisseur factice) : `e2e/linkmusician/assistant-inscription.spec.ts`.
