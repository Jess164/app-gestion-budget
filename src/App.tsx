import { useEffect, useLayoutEffect, useState, type ReactElement } from 'react';
import { todayISO } from './domain/dates';
import type { ExpenseRec, MemberKey, SubscriptionRec } from './domain/types';
import { parseInvite } from './data/invite';
import { useStore, type Store } from './data/store';
import { Budget } from './screens/Budget';
import { Calculator } from './screens/Calculator';
import { Commun } from './screens/Commun';
import { ExpenseForm, type ExpenseKind } from './screens/ExpenseForm';
import { Invite } from './screens/Invite';
import { Settings } from './screens/Settings';
import { Setup } from './screens/Setup';
import { SubscriptionForm } from './screens/SubscriptionForm';
import { Subscriptions } from './screens/Subscriptions';
import { IconCal, IconCalc, IconChart, IconPeople, IconPlus } from './ui/icons';
import { toast } from './ui/kit';

type Tab = 'budget' | 'commun' | 'abos' | 'calc';
type Sub =
  | { name: 'expense'; existing?: ExpenseRec; amount?: string; kind?: ExpenseKind }
  | { name: 'subscription'; existing?: SubscriptionRec; kind?: ExpenseKind }
  | { name: 'settings' }
  | { name: 'invite'; fresh?: boolean };

const TABS: Array<[Tab, string, () => ReactElement]> = [
  ['budget', 'Budget', IconChart],
  ['commun', 'Commun', IconPeople],
  ['abos', 'Abonnements', IconCal],
  ['calc', 'Calculatrice', IconCalc]
];

const SYNC_EVERY_MS = 3 * 60 * 1000;

function useSystemDark(): boolean {
  const q = () => window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false;
  const [dark, setDark] = useState(q);
  useEffect(() => {
    const mq = window.matchMedia?.('(prefers-color-scheme: dark)');
    const on = () => setDark(mq.matches);
    mq?.addEventListener?.('change', on);
    return () => mq?.removeEventListener?.('change', on);
  }, []);
  return dark;
}

/** Applique le mode clair/sombre choisi, et colore la barre d'état du téléphone. */
function useTheme(store: Store, systemDark: boolean) {
  useLayoutEffect(() => {
    const root = document.documentElement;
    if (store.mode === 'auto') root.removeAttribute('data-theme');
    else root.setAttribute('data-theme', store.mode);
    const bg = getComputedStyle(root).getPropertyValue('--bg').trim();
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', bg || '#E9DFFF');
  }, [store.mode, systemDark]);
}

/** Synchronise à l'ouverture, au retour sur l'appli, toutes les 3 minutes tant qu'elle est à l'écran, et au retour du réseau. */
function useAutoSync(store: Store, enabled: boolean, onDayChange: () => void) {
  useEffect(() => {
    if (!enabled) return;
    void store.syncNow();
    const onVisible = () => {
      if (document.visibilityState === 'visible') {
        onDayChange();
        void store.syncNow();
      }
    };
    const onOnline = () => void store.syncNow();
    const timer = setInterval(() => document.visibilityState === 'visible' && void store.syncNow(), SYNC_EVERY_MS);
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('online', onOnline);
    return () => {
      clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('online', onOnline);
    };
  }, [store, enabled, onDayChange]);
}

function readInviteFromUrl(): string {
  const h = window.location.hash;
  if (!h.includes('rejoindre=')) return '';
  const link = window.location.href;
  history.replaceState(null, '', window.location.pathname + window.location.search);
  return parseInvite(link) ? link : '';
}
const initialInvite = readInviteFromUrl();

export function App() {
  const store = useStore();
  const systemDark = useSystemDark();
  useTheme(store, systemDark);
  const [today, setToday] = useState(todayISO());
  const [tab, setTab] = useState<Tab>('budget');
  const [sub, setSub] = useState<Sub | null>(null);
  const [month, setMonth] = useState(today.slice(0, 7));
  const [viewing, setViewing] = useState<MemberKey | null>(null);
  const configured = !!store.config;
  const [refreshDay] = useState(() => () => setToday(todayISO()));
  useAutoSync(store, configured, refreshDay);

  useEffect(() => {
    if (initialInvite && store.config) toast('Ce téléphone est déjà relié à vos données.');
  }, [store]);
  // Accolades obligatoires : dans les Chrome récents, scrollTo renvoie une promesse, que React prendrait pour une fonction de nettoyage.
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [tab, sub]);

  if (!store.config) {
    return (
      <div className="app">
        <Setup initialInvite={initialInvite} onDone={(fresh) => { setViewing(null); setTab('budget'); setSub(fresh ? { name: 'invite', fresh: true } : null); }} />
      </div>
    );
  }

  const me = store.config.me;
  const who = viewing ?? me;

  if (sub) {
    return (
      <div className="app">
        {sub.name === 'expense' && (
          <ExpenseForm
            existing={sub.existing}
            initialAmount={sub.amount}
            initialKind={sub.kind}
            today={today}
            onDone={(m, kind) => {
              setSub(null);
              if (tab === 'calc') setTab(kind === 'commun' ? 'commun' : 'budget');
              if (tab === 'budget' || tab === 'calc') setViewing(me);
              if (m && m <= today.slice(0, 7)) setMonth(m);
            }}
          />
        )}
        {sub.name === 'subscription' && (
          <SubscriptionForm existing={sub.existing} initialKind={sub.kind} today={today} onDone={() => setSub(null)} />
        )}
        {sub.name === 'settings' && <Settings systemDark={systemDark} onBack={() => setSub(null)} onInvite={() => setSub({ name: 'invite' })} />}
        {sub.name === 'invite' && <Invite fresh={sub.fresh} onBack={() => setSub(null)} />}
      </div>
    );
  }

  const fab =
    tab === 'budget' && who === me ? { label: 'Dépense', open: (): Sub => ({ name: 'expense' }) }
    : tab === 'commun' ? { label: 'Dépense commune', open: (): Sub => ({ name: 'expense', kind: 'commun' }) }
    : tab === 'abos' ? { label: 'Abonnement', open: (): Sub => ({ name: 'subscription' }) }
    : null;

  return (
    <div className="app">
      {tab === 'budget' && (
        <Budget
          month={month}
          setMonth={setMonth}
          viewing={who}
          setViewing={setViewing}
          today={today}
          onEdit={(e) => setSub({ name: 'expense', existing: e })}
          onSettings={() => setSub({ name: 'settings' })}
        />
      )}
      {tab === 'commun' && (
        <Commun
          month={month}
          setMonth={setMonth}
          today={today}
          onEdit={(e) => setSub({ name: 'expense', existing: e })}
          onOpenSub={(x) => setSub({ name: 'subscription', existing: x })}
        />
      )}
      {tab === 'abos' && <Subscriptions today={today} onOpen={(x) => setSub({ name: 'subscription', existing: x })} />}
      {tab === 'calc' && <Calculator onAddExpense={(amount) => setSub({ name: 'expense', amount })} />}
      {fab && (
        <button className="fab" type="button" onClick={() => setSub(fab.open())}>
          <IconPlus />{fab.label}
        </button>
      )}
      <nav className="tabbar" aria-label="Navigation principale">
        {TABS.map(([id, label, Icon]) => (
          <button key={id} className="tab" type="button" aria-current={tab === id ? 'page' : undefined} onClick={() => setTab(id)}>
            <span className="tab-ic"><Icon /></span>{label}
          </button>
        ))}
      </nav>
    </div>
  );
}
