import { useRef, useState } from 'react';
import { categoriesOf, myShare, partAFrom } from '../domain/budget';
import { dateLong } from '../domain/dates';
import { eur, evalExpr, hasOp, numToInput, parseAmount } from '../domain/money';
import { other, type ExpenseRec } from '../domain/types';
import { newId } from '../data/ids';
import { useStore } from '../data/store';
import { PayerAndPart, Seg, Sheet, SubHead, toast } from '../ui/kit';

const OPS: Array<[string, string]> = [['+', 'Plus'], ['−', 'Moins'], ['×', 'Multiplier'], ['÷', 'Diviser']];

export type ExpenseKind = 'perso' | 'commun';

export function ExpenseForm(props: {
  existing?: ExpenseRec;
  initialAmount?: string;
  initialKind?: ExpenseKind;
  today: string;
  onDone: (month?: string, kind?: ExpenseKind) => void;
}) {
  const store = useStore();
  const s = store.snapshot();
  const me = store.config!.me;
  const her = s.members[other(me)];
  const ex = props.existing;
  const [kind, setKind] = useState<ExpenseKind>(ex ? (ex.owner === 'commun' ? 'commun' : 'perso') : props.initialKind ?? 'perso');
  const cats = categoriesOf(s, kind === 'commun' ? 'commun' : me);
  const [expr, setExpr] = useState(ex ? numToInput(ex.amount) : props.initialAmount ?? '');
  const [label, setLabel] = useState(ex?.label ?? '');
  const [date, setDate] = useState(ex?.date ?? props.today);
  const [cat, setCat] = useState(ex?.cat ?? cats[0]?.id ?? '');
  const [payerIsMe, setPayerIsMe] = useState(ex?.payer ? ex.payer === me : true);
  const [share, setShare] = useState(myShare(me, ex?.partA ?? 0.5));
  const [error, setError] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const amountRef = useRef<HTMLInputElement>(null);

  const value = evalExpr(expr);
  const preview = hasOp(expr) && Number.isFinite(value) ? `= ${eur(value)}` : '';
  const isC = kind === 'commun';

  function changeKind(k: ExpenseKind) {
    setKind(k);
    setCat(categoriesOf(s, k === 'commun' ? 'commun' : me)[0]?.id ?? '');
  }

  function addOp(op: string) {
    const v = expr.trimEnd();
    if (!v && op !== '−') return amountRef.current?.focus();
    setExpr(v.replace(/[+−×÷\-*/]$/, '') + op);
    amountRef.current?.focus();
  }

  function save() {
    const amount = parseAmount(expr);
    if (amount === null) {
      setError('Entre un montant, par exemple 12,50 ou 12,40+8,90.');
      amountRef.current?.focus();
      return;
    }
    if (!date) return setError('Choisis une date.');
    if (!cat) return setError('Choisis une catégorie.');
    const now = Date.now();
    const rec: ExpenseRec = {
      id: ex?.id ?? newId('dep'),
      type: 'expense',
      owner: isC ? 'commun' : ex?.owner ?? me,
      date,
      amount,
      label: label.trim(),
      cat,
      createdAt: ex?.createdAt ?? now,
      updatedAt: 0,
      by: ''
    };
    if (isC) {
      rec.payer = payerIsMe ? me : other(me);
      rec.partA = partAFrom(me, share);
    }
    if (ex?.subId) rec.subId = ex.subId;
    store.put<ExpenseRec>(rec);
    toast(ex ? 'Dépense modifiée' : `${isC ? 'Dépense commune ajoutée' : 'Dépense ajoutée'} : ${eur(amount)}`);
    props.onDone(date.slice(0, 7), kind);
  }

  function remove() {
    if (!ex) return;
    store.remove(ex.id);
    toast('Dépense supprimée');
    props.onDone(undefined, kind);
  }

  const title = ex ? 'Modifier la dépense' : isC ? 'Dépense commune' : 'Nouvelle dépense';
  return (
    <>
      <SubHead title={title} onBack={() => props.onDone(undefined, kind)} />
      <main className="screen sub" style={{ paddingTop: 8 }}>
        {!ex && <Seg<ExpenseKind> wide items={[['perso', 'Perso'], ['commun', 'Commun']]} value={kind} onChange={changeKind} label="Type de dépense" />}
        {ex?.subId && (
          <p className="info">
            <b>Ajoutée toute seule le jour du prélèvement.</b>
            <span>Supprime-la si le prélèvement n'a pas eu lieu, ou corrige le montant s'il a changé.</span>
          </p>
        )}
        <div className="field">
          <label className="flabel" htmlFor="f-amount">Montant</label>
          <input
            id="f-amount"
            ref={amountRef}
            className="input big"
            inputMode="decimal"
            autoComplete="off"
            placeholder="0,00"
            value={expr}
            onChange={(e) => { setExpr(e.target.value); setError(''); }}
          />
          <div className="ops" role="group" aria-label="Calculer dans le montant">
            {OPS.map(([op, name]) => (
              <button key={op} type="button" className="op" aria-label={name} onClick={() => addOp(op)}>{op}</button>
            ))}
            <span className="calc-out" aria-live="polite">{preview}</span>
          </div>
        </div>
        <div className="grid2">
          <div className="field">
            <label className="flabel" htmlFor="f-label">Libellé</label>
            <input id="f-label" className="input" placeholder="Facultatif" autoComplete="off" value={label} onChange={(e) => setLabel(e.target.value)} />
          </div>
          <div className="field">
            <label className="flabel" htmlFor="f-date">Date</label>
            <input id="f-date" className="input" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
        </div>
        <div className="field">
          <span className="flabel" id="f-cat">Catégorie</span>
          <div className="chips" role="group" aria-labelledby="f-cat">
            {cats.map((c) => (
              <button key={c.id} type="button" className="chip" style={{ ['--c' as string]: c.color }} aria-pressed={c.id === cat} onClick={() => setCat(c.id)}>
                <i className="sw" aria-hidden="true" />{c.name}
              </button>
            ))}
          </div>
        </div>
        {isC && (
          <PayerAndPart
            herName={her.name}
            payerIsMe={payerIsMe}
            onPayer={setPayerIsMe}
            share={share}
            onShare={setShare}
            amount={Number.isFinite(value) ? value : null}
          />
        )}
        {error && <p className="form-error" role="alert">{error}</p>}
        <button className="btn primary block" type="button" onClick={save}>{ex ? 'Enregistrer' : 'Ajouter la dépense'}</button>
        {ex && <button className="link-btn" type="button" onClick={() => setConfirmDelete(true)}>Supprimer cette dépense</button>}
      </main>
      {confirmDelete && ex && (
        <Sheet
          title="Supprimer la dépense ?"
          onClose={() => setConfirmDelete(false)}
          actions={<button className="btn block danger" type="button" onClick={remove}>Supprimer</button>}
        >
          <p className="muted">
            {ex.label || 'Cette dépense'} · {eur(ex.amount)} · {dateLong(ex.date)}. Elle disparaîtra aussi chez {her.name}.
          </p>
        </Sheet>
      )}
    </>
  );
}
