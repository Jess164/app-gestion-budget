import { addDays, addMonths, daysBetween, monthKey, parse } from './dates';
import { shareAmt } from './budget';
import type { ExpenseRec, Freq, MemberKey, Owner, Snapshot, SubscriptionRec } from './types';

export const FREQ: Record<Freq, { label: string; short: string; per: string; name: string; perMonth: number }> = {
  semaine: { label: 'Semaine', short: 'Semaine', per: '/sem.', name: 'Hebdomadaire', perMonth: 52 / 12 },
  mois: { label: 'Mois', short: 'Mois', per: '/mois', name: 'Mensuel', perMonth: 1 },
  trimestre: { label: 'Trimestre', short: 'Trim.', per: '/trim.', name: 'Trimestriel', perMonth: 1 / 3 },
  an: { label: 'An', short: 'An', per: '/an', name: 'Annuel', perMonth: 1 / 12 }
};

/** Garde-fou : au-delà, on arrête de compter les échéances (10 ans d'abonnement hebdomadaire). */
const MAX_STEPS = 600;

/** La k-ième échéance après l'échéance saisie. Calculée depuis celle-ci, pour garder le jour (31 → 28 févr. → 31 mars). */
export function occurrence(anchor: string, freq: Freq, k: number): string {
  if (freq === 'semaine') return addDays(anchor, 7 * k);
  return addMonths(anchor, k * (freq === 'mois' ? 1 : freq === 'trimestre' ? 3 : 12));
}

/** Prochaine échéance strictement après aujourd'hui : celle d'aujourd'hui est déjà prélevée. */
export function nextDue(sub: Pick<SubscriptionRec, 'anchor' | 'freq'>, today: string): string {
  for (let k = 0; k < MAX_STEPS; k++) {
    const d = occurrence(sub.anchor, sub.freq, k);
    if (d > today) return d;
  }
  return sub.anchor;
}

/** Dernier jour pour résilier sans payer la prochaine échéance. */
export function deadline(sub: Pick<SubscriptionRec, 'anchor' | 'freq' | 'preavis'>, today: string): string {
  return addDays(nextDue(sub, today), -(sub.preavis || 0));
}

export const isActive = (sub: SubscriptionRec) => !sub.resilieLe;
export const inTrial = (sub: Pick<SubscriptionRec, 'essai' | 'anchor'>, today: string) => sub.essai && sub.anchor > today;
export const monthlyEq = (sub: Pick<SubscriptionRec, 'amount' | 'freq'>) => sub.amount * FREQ[sub.freq].perMonth;

/** Fraction d'un abonnement qui revient à une membre : 1 pour le sien, sa part pour un commun, 0 sinon. */
export function shareFraction(member: MemberKey, it: { owner: Owner; partA?: number }): number {
  if (it.owner !== 'commun') return it.owner === member ? 1 : 0;
  const a = it.partA ?? 0.5;
  return member === 'a' ? a : 1 - a;
}

/** Premier jour du mois où l'abonnement a été créé : on ne rajoute pas de dépenses plus anciennes. */
function firstCountedDay(sub: SubscriptionRec): string {
  const d = new Date(sub.createdAt);
  const m = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
  return sub.anchor > m ? sub.anchor : m;
}

/** Échéances déjà passées (aujourd'hui compris) qui doivent avoir leur dépense. */
export function dueDates(sub: SubscriptionRec, today: string): string[] {
  const out: string[] = [];
  const from = firstCountedDay(sub);
  for (let k = 0; k < MAX_STEPS; k++) {
    const d = occurrence(sub.anchor, sub.freq, k);
    if (d > today) break;
    if (sub.resilieLe && d >= sub.resilieLe) break;
    if (d >= from) out.push(d);
  }
  return out;
}

/** Identifiant fixe de la dépense d'une échéance : les deux téléphones fabriquent la même, sans doublon. */
export const autoExpenseId = (subId: string, date: string) => `auto-${subId}-${date}`;

/** Écart en jours en dessous duquel deux prélèvements d'un même abonnement sont la même échéance. */
const SAME_PERIOD: Record<Freq, number> = { semaine: 4, mois: 15, trimestre: 45, an: 180 };

/**
 * Les dépenses que les abonnements doivent avoir ajoutées d'ici aujourd'hui.
 * Leur date de modification est le jour de l'échéance : une vraie modification, ou une suppression, l'emporte toujours.
 * existing : les dépenses d'abonnement déjà connues, supprimées comprises. Si l'échéance a été décalée de quelques jours,
 * celle de la même période compte déjà : on n'en rajoute pas une deuxième.
 */
export function dueAutoExpenses(
  subs: SubscriptionRec[],
  today: string,
  existing: Array<{ subId?: string; date: string }> = []
): Array<Omit<ExpenseRec, 'by'>> {
  const out: Array<Omit<ExpenseRec, 'by'>> = [];
  for (const sub of subs) {
    if (sub.amount <= 0) continue;
    const known = existing.filter((e) => e.subId === sub.id).map((e) => e.date);
    for (const date of dueDates(sub, today)) {
      if (known.some((d) => d !== date && Math.abs(daysBetween(d, date)) < SAME_PERIOD[sub.freq])) continue;
      const at = parse(date).getTime();
      out.push({
        id: autoExpenseId(sub.id, date),
        type: 'expense',
        owner: sub.owner,
        date,
        amount: sub.amount,
        label: sub.name,
        cat: sub.cat,
        ...(sub.owner === 'commun' ? { payer: sub.payer ?? 'a', partA: sub.partA ?? 0.5 } : {}),
        subId: sub.id,
        createdAt: at,
        updatedAt: at
      });
    }
  }
  return out;
}

export interface Prevu {
  sub: SubscriptionRec;
  date: string;
  /** La part de la membre. */
  amount: number;
}

/** Prélèvements attendus plus tard dans le mois en cours (la fin d'un essai gratuit comprise). */
export function prevus(s: Snapshot, member: MemberKey, month: string, today: string): Prevu[] {
  if (month !== monthKey(today)) return [];
  const out: Prevu[] = [];
  for (const sub of s.subscriptions) {
    if (!isActive(sub) || !shareFraction(member, sub)) continue;
    for (let k = 0; k < MAX_STEPS; k++) {
      const d = occurrence(sub.anchor, sub.freq, k);
      if (monthKey(d) > month) break;
      if (d > today) out.push({ sub, date: d, amount: shareAmt(member, sub) });
    }
  }
  return out;
}

/** Coût mensuel des abonnements d'une membre, sa part du commun comprise, sans les essais gratuits en cours. */
export function monthlyTotal(s: Snapshot, member: MemberKey, today: string): number {
  return s.subscriptions
    .filter((sub) => isActive(sub) && !inTrial(sub, today))
    .reduce((t, sub) => t + monthlyEq(sub) * shareFraction(member, sub), 0);
}

/** Abonnements à montrer, triés par date limite de résiliation. */
export function sortByDeadline(subs: SubscriptionRec[], today: string): SubscriptionRec[] {
  return [...subs].sort((x, y) => {
    const dx = deadline(x, today);
    const dy = deadline(y, today);
    return dx === dy ? x.name.localeCompare(y.name) : dx < dy ? -1 : 1;
  });
}
