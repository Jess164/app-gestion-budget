---
status: accès modifié par l'ADR-0005 (le fichier reste dans le Drive, mais on y accède par un script Google)
---

# Données dans un fichier partagé sur Google Drive, sans base de données

La membre refuse une base de données externe, mais les deux membres doivent se partager les données entre Android et iPhone. Chaque téléphone garde donc sa copie locale, et la synchronise avec un seul fichier rangé dans le Google Drive de la membre, partagé avec sa sœur. Les deux membres ont un compte Google.

## Considered Options

- **Supabase** (ADR-0002) : rejeté, c'est une base de données externe.
- **Fichier à s'envoyer à la main** : rejeté, le partage n'est pas en direct et le commun risque de diverger.
- **Tout en local, chacune pour soi** : rejeté, ce choix supprime le commun et le solde.

## Consequences

- L'appli ne demande accès qu'à ses propres fichiers Drive. La sœur doit donc choisir une fois le fichier partagé dans le sélecteur de Google.
- Il faut une mise en place unique d'un projet Google gratuit (identifiant OAuth), faite par la membre.
- La synchronisation a lieu quand l'appli est ouverte et en ligne. En cas de modification simultanée, la dernière modification l'emporte.
- À tester en premier : la connexion Google depuis l'appli web installée sur l'iPhone.
