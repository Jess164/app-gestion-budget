/** Arrondi au centime, sans l'erreur des nombres à virgule (6,745 € → 6,75 €). */
export function r2(n: number): number {
  const sign = n < 0 ? -1 : 1;
  return (sign * Math.round(Math.abs(n) * 100 + 1e-6)) / 100;
}

/** « 1 234,50 € » */
export function eur(n: number): string {
  if (Math.abs(n) < 0.005) n = 0;
  return r2(n).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';
}

/** « 200 € » pour un montant rond, sinon comme eur(). */
export function eurShort(n: number): string {
  return n % 1 === 0 ? n.toLocaleString('fr-FR') + ' €' : eur(n);
}

/** Montant pour un champ de saisie : 12.5 → « 12,5 ». */
export function numToInput(v: number): string {
  return String(r2(v)).replace('.', ',');
}

/**
 * Calcule une saisie comme « 12,40+8,90 » ou « 3×2,50 ».
 * Accepte la virgule ou le point, et + − × ÷ (ou - * /). Renvoie NaN si la saisie est invalide.
 */
export function evalExpr(input: string): number {
  const s = String(input ?? '')
    .replace(/[\s  €]/g, '')
    .replace(/×/g, '*')
    .replace(/÷/g, '/')
    .replace(/−/g, '-')
    .replace(/,/g, '.');
  if (!s) return NaN;
  let i = 0;
  const num = (): number => {
    const m = /^(\d+(\.\d*)?|\.\d+)/.exec(s.slice(i));
    if (!m) throw new Error('nombre attendu');
    i += m[0].length;
    return parseFloat(m[0]);
  };
  const factor = (): number => {
    if (s[i] === '-') { i++; return -factor(); }
    if (s[i] === '+') { i++; return factor(); }
    return num();
  };
  const term = (): number => {
    let v = factor();
    while (s[i] === '*' || s[i] === '/') {
      const op = s[i++];
      const r = factor();
      if (op === '/') {
        if (r === 0) throw new Error('division par zéro');
        v /= r;
      } else v *= r;
    }
    return v;
  };
  const expr = (): number => {
    let v = term();
    while (s[i] === '+' || s[i] === '-') {
      const op = s[i++];
      const r = term();
      v = op === '+' ? v + r : v - r;
    }
    return v;
  };
  try {
    const v = expr();
    return i === s.length ? v : NaN;
  } catch {
    return NaN;
  }
}

/** Vrai si la saisie contient un calcul (un opérateur après le premier caractère). */
export function hasOp(input: string): boolean {
  return /[+\-*/×÷−]/.test(String(input ?? '').slice(1));
}

/** Montant positif saisi, ou null. */
export function parseAmount(input: string): number | null {
  const v = evalExpr(input);
  return Number.isFinite(v) && v > 0 ? r2(v) : null;
}
