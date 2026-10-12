import { addDays, dateShort } from './dates';
import { eur } from './money';
import { isActive, occurrence } from './subs';
import type { MemberKey, Snapshot } from './types';

export interface PlannedAlert {
  /** Une alerte par abonnement et par échéance. */
  key: string;
  /** Identifiant numérique demandé par Android. */
  id: number;
  subId: string;
  /** Jour où prévenir (AAAA-MM-JJ). Il peut être déjà passé si l'appli n'a pas été ouverte à temps. */
  day: string;
  /** Date limite de résiliation. */
  deadline: string;
  /** Échéance (prélèvement) que l'alerte permet d'éviter. */
  due: string;
  title: string;
  body: string;
}

/** Nombre d'échéances à venir prévues par abonnement : de quoi tenir des mois sans ouvrir l'appli. */
const HORIZON = 3;

/** Petit hachage stable (FNV-1a) pour faire un identifiant entier positif. */
export function alertId(key: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < key.length; i++) {
    h ^= key.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h & 0x7fffffff) || 1;
}

/**
 * Les alertes à programmer sur le téléphone Android : pour les abonnements de la membre et les communs,
 * le nombre de jours choisi avant chaque date limite de résiliation. La fin d'un essai gratuit est toujours alertée.
 * Les échéances dont la date limite est déjà passée sont ignorées.
 */
export function plannedAlerts(s: Snapshot, me: MemberKey, today: string, horizon = HORIZON): PlannedAlert[] {
  const out: PlannedAlert[] = [];
  for (const sub of s.subscriptions) {
    if (!isActive(sub) || (sub.owner !== me && sub.owner !== 'commun')) continue;
    let found = 0;
    for (let k = 0; k < 600 && found < horizon; k++) {
      const due = occurrence(sub.anchor, sub.freq, k);
      if (due <= today) continue;
      found++;
      const trialEnd = sub.essai && due === sub.anchor;
      if (!sub.alerte && !trialEnd) continue;
      const deadline = addDays(due, -(sub.preavis || 0));
      if (deadline < today) continue;
      const day = addDays(deadline, -Math.max(0, sub.alerteJours));
      const price = eur(sub.amount);
      const key = `${sub.id}|${due}`;
      out.push({
        key,
        id: alertId(key),
        subId: sub.id,
        day,
        deadline,
        due,
        title: trialEnd ? `Fin de l'essai : ${sub.name}` : `Résilier ${sub.name} ?`,
        body: trialEnd
          ? `L'essai gratuit se termine le ${dateShort(due, today)}. Résilie avant le ${dateShort(deadline, today)} pour ne pas payer ${price}.`
          : `Prélèvement de ${price} le ${dateShort(due, today)}. Pour l'éviter, résilie avant le ${dateShort(deadline, today)}.`
      });
    }
  }
  return out.sort((x, y) => (x.day < y.day ? -1 : x.day > y.day ? 1 : 0));
}
