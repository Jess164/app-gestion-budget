import { BUILD, SITE_URL, isNative } from './platform';

export interface RemoteVersion {
  build: number;
  apk: boolean;
}

/** Dans l'APK : regarde sur le site si une version plus récente de l'APK est publiée. */
export async function checkApkUpdate(): Promise<RemoteVersion | null> {
  if (!isNative() || !SITE_URL || !BUILD) return null;
  try {
    const res = await fetch(`${SITE_URL}version.json`, { cache: 'no-store' });
    if (!res.ok) return null;
    const v = (await res.json()) as RemoteVersion;
    return v.apk && v.build > BUILD ? v : null;
  } catch {
    return null;
  }
}

export const apkUrl = () => `${SITE_URL || './'}pasdtal.apk`;
