import type { AnyRecord, Snapshot } from './types';

/** Pour les tests : range une liste d'enregistrements comme le fait le store. */
export function snapshotOf(records: AnyRecord[]): Snapshot {
  const live = records.filter((r) => !r.deleted);
  const members: any = {};
  live.forEach((r) => { if (r.type === 'member') members[r.key] = r; });
  return {
    members,
    prefs: live.find((r) => r.type === 'prefs') as any,
    categories: live.filter((r) => r.type === 'category') as any,
    expenses: live.filter((r) => r.type === 'expense') as any,
    subscriptions: live.filter((r) => r.type === 'subscription') as any,
    settlements: live.filter((r) => r.type === 'settlement') as any
  };
}
