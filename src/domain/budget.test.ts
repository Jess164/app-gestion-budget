import { describe, expect, it } from 'vitest';
import { catState, categoryRows, monthSummary, recentExpenses, shareAmt } from './budget';
import { defaultRecords, catId } from './defaults';
import type { AnyRecord, ExpenseRec, Snapshot } from './types';

function snapshotOf(records: AnyRecord[]): Snapshot {
  const live = records.filter((r) => !r.deleted);
  const members: any = {};
  live.forEach((r) => { if (r.type === 'member') members[r.key] = r; });
  return {
    members,
    prefs: live.find((r) => r.type === 'prefs') as any,
    categories: live.filter((r) => r.type === 'category') as any,
    expenses: live.filter((r) => r.type === 'expense') as any
  };
}

let n = 0;
function exp(owner: ExpenseRec['owner'], date: string, amount: number, cat: string, extra: Partial<ExpenseRec> = {}): ExpenseRec {
  n++;
  return { id: `e${n}`, type: 'expense', owner, date, amount, label: '', cat, createdAt: n, updatedAt: n, by: 'x', ...extra };
}

function base() {
  const recs = defaultRecords('Jess', 'Léa', 'dev', 1);
  const s = snapshotOf(recs);
  s.members.a.plafond = 600;
  s.categories.find((c) => c.id === catId('a', 'courses'))!.plafond = 200;
  s.categories.find((c) => c.id === catId('a', 'restos'))!.plafond = 80;
  s.categories.find((c) => c.id === catId('a', 'abonnements'))!.plafond = 50;
  return s;
}

describe('shareAmt', () => {
  it('donne la moitié arrondie au centime à « a » et le reste à « b »', () => {
    const netflix = { owner: 'commun' as const, amount: 13.49, partA: 0.5 };
    expect(shareAmt('a', netflix)).toBe(6.75);
    expect(shareAmt('b', netflix)).toBe(6.74);
  });
  it('donne tout à la propriétaire pour une dépense perso', () => {
    expect(shareAmt('a', { owner: 'a', amount: 10 })).toBe(10);
    expect(shareAmt('b', { owner: 'a', amount: 10 })).toBe(0);
  });
});

describe('monthSummary', () => {
  it('calcule le reste du mois avec les dépenses perso et la part du commun', () => {
    const s = base();
    s.expenses = [
      exp('a', '2026-10-01', 142.3, catId('a', 'courses')),
      exp('a', '2026-10-03', 86.5, catId('a', 'restos')),
      exp('a', '2026-09-30', 999, catId('a', 'courses')),
      exp('b', '2026-10-02', 50, catId('b', 'courses')),
      exp('commun', '2026-10-05', 13.49, catId('commun', 'abos'), { payer: 'b', partA: 0.5 })
    ];
    const m = monthSummary(s, 'a', '2026-10');
    expect(m.perso).toBeCloseTo(228.8);
    expect(m.commun).toBe(6.75);
    expect(m.reste).toBeCloseTo(600 - 228.8 - 6.75);
  });
  it('ne calcule pas de reste sans plafond', () => {
    const s = base();
    s.members.a.plafond = null;
    expect(monthSummary(s, 'a', '2026-10').reste).toBeNull();
  });
});

describe('catState', () => {
  it('passe à l\'orange au seuil et au rouge au-delà du plafond', () => {
    expect(catState(46.97, 50, 80)).toBe('warn');
    expect(catState(40, 50, 80)).toBe('warn');
    expect(catState(39.99, 50, 80)).toBe('ok');
    expect(catState(50, 50, 80)).toBe('warn');
    expect(catState(50.01, 50, 80)).toBe('over');
    expect(catState(10, null, 80)).toBe('none');
  });
});

describe('categoryRows', () => {
  it('montre les catégories avec plafond ou dépenses, et regroupe les catégories supprimées dans « Autre »', () => {
    const s = base();
    s.expenses = [
      exp('a', '2026-10-03', 86.5, catId('a', 'restos')),
      exp('a', '2026-10-04', 18.4, catId('a', 'sante')),
      exp('a', '2026-10-04', 5, 'cat-supprimee')
    ];
    const rows = categoryRows(s, 'a', '2026-10');
    const names = rows.map((r) => r.cat.name);
    expect(names).toEqual(['Courses', 'Restos & sorties', 'Abonnements', 'Santé & beauté', 'Autre']);
    expect(rows.find((r) => r.cat.name === 'Restos & sorties')!.state).toBe('over');
    expect(rows.find((r) => r.cat.name === 'Santé & beauté')!.state).toBe('none');
  });
});

describe('recentExpenses', () => {
  it('trie par date puis par ordre de saisie, et inclut le commun', () => {
    const s = base();
    const e1 = exp('a', '2026-10-02', 1, 'x');
    const e2 = exp('a', '2026-10-05', 2, 'x');
    const e3 = exp('commun', '2026-10-05', 3, 'x');
    const e4 = exp('b', '2026-10-06', 4, 'x');
    s.expenses = [e1, e2, e3, e4];
    expect(recentExpenses(s, 'a', '2026-10').map((e) => e.id)).toEqual([e3.id, e2.id, e1.id]);
  });
});
