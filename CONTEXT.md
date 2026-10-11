# PasD'Tal'

Appli partagée entre deux sœurs pour suivre leurs dépenses et leurs abonnements, et régler leurs dépenses communes.

## Language

### Personnes

**Membre**:
Une des deux personnes qui utilisent l'appli. Chaque membre voit tout, mais ne modifie que son perso et le commun.
_Avoid_: utilisateur, compte, profil

**Perso**:
Se dit d'une dépense ou d'un abonnement qui appartient à une seule membre.
_Avoid_: personnel, privé, individuel

**Commun**:
Se dit d'une dépense ou d'un abonnement partagé par les deux membres. Le commun est suivi à part des budgets perso.
_Avoid_: partagé, collectif, joint

**Lien d'invitation**:
Le lien que la membre qui a installé le script Google envoie à sa sœur pour qu'elle rejoigne leurs données. Il contient l'adresse du script et le code secret.
_Avoid_: lien de partage, clé, code d'accès

### Budget

**Dépense**:
Une somme sortie à une date, rangée dans une catégorie, perso ou commune.
_Avoid_: achat, transaction, opération, sortie

**Catégorie**:
Un rangement pour les dépenses (courses, loisirs…), avec une couleur choisie par la membre. Le commun a sa propre liste de catégories, séparée des catégories perso. L'appli propose une liste de départ, que l'on peut renommer ou compléter.
_Avoid_: type, poste, rubrique

**Plafond de catégorie**:
Le montant mensuel qu'une membre se fixe pour une catégorie. Il est optionnel. À partir de 80 % (réglable), la catégorie est « bientôt au plafond » ; au-delà de 100 %, elle est « dépassée ».
_Avoid_: budget, enveloppe, limite

**Plafond du mois**:
Le montant total qu'une membre se fixe pour le mois, toutes catégories confondues. Il est optionnel.
_Avoid_: budget global, limite mensuelle

**Reste du mois**:
Le plafond du mois, moins les dépenses perso de la membre et ses parts des dépenses communes. Il affiche à part ce qui est déjà prévu.
_Avoid_: reste à vivre (qui suppose des revenus), disponible

**Prévu**:
Un prélèvement d'abonnement attendu plus tard dans le mois, et pas encore passé. La fin d'un essai gratuit non résilié en fait partie.
_Avoid_: à venir, en attente

### Prévisions

**Envisagé**:
Un abonnement ou un achat qu'une membre teste avant de le prendre. Il s'affiche en pointillés, à côté des vrais chiffres, jusqu'à ce qu'elle le prenne ou le supprime. Pour un envisagé commun, seule sa part compte.
_Avoid_: simulation, brouillon, projet, prévision

### Commun

**Part**:
La fraction d'une dépense commune qui revient à une membre. Elle vaut 50 % par défaut et se règle au cas par cas.
_Avoid_: quote-part, répartition

**Payeuse**:
La membre qui a avancé l'argent d'une dépense commune.
_Avoid_: payeur, créancière

**Solde**:
Ce qu'une membre doit à l'autre depuis le dernier remboursement, d'après les payeuses et les parts des dépenses communes.
_Avoid_: dette, balance, compte

**Remboursement**:
Le versement qui remet le solde à zéro (« on est quittes »).
_Avoid_: règlement, virement

### Abonnements

**Abonnement**:
Un paiement qui revient à intervalle régulier et qui génère automatiquement une dépense à chaque échéance.
_Avoid_: forfait, souscription, prélèvement récurrent

**Échéance**:
La date du prochain prélèvement d'un abonnement.
_Avoid_: renouvellement, date de paiement

**Préavis**:
Le délai à respecter avant une échéance pour pouvoir résilier. Il vaut zéro par défaut.
_Avoid_: délai de résiliation

**Date limite de résiliation**:
L'échéance moins le préavis : le dernier jour où résilier évite le prochain prélèvement. C'est la date que vise l'alerte.
_Avoid_: date de renouvellement

**Essai gratuit**:
La période gratuite au début d'un abonnement. Sa fin tient lieu de première échéance, et l'alerte est toujours activée.
_Avoid_: période d'essai, trial

**Alerte**:
Une notification envoyée 3 jours (réglable) avant la date limite de résiliation. Seule la membre sur Android en reçoit, pour ses abonnements perso et les abonnements communs.
_Avoid_: rappel

**Dépense ajoutée toute seule**:
La dépense qu'un abonnement crée le jour d'une échéance. On peut la modifier, ou la supprimer si le prélèvement n'a pas eu lieu.
_Avoid_: dépense automatique, prélèvement

**Résilié**:
L'état d'un abonnement arrêté. Il ne génère plus ni dépense ni alerte.
_Avoid_: annulé, terminé, archivé

**Coût par mois et par an**:
Un montant ramené à son équivalent mensuel et annuel, quelle que soit sa fréquence réelle.
_Avoid_: coût mensualisé, coût lissé, coût réel
