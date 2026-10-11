import type { AnyRecord } from '../domain/types';

/** Même règle que le script Google : le plus récent gagne, puis l'identifiant d'appareil le plus grand. */
export function isNewer(a: Pick<AnyRecord, 'updatedAt' | 'by'>, b: Pick<AnyRecord, 'updatedAt' | 'by'>): boolean {
  return a.updatedAt > b.updatedAt || (a.updatedAt === b.updatedAt && String(a.by) > String(b.by));
}

export interface LocalData {
  /** Dernière révision reçue du script Google. */
  rev: number;
  records: Record<string, AnyRecord>;
  /** Enregistrements modifiés ici et pas encore envoyés : id → updatedAt de la modification. */
  pending: Record<string, number>;
}

/**
 * Intègre la réponse du script Google.
 * sent : ce qui a été envoyé (id → updatedAt). Un envoi est confirmé si l'enregistrement n'a pas rechangé depuis.
 */
export function applyServerResponse(local: LocalData, rev: number, incoming: AnyRecord[], sent: Record<string, number>): LocalData {
  const records = { ...local.records };
  for (const r of incoming) {
    const cur = records[r.id];
    if (!cur || isNewer(r, cur) || (r.updatedAt === cur.updatedAt && r.by === cur.by)) records[r.id] = r;
  }
  const pending = { ...local.pending };
  for (const id of Object.keys(sent)) {
    if (pending[id] === sent[id]) delete pending[id];
  }
  return { rev: Math.max(local.rev, rev), records, pending };
}
