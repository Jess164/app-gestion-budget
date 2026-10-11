# Appli web installable plutôt qu'applis natives

Un des deux membres a un iPhone. Une appli native iOS coûte 99 €/an (programme développeur Apple), sinon elle expire tous les 7 jours et doit être réinstallée depuis un Mac. On fait donc une seule appli web, installable sur l'écran d'accueil des deux téléphones, et emballée en plus dans un vrai APK pour Android.

## Consequences

Sur iPhone, l'appli web ne reçoit pas de notifications (voir ADR-0004). Elle doit en revanche réussir la connexion Google et la synchronisation du fichier Drive (voir ADR-0003), ce qui est à tester en premier sur l'iPhone de la sœur.
