import { monthKey } from './dates';
import { r2 } from './money';
import type { CategoryRec, ExpenseRec, MemberKey, Owner, Snapshot } from './types';

/** Part d'une dépense qui revient à une membre, arrondie au centime. Pour le commun, « b » paie le reste. */
export function shareAmt(member: MemberKey, e: Pick<ExpenseRec, 'owner' | 'amount' | 'partA'>): number {
  if (e.owner !== 'commun') return e.owner === member ? e.amount : 0;
  const a = r2(e.amount * (e.partA ?? 0.5));
  return member === 'a' ? a : r2(e.amount - a);
}

export function categoriesOf(s: Snapshot, owner: Owner): CategoryRec[] {
  return s.categories.filter((c) => c.owner === owner).sort((x, y) => x.order - y.order || x.name.localeCompare(y.name));
}

export function expensesOfMonth(s: Snapshot, month: string): ExpenseRec[] {
  return s.expenses.filter((e) => monthKey(e.date) === month);
}

export interface MonthSummary {
  perso: number;
  commun: number;
  plafond: number | null;
  /** Plafond moins dépenses perso et part du commun ; null sans plafond. */
  reste: number | null;
}

export function monthSummary(s: Snapshot, member: MemberKey, month: string): MonthSummary {
  const list = expensesOfMonth(s, month);
  const perso = list.filter((e) => e.owner === member).reduce((t, e) => t + e.amount, 0);
  const commun = list.filter((e) => e.owner === 'commun').reduce((t, e) => t + shareAmt(member, e), 0);
  const plafond = s.members[member]?.plafond ?? null;
  return { perso, commun, plafond, reste: plafond ? plafond - perso - commun : null };
}

export type CatState = 'none' | 'ok' | 'warn' | 'over';

/** Sans plafond : « none ». Au-delà du plafond : « over ». À partir du seuil (en %) : « warn ». */
export function catState(total: number, plafond: number | null, seuil: number): CatState {
  if (!plafond) return 'none';
  if (total > plafond + 0.004) return 'over';
  if (total >= (plafond * seuil) / 100 - 0.004) return 'warn';
  return 'ok';
}

export interface CategoryRow {
  cat: CategoryRec;
  spent: number;
  state: CatState;
}

/** Les catégories perso d'une membre pour un mois : celles qui ont un plafond ou des dépenses. */
export function categoryRows(s: Snapshot, member: MemberKey, month: string): CategoryRow[] {
  const list = expensesOfMonth(s, month).filter((e) => e.owner === member);
  const cats = categoriesOf(s, member);
  const known = new Set(cats.map((c) => c.id));
  const rows: CategoryRow[] = cats.map((cat) => {
    const spent = list.filter((e) => e.cat === cat.id).reduce((t, e) => t + e.amount, 0);
    return { cat, spent, state: catState(spent, cat.plafond, s.prefs.seuil) };
  });
  // Dépenses dont la catégorie a été supprimée : regroupées dans « Autre ».
  const orphan = list.filter((e) => !known.has(e.cat)).reduce((t, e) => t + e.amount, 0);
  if (orphan > 0) {
    rows.push({ cat: otherCategory(member), spent: orphan, state: 'none' });
  }
  return rows.filter((r) => r.cat.plafond || r.spent > 0);
}

export function otherCategory(owner: Owner): CategoryRec {
  return { id: '__autre', type: 'category', owner, name: 'Autre', color: '#6B7A8F', plafond: null, order: 9999, updatedAt: 0, by: '' };
}

export function findCategory(s: Snapshot, id: string, owner: Owner): CategoryRec {
  return s.categories.find((c) => c.id === id) ?? otherCategory(owner);
}

/** Dépenses à montrer à une membre pour un mois : les siennes et les communes, les plus récentes d'abord. */
export function recentExpenses(s: Snapshot, member: MemberKey, month: string, limit = 50): ExpenseRec[] {
  return expensesOfMonth(s, month)
    .filter((e) => e.owner === member || e.owner === 'commun')
    .sort((x, y) => (x.date === y.date ? y.createdAt - x.createdAt : x.date < y.date ? 1 : -1))
    .slice(0, limit);
}

/** Premier mois où l'on a des dépenses (pour borner la navigation vers le passé). */
export function firstMonth(s: Snapshot, fallback: string): string {
  return s.expenses.reduce((m, e) => (monthKey(e.date) < m ? monthKey(e.date) : m), fallback);
}

export function categoryInUse(s: Snapshot, catId: string): boolean {
  return s.expenses.some((e) => e.cat === catId);
}
