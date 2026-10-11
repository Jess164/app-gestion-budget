# Alertes en notifications locales, sur Android seulement

Sans serveur, une appli web installée sur iPhone ne peut pas recevoir de notifications. La membre a refusé un petit robot planifié pour les envoyer et accepte que sa sœur n'ait aucune alerte. Les alertes sont donc des notifications locales programmées par l'APK Android, pour ses abonnements perso et les abonnements communs. L'APK doit pour cela être une coque native capable de programmer des notifications (type Capacitor), et pas un simple emballage du site.

## Consequences

Les alertes sont reprogrammées à chaque synchronisation. Il n'y a pas de synchronisation en arrière-plan, sur aucun des deux téléphones : la synchronisation se fait à l'ouverture, au retour sur l'appli, toutes les quelques minutes tant qu'elle est à l'écran, et avec un bouton ↻. Un abonnement ajouté par la sœur n'est donc alerté qu'après la prochaine ouverture de l'appli sur Android. S'il est ajouté juste avant sa date limite de résiliation, l'alerte peut ne jamais arriver.
