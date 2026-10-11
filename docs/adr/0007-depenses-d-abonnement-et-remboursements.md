# Dépenses d'abonnement à identifiant fixe, et remboursements enregistrés à part

Un abonnement doit créer sa dépense le jour de chaque échéance, sans tâche de fond (ADR-0004). C'est donc l'appli qui ajoute les dépenses des échéances passées, à chaque synchro. Les deux téléphones le font : pour éviter les doublons, la dépense d'une échéance a un identifiant fixe, `auto-<abonnement>-<date>`. Sa date de modification est le jour de l'échéance, donc toute vraie modification ou suppression, plus récente, l'emporte à la synchro. Si l'échéance est décalée de quelques jours, celle déjà présente dans la même période compte, et l'appli n'en ajoute pas une deuxième.

L'abonnement garde l'échéance saisie (`anchor`) et en déduit les suivantes : aucun téléphone ne le réécrit pour avancer l'échéance, ce qui évite d'écraser une modification de l'autre.

« On est quittes » crée un enregistrement de remboursement (qui a remboursé, combien), au lieu de marquer chaque dépense commune comme réglée. Le solde est la somme des dépenses communes et des remboursements.

## Considered Options

- **Un seul téléphone ajoute les dépenses d'abonnement** : rejetée, la sœur n'aurait pas ses dépenses tant que l'autre n'ouvre pas l'appli.
- **Marquer les dépenses communes « réglées »** (comme dans le prototype) : rejetée, cela réécrit beaucoup d'enregistrements, et une dépense ajoutée en même temps par l'autre téléphone pourrait être marquée à tort.

## Consequences

- Une dépense d'abonnement supprimée ne revient pas, même si l'autre téléphone ne l'a pas encore appris.
- Modifier une ancienne dépense commune après un remboursement fait réapparaître la différence dans le solde : c'est voulu.
- Un remboursement noté par erreur se supprime depuis l'onglet Commun.
- Le script Google n'a pas changé : il accepte n'importe quel type d'enregistrement.
