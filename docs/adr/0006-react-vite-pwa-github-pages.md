# Appli web React + TypeScript (Vite), hébergée sur GitHub Pages

L'appli est une appli web installable (PWA) écrite en React + TypeScript avec Vite, et testée avec Vitest. Elle est hébergée gratuitement sur GitHub Pages depuis le dépôt public de la membre, qui la publie à chaque modification. L'APK Android (étape 3) emballera la même appli avec Capacitor, pour pouvoir programmer des notifications locales (ADR-0004).

## Consequences

- Le dépôt est public : il ne contient que le code, jamais l'adresse du script ni le code secret, qui restent sur les téléphones.
- Les polices sont embarquées dans l'appli, qui fonctionne donc hors ligne après le premier chargement.
