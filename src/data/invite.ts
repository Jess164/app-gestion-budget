import type { MemberKey } from '../domain/types';
import { fromBase64Url, toBase64Url } from './ids';

export interface Invite {
  url: string;
  code: string;
  who: MemberKey;
}

const KEY = 'rejoindre';

/** Adresse d'un script Google déployé en application web. */
export function isScriptUrl(url: string): boolean {
  return /^https:\/\/script\.google\.com\/(a\/macros\/[^/]+|macros)\/s\/[\w-]+\/exec$/.test(url.trim());
}

export function inviteLink(base: string, inv: Invite): string {
  const payload = toBase64Url(unescape(encodeURIComponent(JSON.stringify({ u: inv.url, c: inv.code, w: inv.who }))));
  return `${base.split('#')[0]}#${KEY}=${payload}`;
}

/** Lit un lien d'invitation complet, ou seulement sa partie après « #rejoindre= ». Renvoie null s'il est invalide. */
export function parseInvite(text: string): Invite | null {
  const t = text.trim();
  const m = new RegExp(`${KEY}=([A-Za-z0-9_-]+)`).exec(t);
  const payload = m ? m[1] : /^[A-Za-z0-9_-]{40,}$/.test(t) ? t : null;
  if (!payload) return null;
  try {
    const o = JSON.parse(decodeURIComponent(escape(fromBase64Url(payload))));
    if (typeof o.u !== 'string' || !isScriptUrl(o.u) || typeof o.c !== 'string' || o.c.length < 20) return null;
    return { url: o.u, code: o.c, who: o.w === 'a' ? 'a' : 'b' };
  } catch {
    return null;
  }
}
