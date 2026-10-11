import { categoryRows, findCategory, firstMonth, monthSummary, recentExpenses, shareAmt, type CategoryRow, type MonthSummary } from '../domain/budget';
import { dateShort, monthLabel, shiftMonth, timeShort } from '../domain/dates';
import { eur, eurShort } from '../domain/money';
import { other, type ExpenseRec, type MemberKey, type Snapshot } from '../domain/types';
import { useStore, type Store } from '../data/store';
import { IconCloud, IconCloudOff, IconGear, IconLeft, IconRefresh, IconRight } from '../ui/icons';
import { Seg } from '../ui/kit';

export function SyncLine({ store }: { store: Store }) {
  const s = store.sync;
  const pending = store.pendingCount;
  if (s.status === 'syncing') return <p className="sync-line"><IconCloud />Synchronisation…</p>;
  if (s.status === 'error') return <p className="sync-line is-error">{s.message}</p>;
  if (s.status === 'offline') {
    return <p className="sync-line"><IconCloudOff />Hors ligne{pending ? ` · ${pending} changement${pending > 1 ? 's' : ''} en attente` : ''}</p>;
  }
  if (s.lastOk) return <p className="sync-line"><IconCloud />Synchronisé à {timeShort(s.lastOk)}</p>;
  return <p className="sync-line" />;
}

export function RefreshButton({ store }: { store: Store }) {
  const busy = store.sync.status === 'syncing';
  return (
    <button className={'icon-btn' + (busy ? ' spin' : '')} type="button" onClick={() => void store.syncNow()} aria-label="Mettre à jour">
      <IconRefresh />
    </button>
  );
}

export function Budget(props: {
  month: string;
  setMonth: (m: string) => void;
  viewing: MemberKey;
  setViewing: (m: MemberKey) => void;
  today: string;
  onEdit: (e: ExpenseRec) => void;
  onSettings: () => void;
}) {
  const store = useStore();
  const s = store.snapshot();
  const me = store.config!.me;
  const who = props.viewing;
  const ro = who !== me;
  const cur = props.today.slice(0, 7);
  const min = firstMonth(s, cur);
  const sum = monthSummary(s, who, props.month);
  const rows = categoryRows(s, who, props.month);
  const recent = recentExpenses(s, who, props.month, 30);
  return (
    <main className="screen">
      <header className="head">
        <h1 className="title-hand"><span className="hl">{monthLabel(props.month)}</span></h1>
        <div className="head-actions">
          <RefreshButton store={store} />
          <button className="icon-btn" type="button" onClick={props.onSettings} aria-label="Paramètres"><IconGear /></button>
        </div>
      </header>
      <div className="row-between">
        <Seg<MemberKey> items={[[me, 'Toi'], [other(me), s.members[other(me)].name]]} value={who} onChange={props.setViewing} label="Budget de" />
        <div className="month-nav">
          <button className="icon-btn" type="button" aria-label="Mois précédent" disabled={props.month <= min} onClick={() => props.setMonth(shiftMonth(props.month, -1))}><IconLeft /></button>
          <button className="icon-btn" type="button" aria-label="Mois suivant" disabled={props.month >= cur} onClick={() => props.setMonth(shiftMonth(props.month, 1))}><IconRight /></button>
        </div>
      </div>
      <SyncLine store={store} />
      {ro && <p className="pill-note">Budget de {s.members[who].name} · lecture seule</p>}
      <ResteCard sum={sum} poss={ro ? 'sa' : 'ta'} />
      <CategoryCard rows={rows} seuil={s.prefs.seuil} />
      <section className="card" aria-label="Dernières dépenses">
        <h2>Dernières dépenses</h2>
        <div className="list">
          {recent.length === 0 && <p className="empty">Aucune dépense ce mois-ci.{!ro && ' Touche « Dépense » pour en ajouter une.'}</p>}
          {recent.map((e) => (
            <ExpenseRow key={e.id} e={e} who={who} s={s} today={props.today} onOpen={!ro && e.owner === me ? () => props.onEdit(e) : undefined} />
          ))}
        </div>
      </section>
    </main>
  );
}

function ResteCard({ sum, poss }: { sum: MonthSummary; poss: string }) {
  if (!sum.plafond || sum.reste === null) {
    return (
      <section className="note" aria-label="Dépensé ce mois">
        <span className="tape" aria-hidden="true" />
        <span className="label">Dépensé ce mois</span>
        <div className="big-row"><span className="big-hand">{eur(sum.perso + sum.commun)}</span></div>
        <span className="muted sm">Pas de plafond du mois. Tu peux en fixer un dans Paramètres.</span>
      </section>
    );
  }
  const pct = (x: number) => Math.max(0, Math.min(100, (x / sum.plafond!) * 100));
  const p1 = pct(sum.perso);
  const p2 = Math.min(pct(sum.commun), 100 - p1);
  const over = sum.reste < -0.004;
  return (
    <section className="note" aria-label="Reste du mois">
      <span className="tape" aria-hidden="true" />
      <span className="label">{over ? 'Plafond du mois dépassé' : 'Reste du mois'}</span>
      <div className="big-row">
        <span className={'big-hand' + (over ? ' is-over' : '')}>{eur(over ? -sum.reste : sum.reste)}</span>
        <span className="muted">{over ? 'de trop sur ' : 'sur '}{eurShort(sum.plafond)}</span>
      </div>
      <div className="dash-bar" aria-hidden="true">
        <i style={{ width: `${p1}%`, background: 'var(--note-perso)' }} />
        <i style={{ width: `${p2}%`, background: 'var(--note-commun)' }} />
      </div>
      <div className="legend">
        <span><i style={{ background: 'var(--note-perso)' }} />{eur(sum.perso)} perso</span>
        {sum.commun > 0 && <span><i style={{ background: 'var(--note-commun)' }} />{eur(sum.commun)} {poss} part du commun</span>}
      </div>
    </section>
  );
}

function CategoryCard({ rows, seuil }: { rows: CategoryRow[]; seuil: number }) {
  return (
    <section className="card" aria-label="Par catégorie">
      <h2>Par catégorie</h2>
      {rows.length === 0 && <p className="empty">Aucune dépense ce mois-ci.</p>}
      {rows.map((r) => <CategoryLine key={r.cat.id} row={r} />)}
      <div className="legend-states">
        <span><i style={{ background: 'var(--warn)' }} />Bientôt au plafond ({seuil}&nbsp;%)</span>
        <span><i style={{ background: 'var(--over)' }} />Plafond dépassé</span>
      </div>
    </section>
  );
}

function CategoryLine({ row }: { row: CategoryRow }) {
  const { cat, spent, state } = row;
  const fill = state === 'over' ? 'var(--over)' : state === 'warn' ? 'var(--warn)' : 'var(--c)';
  const w = cat.plafond ? Math.min(100, (spent / cat.plafond) * 100) : 0;
  return (
    <div className="cat" style={{ ['--c' as string]: cat.color, ['--fill' as string]: fill }}>
      <div className="cat-head">
        <span className="cat-name"><i className="sw" aria-hidden="true" /><span>{cat.name}</span></span>
        <span className="cat-amt">
          <b>{eur(spent)}</b> {cat.plafond ? `/ ${eurShort(cat.plafond)}` : <span className="muted sm">sans plafond</span>}
        </span>
      </div>
      {cat.plafond ? (
        <div className="bar" aria-hidden="true"><i className={w > 0 && w < 99.5 ? 'edge' : ''} style={{ width: `${w}%` }} /></div>
      ) : null}
      {state === 'over' && <div className="cat-foot"><span className="badge over">Dépassé de {eur(spent - cat.plafond!)}</span></div>}
      {state === 'warn' && <div className="cat-foot"><span className="badge warn">Plus que {eur(cat.plafond! - spent)}</span></div>}
    </div>
  );
}

function ExpenseRow({ e, who, s, today, onOpen }: { e: ExpenseRec; who: MemberKey; s: Snapshot; today: string; onOpen?: () => void }) {
  const c = findCategory(s, e.cat, e.owner);
  const isC = e.owner === 'commun';
  const inner = (
    <>
      <span className="li-main">
        <span className="li-title">{e.label || c.name}</span>
        <span className="li-sub">{c.name} · {dateShort(e.date, today)}{isC && <span className="badge soft">Commun</span>}</span>
      </span>
      <span className="li-amt">
        {eur(e.amount)}
        {isC && <span className="sm muted">part {eur(shareAmt(who, e))}</span>}
      </span>
    </>
  );
  return onOpen ? <button type="button" className="li" onClick={onOpen}>{inner}</button> : <div className="li">{inner}</div>;
}
