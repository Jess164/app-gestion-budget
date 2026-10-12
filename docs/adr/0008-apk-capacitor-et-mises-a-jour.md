# APK Android avec Capacitor : appli embarquée, clé de signature dans un secret GitHub

L'APK sert surtout aux alertes de résiliation (ADR-0004). On l'obtient avec Capacitor, qui emballe l'appli web dans une appli Android et donne accès aux notifications locales (`@capacitor/local-notifications`). Les fichiers de l'appli sont **dans l'APK** : il s'ouvre sans internet, comme l'appli web. GitHub Actions fabrique l'APK à chaque publication et le dépose sur le site (`pasdtal.apk`), avec un `version.json`. L'APK compare son numéro à celui du site et propose « Nouvelle version de l'appli : Télécharger ».

Pour qu'une nouvelle version s'installe par-dessus l'ancienne (sans perdre le lien avec le script ni la permission des notifications), toutes les versions sont signées avec la même clé. Cette clé est rangée dans le secret `ANDROID_KEYSTORE` du dépôt (le fichier PKCS12 en base64), que GitHub Actions écrit dans `android/app/` au moment de fabriquer l'APK. Elle n'est jamais dans le dépôt.

La toute première clé (APK 1.10) a été publiée dans le dépôt par erreur, puis remplacée : un APK signé avec elle ne peut pas être mis à jour par-dessus, il faut le désinstaller une fois.

Les alertes sont programmées sur le téléphone à chaque ouverture et à chaque synchro : jusqu'à 3 échéances à venir par abonnement, à 9 h le jour prévu. Une alerte dont l'heure est passée sans être partie (appli pas ouverte à temps) part tout de suite, une seule fois, tant que la date limite n'est pas dépassée. Android les reprogramme après un redémarrage.

## Considered Options

- **Charger le site dans l'APK (`server.url`)** : mises à jour automatiques, mais Capacitor le déconseille en production et l'APK ne s'ouvrirait pas sans internet.
- **Clé de signature dans le dépôt** : rien à configurer, mais le dépôt est public et n'importe qui pourrait signer un faux PasD'Tal' installable par-dessus le vrai.
- **Clé différente à chaque fabrication** : chaque mise à jour obligerait à désinstaller l'APK et à relier le téléphone.

## Consequences

- Sans le secret, la publication continue mais sans APK (`version.json` indique `"apk": false`, et `apk-build.txt` explique pourquoi).
- Un secret GitHub ne se relit pas : garder une copie de la clé ailleurs, sinon une nouvelle clé obligera à réinstaller l'APK une fois.
- Si le nom d'utilisateur GitHub change, l'adresse du site change : l'APK suivant la connaîtra (elle est fixée à la fabrication), mais l'ancien APK ne verra plus les mises à jour. Il suffit de télécharger le nouvel APK depuis la nouvelle adresse.
- Les alertes peuvent arriver avec quelques minutes de retard : elles ne demandent pas d'alarme exacte.
