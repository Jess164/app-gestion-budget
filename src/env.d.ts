interface ImportMetaEnv {
  /** Adresse publique de l'appli web, donnée par la publication GitHub (liens d'invitation et mise à jour de l'APK). */
  readonly VITE_SITE_URL?: string;
  /** Numéro de la publication GitHub. */
  readonly VITE_BUILD?: string;
}
interface ImportMeta {
  readonly env: ImportMetaEnv;
}
