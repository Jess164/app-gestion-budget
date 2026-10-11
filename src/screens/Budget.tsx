import { categoryRows, findCategory, firstMonth, monthSummary, recentExpenses, shareAmt, type CategoryRow, type MonthSummary } from '../domain/budget';
import { dateShort, monthLabel, shiftMonth, timeShort } from '../domain/dates';
import { eur, eurShort } from '../domain/money';
import { prevus } from '../domain/subs';
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
  const planned = prevus(s, who, props.month, props.today);
  const plannedTotal = planned.reduce((t, p) => t + p.amount, 0);
  const rows = categoryRows(s, who, props.month, planned.filter((p) => p.sub.owner === who).map((p) => ({ cat: p.sub.cat, amount: p.amount })));
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
      <ResteCard sum={sum} planned={plannedTotal} poss={ro ? 'sa' : 'ta'} />
      <CategoryCard rows={rows} seuil={s.prefs.seuil} />
      <section className="card" aria-label="Dernières dépenses">
        <h2>Dernières dépenses</h2>
        <div className="list">
          {recent.length === 0 && <p className="empty">Aucune dépense ce mois-ci.{!ro && ' Touche « Dépense » pour en ajouter une.'}</p>}
          {recent.map((e) => (
            <ExpenseRow key={e.id} e={e} who={who} s={s} today={props.today} poss={ro ? 'sa' : 'ta'} onOpen={!ro && (e.owner === me || e.owner === 'commun') ? () => props.onEdit(e) : undefined} />
          ))}
        </div>
      </section>
    </main>
  );
}

function ResteCard({ sum, planned, poss }: { sum: MonthSummary; planned: number; poss: string }) {
  if (!sum.plafond || sum.reste === null) {
    return (
      <section className="note" aria-label="Dépensé ce mois">
        <span className="tape" aria-hidden="true" />
        <span className="label">Dépensé ce mois</span>
        <div className="big-row"><span className="big-hand">{eur(sum.perso + sum.commun)}</span></div>
        {planned > 0 && <span className="hand-line">et {eur(planned)} prévus d'ici la fin du mois</span>}
        <span className="muted sm">Pas de plafond du mois. Tu peux en fixer un dans Paramètres.</span>
      </section>
    );
  }
  const pct = (x: number) => Math.max(0, Math.min(100, (x / sum.plafond!) * 100));
  const p1 = pct(sum.perso);
  const p2 = Math.min(pct(sum.commun), 100 - p1);
  const p3 = Math.min(pct(planned), 100 - p1 - p2);
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
        {p3 > 0 && <i className="hatch" style={{ width: `${p3}%`, ['--hc' as string]: 'var(--note-perso)' }} />}
      </div>
      <div className="legend">
        <span><i style={{ background: 'var(--note-perso)' }} />{eur(sum.perso)} perso</span>
        {sum.commun > 0 && <span><i style={{ background: 'var(--note-commun)' }} />{eur(sum.commun)} {poss} part du commun</span>}
      </div>
      {planned > 0 && !over && <span className="hand-line">dont {eur(planned)} déjà prévus</span>}
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
  const { cat, spent, prevu, state } = row;
  const total = spent + prevu;
  const fill = state === 'over' ? 'var(--over)' : state === 'warn' ? 'var(--warn)' : 'var(--c)';
  const w1 = cat.plafond ? Math.min(100, (spent / cat.plafond) * 100) : 0;
  const w2 = cat.plafond ? Math.min(100 - w1, (prevu / cat.plafond) * 100) : 0;
  const edge = w1 + w2 > 0 && w1 + w2 < 99.5;
  return (
    <div className="cat" style={{ ['--c' as string]: cat.color, ['--fill' as string]: fill }}>
      <div className="cat-head">
        <span className="cat-name"><i className="sw" aria-hidden="true" /><span>{cat.name}</span></span>
        <span className="cat-amt">
          <b>{eur(total)}</b> {cat.plafond ? `/ ${eurShort(cat.plafond)}` : <span className="muted sm">sans plafond</span>}
        </span>
      </div>
      {cat.plafond ? (
        <div className="bar" aria-hidden="true">
          <i className={edge && w2 <= 0 ? 'edge' : ''} style={{ width: `${w1}%` }} />
          {w2 > 0 && <i className={'hatch' + (edge ? ' edge' : '')} style={{ width: `${w2}%`, ['--hc' as string]: fill }} />}
        </div>
      ) : null}
      {(state === 'over' || state === 'warn' || prevu > 0) && (
        <div className="cat-foot">
          {state === 'over' && <span className="badge over">Dépassé de {eur(total - cat.plafond!)}</span>}
          {state === 'warn' && <span className="badge warn">Plus que {eur(cat.plafond! - total)}</span>}
          {prevu > 0 && <span className="muted sm">dont {eur(prevu)} prévus</span>}
        </div>
      )}
    </div>
  );
}

function ExpenseRow({ e, who, s, today, poss, onOpen }: { e: ExpenseRec; who: MemberKey; s: Snapshot; today: string; poss: string; onOpen?: () => void }) {
  const c = findCategory(s, e.cat, e.owner);
  const isC = e.owner === 'commun';
  const inner = (
    <>
      <span className="li-main">
        <span className="li-title">{e.label || c.name}</span>
        <span className="li-sub">
          {c.name} · {dateShort(e.date, today)}
          {isC && <span className="badge soft">Commun</span>}
          {e.subId && <span className="badge plain">ajoutée toute seule</span>}
        </span>
      </span>
      <span className="li-amt">
        {eur(e.amount)}
        {isC && <span className="sm muted">{poss} part {eur(shareAmt(who, e))}</span>}
      </span>
    </>
  );
  return onOpen ? <button type="button" className="li" onClick={onOpen}>{inner}</button> : <div className="li">{inner}</div>;
}
