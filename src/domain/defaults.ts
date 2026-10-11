import type { AnyRecord, CategoryRec, MemberKey, MemberRec, Owner, PrefsRec } from './types';

/** Couleurs proposées pour les catégories. Aucune n'est orange ni rouge : ces couleurs signalent le plafond. */
export const PALETTE = ['#4D7CFE', '#7FD3FF', '#22C3B0', '#3DDC97', '#B5E550', '#FFD23F', '#FF6FB5', '#9B7BF2', '#C8A27A', '#6B7A8F'];

const PERSO: Array<[string, string, string, number | null]> = [
  ['courses', 'Courses', '#4D7CFE', null],
  ['restos', 'Restos & sorties', '#FFD23F', null],
  ['abonnements', 'Abonnements', '#22C3B0', null],
  ['shopping', 'Shopping', '#FF6FB5', null],
  ['loisirs', 'Loisirs', '#3DDC97', null],
  ['sante', 'Santé & beauté', '#7FD3FF', null],
  ['maison', 'Maison', '#C8A27A', null],
  ['transport', 'Transports', '#6B7A8F', null]
];

const COMMUN: Array<[string, string, string]> = [
  ['courses', 'Courses communes', '#4D7CFE'],
  ['cadeaux', 'Cadeaux', '#FF6FB5'],
  ['sorties', 'Sorties', '#FFD23F'],
  ['abos', 'Abonnements communs', '#22C3B0'],
  ['maison', 'Maison', '#C8A27A']
];

export const catId = (owner: Owner, slug: string) => `cat-${owner}-${slug}`;

/** Les enregistrements de départ, créés par la première membre au moment de la configuration. */
export function defaultRecords(nameA: string, nameB: string, device: string, now: number): AnyRecord[] {
  const base = { updatedAt: now, by: device };
  const member = (key: MemberKey, name: string): MemberRec => ({ ...base, id: `member-${key}`, type: 'member', key, name, plafond: null });
  const prefs: PrefsRec = { ...base, id: 'prefs', type: 'prefs', seuil: 80, alerteJours: 3 };
  const cats: CategoryRec[] = [];
  (['a', 'b'] as MemberKey[]).forEach((owner) =>
    PERSO.forEach(([slug, name, color, plafond], i) =>
      cats.push({ ...base, id: catId(owner, slug), type: 'category', owner, name, color, plafond, order: i })
    )
  );
  COMMUN.forEach(([slug, name, color], i) =>
    cats.push({ ...base, id: catId('commun', slug), type: 'category', owner: 'commun', name, color, plafond: null, order: i })
  );
  return [member('a', nameA), member('b', nameB), prefs, ...cats];
}
