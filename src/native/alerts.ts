import { LocalNotifications } from '@capacitor/local-notifications';
import { plannedAlerts, type PlannedAlert } from '../domain/alerts';
import { parse } from '../domain/dates';
import type { MemberKey, Snapshot } from '../domain/types';
import { isNative } from './platform';

const CHANNEL = 'alertes';
/** Alertes déjà programmées ou envoyées : clé → heure prévue (ms). Évite de renvoyer une alerte passée. */
const MEMO_KEY = 'pasdtal-alertes';
const ASKED_KEY = 'pasdtal-alertes-demande';
/** Heure des alertes, le jour prévu. */
const HOUR = 9;

export type Permission = 'granted' | 'denied' | 'prompt' | 'unavailable';

function readMemo(): Record<string, number> {
  try {
    return JSON.parse(localStorage.getItem(MEMO_KEY) || '{}');
  } catch {
    return {};
  }
}
function writeMemo(m: Record<string, number>) {
  try {
    localStorage.setItem(MEMO_KEY, JSON.stringify(m));
  } catch {
    /* rien de grave : au pire une alerte passée est renvoyée une fois */
  }
}

export async function permission(): Promise<Permission> {
  if (!isNative()) return 'unavailable';
  const p = await LocalNotifications.checkPermissions();
  return p.display === 'granted' ? 'granted' : p.display === 'denied' ? 'denied' : 'prompt';
}

export async function askPermission(): Promise<Permission> {
  if (!isNative()) return 'unavailable';
  const p = await LocalNotifications.requestPermissions();
  return p.display === 'granted' ? 'granted' : p.display === 'denied' ? 'denied' : 'prompt';
}

/** À la première ouverture de l'APK, Android demande d'autoriser les notifications. */
export async function askOnce(): Promise<void> {
  if (!isNative()) return;
  try {
    if (localStorage.getItem(ASKED_KEY)) return;
    localStorage.setItem(ASKED_KEY, '1');
  } catch {
    return;
  }
  if ((await permission()) === 'prompt') await askPermission();
}

let channelReady = false;
async function ensureChannel() {
  if (channelReady) return;
  await LocalNotifications.createChannel({
    id: CHANNEL,
    name: 'Alertes de résiliation',
    description: 'Avant la date limite pour résilier un abonnement',
    importance: 4,
    visibility: 1
  });
  channelReady = true;
}

const atNine = (day: string) => {
  const d = parse(day);
  d.setHours(HOUR, 0, 0, 0);
  return d;
};

let queue: Promise<unknown> = Promise.resolve();

/**
 * Reprogramme toutes les alertes d'après les abonnements du moment.
 * Une alerte dont l'heure est passée part tout de suite, une seule fois, tant que la date limite n'est pas dépassée.
 */
export function rescheduleAlerts(s: Snapshot, me: MemberKey, today: string): Promise<unknown> {
  queue = queue.then(() => doReschedule(s, me, today)).catch(() => undefined);
  return queue;
}

async function doReschedule(s: Snapshot, me: MemberKey, today: string) {
  if (!isNative() || (await permission()) !== 'granted') return;
  await ensureChannel();
  const pending = await LocalNotifications.getPending();
  if (pending.notifications.length) {
    await LocalNotifications.cancel({ notifications: pending.notifications.map((n) => ({ id: n.id })) });
  }
  const memo = readMemo();
  const next: Record<string, number> = {};
  const now = Date.now();
  const toSend: Array<{ a: PlannedAlert; at: Date }> = [];
  let soon = 0;
  for (const a of plannedAlerts(s, me, today)) {
    const at = atNine(a.day);
    if (at.getTime() > now + 60_000) {
      toSend.push({ a, at });
      next[a.key] = at.getTime();
    } else if (memo[a.key] !== undefined && memo[a.key] <= now) {
      next[a.key] = memo[a.key]; // déjà partie
    } else {
      // Le jour de l'alerte est passé sans qu'elle parte (appli pas ouverte à temps) : on prévient maintenant.
      toSend.push({ a, at: new Date(now + 5_000 + soon++ * 2_000) });
      next[a.key] = now;
    }
  }
  writeMemo(next);
  if (!toSend.length) return;
  await LocalNotifications.schedule({
    notifications: toSend.map(({ a, at }) => ({
      id: a.id,
      title: a.title,
      body: a.body,
      largeBody: a.body,
      channelId: CHANNEL,
      schedule: { at, allowWhileIdle: true },
      extra: { subId: a.subId }
    }))
  });
}

/** Une notification d'essai, pour vérifier que tout marche. */
export async function testNotification(days: number): Promise<boolean> {
  if ((await permission()) !== 'granted' && (await askPermission()) !== 'granted') return false;
  await ensureChannel();
  await LocalNotifications.schedule({
    notifications: [
      {
        id: 1,
        title: "PasD'Tal' : les alertes marchent",
        body: `Tu seras prévenue ${days} jour${days > 1 ? 's' : ''} avant chaque date limite de résiliation, à ${HOUR} h.`,
        channelId: CHANNEL,
        schedule: { at: new Date(Date.now() + 3_000), allowWhileIdle: true }
      }
    ]
  });
  return true;
}

/** Les prochaines alertes, pour les montrer dans Paramètres. */
export function upcoming(s: Snapshot, me: MemberKey, today: string, max = 5): PlannedAlert[] {
  return plannedAlerts(s, me, today)
    .filter((a) => a.day >= today)
    .slice(0, max);
}
