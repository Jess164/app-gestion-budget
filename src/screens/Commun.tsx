import { useState } from 'react';
import { balanceFor, communExpenses, findCategory, firstMonth, settlementFor, settlementsOfMonth, shareAmt } from '../domain/budget';
import { dateShort, monthLabel, shiftMonth } from '../domain/dates';
import { eur } from '../domain/money';
import { FREQ, deadline, isActive } from '../domain/subs';
import { other, type ExpenseRec, type MemberKey, type SettlementRec, type SubscriptionRec } from '../domain/types';
import { newId } from '../data/ids';
import { useStore } from '../data/store';
import { IconCheck, IconLeft, IconRight } from '../ui/icons';
import { Sheet, toast } from '../ui/kit';
import { RefreshButton, SyncLine } from './Budget';

export function Commun(props: {
  month: string;
  setMonth: (m: string) => void;
  today: string;
  onEdit: (e: ExpenseRec) => void;
  onOpenSub: (sub: SubscriptionRec) => void;
}) {
  const store = useStore();
  const s = store.snapshot();
  const me = store.config!.me;
  const herKey = other(me);
  const her = s.members[herKey].name;
  const [sheet, setSheet] = useState<'settle' | SettlementRec | null>(null);

  const cur = props.today.slice(0, 7);
  const min = firstMonth(s, cur);
  const owed = balanceFor(s, me);
  const settle = settlementFor(s, me);
  const exp = communExpenses(s, props.month);
  const refunds = settlementsOfMonth(s, props.month);
  const total = exp.reduce((t, e) => t + e.amount, 0);
  const mine = exp.reduce((t, e) => t + shareAmt(me, e), 0);
  const subs = s.subscriptions.filter((x) => x.owner === 'commun' && isActive(x)).sort((x, y) => (deadline(x, props.today) < deadline(y, props.today) ? -1 : 1));
  const name = (m: MemberKey) => (m === me ? 'toi' : her);

  const who = owed > 0.004 ? `${her} te doit` : owed < -0.004 ? `Tu dois à ${her}` : 'Vous êtes quittes';

  function doSettle() {
    if (!settle) return;
    store.put<SettlementRec>({ id: newId('remb'), type: 'settlement', date: props.today, from: settle.from, amount: settle.amount, createdAt: Date.now() });
    setSheet(null);
    toast('C\'est noté : vous êtes quittes');
  }

  return (
    <main className="screen">
      <header className="head">
        <h1 className="title-hand"><span className="hl">Commun</span></h1>
        <div className="head-actions"><RefreshButton store={store} /></div>
      </header>
      <SyncLine store={store} />

      <section className="card accent" aria-label="Solde">
        <span className="label">{who}</span>
        <span className="big-num">{eur(Math.abs(owed))}</span>
        <span className="sm">Depuis votre dernier remboursement</span>
        {settle && (
          <button className="btn block" type="button" onClick={() => setSheet('settle')}><IconCheck />On est quittes</button>
        )}
      </section>

      <div className="row-between">
        <span className="month-title">{monthLabel(props.month)}</span>
        <div className="month-nav">
          <button className="icon-btn" type="button" aria-label="Mois précédent" disabled={props.month <= min} onClick={() => props.setMonth(shiftMonth(props.month, -1))}><IconLeft /></button>
          <button className="icon-btn" type="button" aria-label="Mois suivant" disabled={props.month >= cur} onClick={() => props.setMonth(shiftMonth(props.month, 1))}><IconRight /></button>
        </div>
      </div>
      <div className="tiles">
        <div className="tile"><span className="muted sm">Commun ce mois</span><b>{eur(total)}</b></div>
        <div className="tile"><span className="muted sm">Ta part</span><b>{eur(mine)}</b></div>
      </div>

      <section className="card" aria-label="Dépenses communes">
        <h2>Dépenses communes</h2>
        <div className="list">
          {exp.length === 0 && refunds.length === 0 && <p className="empty">Aucune dépense commune ce mois-ci. Touche « Dépense commune » pour en ajouter une.</p>}
          {exp.map((e) => {
            const c = findCategory(s, e.cat, 'commun');
            const payer = e.payer ?? 'a';
            return (
              <button key={e.id} type="button" className="li" onClick={() => props.onEdit(e)}>
                <span className="li-main">
                  <span className="li-title">{e.label || c.name}</span>
                  <span className="li-sub">
                    {c.name} · {dateShort(e.date, props.today)}
                    <span className={'badge ' + (payer === me ? 'soft' : 'plain')}>Payé par {name(payer)}</span>
                    {e.subId && <span className="badge plain">ajoutée toute seule</span>}
                  </span>
                </span>
                <span className="li-amt">{eur(e.amount)}<span className="sm muted">ta part {eur(shareAmt(me, e))}</span></span>
              </button>
            );
          })}
          {refunds.map((r) => (
            <button key={r.id} type="button" className="li" onClick={() => setSheet(r)}>
              <span className="li-main">
                <span className="li-title">Remboursement</span>
                <span className="li-sub">
                  {r.from === me ? `Toi → ${her}` : `${her} → toi`} · {dateShort(r.date, props.today)}
                  <span className="badge plain">On est quittes</span>
                </span>
              </span>
              <span className="li-amt">{eur(r.amount)}</span>
            </button>
          ))}
        </div>
      </section>

      <section className="card" aria-label="Abonnements communs">
        <h2>Abonnements communs</h2>
        <div className="list">
          {subs.length === 0 && <p className="empty">Aucun abonnement commun. Tu peux en ajouter dans l'onglet Abonnements.</p>}
          {subs.map((x) => (
            <button key={x.id} type="button" className="li" onClick={() => props.onOpenSub(x)}>
              <span className="li-main">
                <span className="li-title">{x.name} · {eur(x.amount)}{FREQ[x.freq].per}</span>
                <span className="li-sub">Payé par {name(x.payer ?? 'a')} · résilier avant le {dateShort(deadline(x, props.today), props.today)}</span>
              </span>
              <IconRight />
            </button>
          ))}
        </div>
      </section>

      {sheet === 'settle' && settle && (
        <Sheet
          title="On est quittes ?"
          onClose={() => setSheet(null)}
          actions={<button className="btn block primary" type="button" onClick={doSettle}><IconCheck />Oui, on est quittes</button>}
        >
          <p className="muted">
            {settle.from === me ? `Tu as remboursé ${eur(settle.amount)} à ${her}.` : `${her} t'a remboursé ${eur(settle.amount)}.`} Le solde repart de zéro.
          </p>
        </Sheet>
      )}
      {sheet && sheet !== 'settle' && (
        <Sheet
          title="Supprimer ce remboursement ?"
          onClose={() => setSheet(null)}
          actions={
            <button className="btn block danger" type="button" onClick={() => { store.remove(sheet.id); setSheet(null); toast('Remboursement supprimé'); }}>
              Supprimer le remboursement
            </button>
          }
        >
          <p className="muted">
            {sheet.from === me ? `Toi → ${her}` : `${her} → toi`} · {eur(sheet.amount)}. Supprime-le s'il a été noté par erreur : le solde reviendra à ce qu'il était sans lui.
          </p>
        </Sheet>
      )}
    </main>
  );
}
