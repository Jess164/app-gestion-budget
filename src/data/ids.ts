function randomBytes(n: number): Uint8Array {
  const b = new Uint8Array(n);
  crypto.getRandomValues(b);
  return b;
}

/** Identifiant court et unique, par exemple « exp-k3j9x2m1q8ab ». */
export function newId(prefix: string): string {
  const alphabet = '0123456789abcdefghijklmnopqrstuvwxyz';
  return prefix + '-' + Array.from(randomBytes(12), (x) => alphabet[x % 36]).join('');
}

/** Code secret partagé avec le script Google : 32 octets aléatoires en base64 URL. */
export function newSecret(): string {
  return toBase64Url(String.fromCharCode(...randomBytes(32)));
}

export function toBase64Url(binary: string): string {
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function fromBase64Url(s: string): string {
  const b = s.replace(/-/g, '+').replace(/_/g, '/');
  return atob(b + '='.repeat((4 - (b.length % 4)) % 4));
}
