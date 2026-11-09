# D47 — Assistant IA de préremplissage de l'inscription

- Statut : Proposée
- Lot concerné : P3-17

## Contexte

L'onboarding demande de transformer une situation musicale exprimée
librement en réponses à plusieurs formulaires : instruments et niveau,
genres, commune et intention. Cette traduction peut être difficile pour
les personnes qui débutent ou ne savent pas quels champs les concernent.
L'objectif reste inchangé : terminer en six écrans au plus et arriver à
un premier résultat en moins de deux minutes.

Les informations fournies peuvent être personnelles. Le recours à un
modèle externe ne doit ni étendre la collecte, ni écrire dans le profil
sans accord explicite.

## Options envisagées

1. Ajouter un chatbot qui mène l'entretien et décide des champs à remplir.
   - Avantage : conversation guidée.
   - Inconvénients : nouveau parcours, décisions opaques, durée accrue et
     risque que la personne prenne une déduction pour un fait.
2. Garder les formulaires existants et offrir une aide facultative qui
   transforme une description libre en propositions structurées.
   - Avantage : saisie plus simple sans changer les règles métier ; les
     personnes gardent le contrôle.
   - Inconvénient : dépendance à un fournisseur et coût par requête.
3. Ne rien proposer à ce stade.
   - Avantage : aucun coût IA ni transfert de texte.
   - Inconvénient : ne traite pas la difficulté décrite.

## Décision proposée

Retenir l'option 2 pour les seuls champs de l'onboarding. L'IA suggère des
valeurs issues des référentiels existants et la personne peut les
modifier, les retirer ou les ignorer. Les soumissions normales de chaque
formulaire restent obligatoires pour enregistrer les valeurs.

Le niveau n'est proposé que si la personne décrit explicitement son
niveau, et non à partir du nombre d'années de pratique. La commune doit
être sélectionnée dans le sélecteur existant ; aucune adresse, coordonnée
ou géolocalisation n'est produite. Le rayon de déplacement n'est proposé
que s'il a été explicitement indiqué.

Le texte libre et la réponse brute du modèle ne sont pas conservés ni
journalisés. Avant de choisir un fournisseur, vérifier ses conditions de
conservation et d'utilisation des données, ses sous-traitants, son coût
et la possibilité de limiter les requêtes. En l'absence de garanties de
confidentialité vérifiables, ne pas transmettre le texte et ne pas livrer
l'assistant.

## Conséquences

- L'aide est facultative, déclenchée par la personne, et ne crée pas
  d'écran supplémentaire.
- La version initiale accepte du texte ; la dictée locale du clavier
  reste possible, mais aucune capture ni transmission audio n'est prévue.
- La sortie du modèle est non fiable : elle est structurée, validée
  strictement côté serveur et limitée aux identifiants des référentiels.
- Aucune information d'inscription (email, mot de passe, date de
  naissance), donnée de paiement, localisation précise, progression,
  classement ou décision concernant d'autres personnes ne passe au
  modèle.
- Les données ne sont enregistrées qu'à travers les formulaires
  existants, après confirmation et validation habituelles.
- Les compteurs de produit ne comprennent ni texte libre ni valeurs des
  champs. Ils servent uniquement à mesurer l'usage, les confirmations,
  les corrections, les erreurs, le coût et le taux de fin d'inscription.
- Le fournisseur, la politique de minimisation du texte, le quota par
  compte et le budget maximum par inscription restent à préciser et à
  valider avant le début de l'implémentation.
- L'aide à la bio, aux annonces, aux groupes et aux autres formulaires
  est hors périmètre ; elle sera reconsidérée après le pilote.
