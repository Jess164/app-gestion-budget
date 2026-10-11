# Synchro par un script Google (Apps Script), sans connexion Google sur les téléphones

Avec l'ADR-0003, chaque téléphone devait se connecter à Google pour lire le fichier Drive. Or, sur iPhone, une appli web installée gère mal la fenêtre de connexion Google, et le jeton expire au bout d'une heure. On remplace donc cet accès direct par un petit script Google Apps Script, déployé une fois par la membre « a ». Le script est attaché à une feuille Google Sheets de son Drive, qui contient une ligne par enregistrement, et il n'a accès qu'à cette feuille (`@OnlyCurrentDoc`). Les téléphones lui parlent avec un code secret, généré à la première configuration.

## Considered Options

- **Connexion Google sur chaque téléphone (ADR-0003)** : rejetée, à cause de la reconnexion toutes les heures et de la fenêtre de connexion peu fiable sur iPhone.
- **Base de données en ligne (Supabase)** : rejetée, la membre ne veut pas de base de données externe.

## Consequences

- Le fichier de données reste dans le Drive de la membre « a ». Personne n'a besoin de le partager.
- Quiconque obtient l'adresse du script et le code peut lire et écrire les données : le lien d'invitation ne doit être envoyé qu'à la sœur.
- La fusion se fait enregistrement par enregistrement, et le plus récent l'emporte. Deux modifications de la même dépense en même temps : la dernière gagne.
- Le stockage des appareils iPhone est séparé entre Safari et l'appli installée. On rejoint donc en collant le lien d'invitation dans l'appli installée.
