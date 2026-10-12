import { useSyncExternalStore } from 'react';
import { todayISO } from '../domain/dates';
import { defaultRecords } from '../domain/defaults';
import { dueAutoExpenses } from '../domain/subs';
import type { AnyRecord, CategoryRec, ExpenseRec, MemberKey, MemberRec, PrefsRec, SettlementRec, Snapshot, SubscriptionRec } from '../domain/types';
import { newId, newSecret } from './ids';
import type { Invite } from './invite';
import { applyServerResponse, type LocalData } from './merge';

export type ThemeMode = 'auto' | 'light' | 'dark';

export interface Config {
  /** Adresse du script Google (…/exec). */
  url: string;
  code: string;
  /** La membre qui utilise ce téléphone. */
  me: MemberKey;
}

export type SyncStatus = 'idle' | 'syncing' | 'ok' | 'offline' | 'error';
export interface SyncState {
  status: SyncStatus;
  lastOk: number | null;
  message: string | null;
}

const KEYS = { config: 'pasdtal-config', data: 'pasdtal-donnees', mode: 'pasdtal-apparence', device: 'pasdtal-appareil' };
const EMPTY: LocalData = { rev: 0, records: {}, pending: {} };

function read<T>(key: string, fallback: T): T {
  try {
    const v = localStorage.getItem(key);
    return v ? (JSON.parse(v) as T) : fallback;
  } catch {
    return fallback;
  }
}
function write(key: string, value: unknown) {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* stockage plein ou bloqué : les données restent en mémoire et partiront à la prochaine synchro */
  }
}

/** Erreur renvoyée par le script Google, avec un message prêt à afficher. */
export class ScriptError extends Error {
  constructor(public code: string, message: string) {
    super(message);
  }
}

const MESSAGES: Record<string, string> = {
  bad_code: "Le code secret ne correspond plus. Rejoins l'appli avec un nouveau lien d'invitation.",
  already_initialized: "Ce script est déjà configuré. Pour ajouter ce téléphone, utilise le lien d'invitation : sur l'autre téléphone, Paramètres puis « Inviter ma sœur ».",
  bad_request: 'Le script Google n\'a pas compris la demande.',
  unknown_action: 'Le script Google n\'est pas à jour. Recopie la dernière version du script.',
  network: 'Impossible de joindre le script Google. Vérifie ta connexion.',
  not_script: 'Le script ne répond pas comme prévu. Vérifie qu\'il est déployé en « Application Web » avec l\'accès « Tout le monde ».'
};

async function request(url: string, init?: RequestInit): Promise<any> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 25000);
  let res: Response;
  try {
    res = await fetch(url, { ...init, signal: ctrl.signal, redirect: 'follow' });
  } catch {
    throw new ScriptError('network', MESSAGES.network);
  } finally {
    clearTimeout(timer);
  }
  let body: any;
  try {
    body = await res.json();
  } catch {
    throw new ScriptError('not_script', MESSAGES.not_script);
  }
  return body;
}

export async function pingScript(url: string): Promise<{ initialized: boolean }> {
  const body = await request(url);
  if (!body || body.app !== "PasD'Tal'") throw new ScriptError('not_script', MESSAGES.not_script);
  return { initialized: !!body.initialized };
}

async function post(url: string, payload: unknown): Promise<{ rev: number; records: AnyRecord[] }> {
  const body = await request(url, {
    method: 'POST',
    // text/plain évite la requête préalable CORS que le script Google ne sait pas traiter.
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify(payload)
  });
  if (!body || body.ok !== true) {
    const code = (body && body.error) || 'not_script';
    throw new ScriptError(code, MESSAGES[code] || MESSAGES.not_script);
  }
  return body;
}

const DEFAULT_PREFS: PrefsRec = { id: 'prefs', type: 'prefs', seuil: 80, alerteJours: 3, updatedAt: 0, by: '' };
const defaultMember = (key: MemberKey): MemberRec => ({ id: `member-${key}`, type: 'member', key, name: key === 'a' ? 'Toi' : 'Ta sœur', plafond: null, updatedAt: 0, by: '' });

export class Store {
  config: Config | null = read<Config | null>(KEYS.config, null);
  data: LocalData = read<LocalData>(KEYS.data, EMPTY);
  mode: ThemeMode = read<ThemeMode>(KEYS.mode, 'auto');
  sync: SyncState = { status: 'idle', lastOk: null, message: null };
  readonly device: string;

  private version = 0;
  private listeners = new Set<() => void>();
  private snap: Snapshot | null = null;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private inflight: Promise<void> | null = null;
  private again = false;

  constructor() {
    let d = read<string | null>(KEYS.device, null);
    if (!d) {
      d = newId('tel');
      write(KEYS.device, d);
    }
    this.device = d;
  }

  subscribe = (fn: () => void) => {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  };
  getVersion = () => this.version;

  private emit() {
    this.version++;
    this.snap = null;
    this.listeners.forEach((f) => f());
  }
  private persist() {
    write(KEYS.data, this.data);
  }

  get pendingCount(): number {
    return Object.keys(this.data.pending).length;
  }

  snapshot(): Snapshot {
    if (this.snap) return this.snap;
    const live = Object.values(this.data.records).filter((r) => !r.deleted);
    const members: Record<MemberKey, MemberRec> = { a: defaultMember('a'), b: defaultMember('b') };
    let prefs = DEFAULT_PREFS;
    const categories: CategoryRec[] = [];
    const expenses: ExpenseRec[] = [];
    const subscriptions: SubscriptionRec[] = [];
    const settlements: SettlementRec[] = [];
    const envExpenses: ExpenseRec[] = [];
    const envSubs: SubscriptionRec[] = [];
    for (const r of live) {
      if (r.type === 'member') members[r.key] = r;
      else if (r.type === 'prefs') prefs = r;
      else if (r.type === 'category') categories.push(r);
      else if (r.type === 'expense') (r.envisage ? envExpenses : expenses).push(r);
      else if (r.type === 'subscription') (r.envisage ? envSubs : subscriptions).push(r);
      else if (r.type === 'settlement') settlements.push(r);
    }
    this.snap = { members, prefs, categories, expenses, subscriptions, settlements, envExpenses, envSubs };
    return this.snap;
  }

  /** Enregistre une création ou une modification, puis lance la synchro peu après. */
  put<T extends AnyRecord>(rec: Omit<T, 'updatedAt' | 'by'> & Partial<Pick<T, 'updatedAt' | 'by'>>): T {
    const prev = this.data.records[rec.id];
    const full = { ...rec, updatedAt: Math.max(Date.now(), (prev?.updatedAt ?? 0) + 1), by: this.device } as unknown as T;
    delete (full as AnyRecord).rev;
    this.data = {
      ...this.data,
      records: { ...this.data.records, [full.id]: full },
      pending: { ...this.data.pending, [full.id]: full.updatedAt }
    };
    this.persist();
    this.emit();
    this.schedule(1500);
    return full;
  }

  /**
   * Ajoute les dépenses des échéances d'abonnement passées qui n'existent pas encore.
   * Chaque échéance a un identifiant fixe : si l'autre téléphone l'a déjà ajoutée, ou si elle a été supprimée, on n'y touche pas.
   */
  materialize(today: string = todayISO()): number {
    if (!this.config) return 0;
    const known = Object.values(this.data.records).filter((r): r is ExpenseRec => r.type === 'expense' && !!r.subId);
    const due = dueAutoExpenses(this.snapshot().subscriptions, today, known).filter((e) => !this.data.records[e.id]);
    if (!due.length) return 0;
    const records = { ...this.data.records };
    const pending = { ...this.data.pending };
    for (const e of due) {
      records[e.id] = { ...e, by: this.device } as ExpenseRec;
      pending[e.id] = e.updatedAt;
    }
    this.data = { ...this.data, records, pending };
    this.persist();
    this.emit();
    this.schedule(1500);
    return due.length;
  }

  remove(id: string) {
    const prev = this.data.records[id];
    if (prev) this.put({ ...prev, deleted: true });
  }

  setMode(mode: ThemeMode) {
    this.mode = mode;
    write(KEYS.mode, mode);
    this.emit();
  }

  /** Première configuration, sur le téléphone de la membre qui a installé le script Google. */
  async setupNew(url: string, nameA: string, nameB: string) {
    const { initialized } = await pingScript(url);
    if (initialized) throw new ScriptError('already_initialized', MESSAGES.already_initialized);
    const code = newSecret();
    const records = defaultRecords(nameA, nameB, this.device, Date.now());
    const res = await post(url, { action: 'init', code, device: this.device, changes: records });
    this.data = applyServerResponse(EMPTY, res.rev, res.records, {});
    this.config = { url, code, me: 'a' };
    write(KEYS.config, this.config);
    this.persist();
    this.sync = { status: 'ok', lastOk: Date.now(), message: null };
    this.emit();
  }

  /** Rejoindre avec un lien d'invitation : récupère les données. La membre choisit ensuite qui elle est. */
  async fetchForJoin(inv: Invite): Promise<Snapshot> {
    const res = await post(inv.url, { action: 'sync', code: inv.code, since: 0, device: this.device, changes: [] });
    this.data = applyServerResponse(EMPTY, res.rev, res.records, {});
    this.persist();
    this.emit();
    return this.snapshot();
  }

  finishJoin(inv: Invite, me: MemberKey) {
    this.config = { url: inv.url, code: inv.code, me };
    write(KEYS.config, this.config);
    this.sync = { status: 'ok', lastOk: Date.now(), message: null };
    this.emit();
  }

  /** Oublie ce téléphone : configuration et données locales. Les données restent dans le Drive. */
  forget() {
    this.config = null;
    this.data = EMPTY;
    write(KEYS.config, null);
    write(KEYS.data, null);
    this.sync = { status: 'idle', lastOk: null, message: null };
    this.emit();
  }

  schedule(delay: number) {
    if (this.timer) clearTimeout(this.timer);
    this.timer = setTimeout(() => {
      this.timer = null;
      void this.syncNow();
    }, delay);
  }

  /** Envoie les changements en attente et récupère ceux de l'autre téléphone. */
  syncNow(): Promise<void> {
    if (!this.config) return Promise.resolve();
    if (this.inflight) {
      this.again = true;
      return this.inflight;
    }
    const { url, code } = this.config;
    const sent: Record<string, number> = { ...this.data.pending };
    const changes = Object.keys(sent).map((id) => this.data.records[id]).filter(Boolean);
    this.sync = { ...this.sync, status: 'syncing' };
    this.emit();
    this.inflight = post(url, { action: 'sync', code, since: this.data.rev, device: this.device, changes })
      .then((res) => {
        this.data = applyServerResponse(this.data, res.rev, res.records, sent);
        this.persist();
        this.sync = { status: 'ok', lastOk: Date.now(), message: null };
      })
      .catch((e: unknown) => {
        const err = e instanceof ScriptError ? e : new ScriptError('network', MESSAGES.network);
        const offline = err.code === 'network';
        this.sync = { ...this.sync, status: offline ? 'offline' : 'error', message: offline ? null : err.message };
      })
      .finally(() => {
        this.inflight = null;
        // Après la synchro (réussie ou non), pour tenir compte des abonnements ajoutés ou résiliés par l'autre téléphone.
        this.materialize();
        this.emit();
        if (this.again) {
          this.again = false;
          this.schedule(300);
        }
      });
    return this.inflight;
  }
}

export const store = new Store();

/** Relit l'écran à chaque changement du store. */
export function useStore(): Store {
  useSyncExternalStore(store.subscribe, store.getVersion);
  return store;
}
