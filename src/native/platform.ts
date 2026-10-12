import { Capacitor } from '@capacitor/core';

/** Vrai dans l'APK Android, faux dans le navigateur. */
export const isNative = () => Capacitor.isNativePlatform();

/** Android dans un navigateur : on propose d'installer l'APK pour les alertes. */
export const isAndroidBrowser = () => !isNative() && /Android/i.test(navigator.userAgent);

/** Adresse publique de l'appli web, avec la barre finale. Vide en développement. */
export const SITE_URL = (() => {
  const u = import.meta.env.VITE_SITE_URL || '';
  return u && !u.endsWith('/') ? `${u}/` : u;
})();

/** Numéro de cette version (celui de la publication GitHub), 0 en développement. */
export const BUILD = Number(import.meta.env.VITE_BUILD || 0);

/** Adresse à mettre dans les liens d'invitation : celle du site, même depuis l'APK. */
export function publicBase(): string {
  return isNative() ? SITE_URL : window.location.href;
}
