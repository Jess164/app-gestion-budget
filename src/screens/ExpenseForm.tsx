import { useRef, useState } from 'react';
import { categoriesOf } from '../domain/budget';
import { eur, evalExpr, hasOp, numToInput, parseAmount } from '../domain/money';
import type { ExpenseRec } from '../domain/types';
import { newId } from '../data/ids';
import { useStore } from '../data/store';
import { Sheet, SubHead, toast } from '../ui/kit';

const OPS: Array<[string, string]> = [['+', 'Plus'], ['−', 'Moins'], ['×', 'Multiplier'], ['÷', 'Diviser']];

export function ExpenseForm(props: { existing?: ExpenseRec; initialAmount?: string; today: string; onDone: (month?: string) => void }) {
  const store = useStore();
  const s = store.snapshot();
  const me = store.config!.me;
  const cats = categoriesOf(s, me);
  const ex = props.existing;
  const [expr, setExpr] = useState(ex ? numToInput(ex.amount) : props.initialAmount ?? '');
  const [label, setLabel] = useState(ex?.label ?? '');
  const [date, setDate] = useState(ex?.date ?? props.today);
  const [cat, setCat] = useState(ex?.cat ?? cats[0]?.id ?? '');
  const [error, setError] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const amountRef = useRef<HTMLInputElement>(null);

  const value = evalExpr(expr);
  const preview = hasOp(expr) && Number.isFinite(value) ? `= ${eur(value)}` : '';

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
    store.put<ExpenseRec>({
      id: ex?.id ?? newId('dep'),
      type: 'expense',
      owner: me,
      date,
      amount,
      label: label.trim(),
      cat,
      createdAt: ex?.createdAt ?? now
    });
    toast(ex ? 'Dépense modifiée' : `Dépense ajoutée : ${eur(amount)}`);
    props.onDone(date.slice(0, 7));
  }

  function remove() {
    if (!ex) return;
    store.remove(ex.id);
    toast('Dépense supprimée');
    props.onDone();
  }

  return (
    <>
      <SubHead title={ex ? 'Modifier la dépense' : 'Nouvelle dépense'} onBack={() => props.onDone()} />
      <main className="screen sub" style={{ paddingTop: 8 }}>
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
          <p className="muted">{ex.label || 'Cette dépense'} · {eur(ex.amount)}. Elle disparaîtra aussi chez ta sœur.</p>
        </Sheet>
      )}
    </>
  );
}
