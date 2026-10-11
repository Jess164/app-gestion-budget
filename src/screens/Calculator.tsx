import { useState } from 'react';
import { eur, evalExpr, numToInput, r2 } from '../domain/money';
import { IconDel, IconPlus } from '../ui/icons';
import { Seg } from '../ui/kit';

type Mode = 'calc' | 'mensuel';
const PER_MONTH: Record<string, number> = { jour: 365 / 12, semaine: 52 / 12, mois: 1, trimestre: 1 / 3, an: 1 / 12 };
const KEYS: Array<[string, string?, string?]> = [
  ['C', 'k-op', 'Tout effacer'], ['⌫', 'k-op', 'Effacer le dernier chiffre'], ['÷', 'k-op', 'Diviser'], ['×', 'k-op', 'Multiplier'],
  ['7'], ['8'], ['9'], ['−', 'k-op', 'Moins'],
  ['4'], ['5'], ['6'], ['+', 'k-op', 'Plus'],
  ['1'], ['2'], ['3'], ['=', 'k-eq', 'Égal'],
  ['0', 'k-zero'], [',', '', 'Virgule']
];

export function Calculator({ onAddExpense }: { onAddExpense: (amount: string) => void }) {
  const [mode, setMode] = useState<Mode>('calc');
  const [expr, setExpr] = useState('');
  const [amount, setAmount] = useState('2,50');
  const [freq, setFreq] = useState('jour');

  const v = evalExpr(expr);
  const shown = Number.isFinite(v) ? v : evalExpr(expr.replace(/[+−×÷,]$/, ''));

  function press(k: string) {
    if (k === 'C') return setExpr('');
    if (k === '⌫') return setExpr(expr.slice(0, -1));
    if (k === '=') return Number.isFinite(v) && setExpr(numToInput(v));
    if ('+−×÷'.includes(k)) {
      if (!expr && k !== '−') return;
      return setExpr(expr.replace(/[+−×÷]$/, '') + k);
    }
    if (k === ',') {
      const last = expr.split(/[+−×÷]/).pop() ?? '';
      if (last.includes(',')) return;
      return setExpr(expr + (last === '' ? '0,' : ','));
    }
    setExpr(expr + k);
  }

  const m = evalExpr(amount);
  const monthly = Number.isFinite(m) && m > 0 ? m * PER_MONTH[freq] : null;

  return (
    <main className="screen">
      <header className="head"><h1 className="title-hand"><span className="hl">Calculatrice</span></h1></header>
      <Seg<Mode> wide items={[['calc', 'Calcul'], ['mensuel', 'Par mois et par an']]} value={mode} onChange={setMode} />
      {mode === 'calc' ? (
        <>
          <section className="card calc-display" aria-live="polite">
            <span className="calc-expr">{expr.replace(/([+−×÷])/g, ' $1 ')}</span>
            <span className="calc-res">{Number.isFinite(shown) ? r2(shown).toLocaleString('fr-FR', { maximumFractionDigits: 2 }) : '0'}</span>
          </section>
          <div className="keys">
            {KEYS.map(([k, cls, label]) => (
              <button key={k} type="button" className={'key ' + (cls ?? '')} aria-label={label} onClick={() => press(k)}>
                {k === '⌫' ? <IconDel /> : k}
              </button>
            ))}
          </div>
          <button className="btn primary block" type="button" disabled={!(Number.isFinite(v) && v > 0)} onClick={() => onAddExpense(numToInput(v))}>
            <IconPlus />Ajouter comme dépense{Number.isFinite(v) && v > 0 ? ` · ${eur(v)}` : ''}
          </button>
        </>
      ) : (
        <>
          <div className="field">
            <label className="flabel" htmlFor="c-amount">Montant</label>
            <input id="c-amount" className="input big" inputMode="decimal" autoComplete="off" value={amount} onChange={(e) => setAmount(e.target.value)} />
          </div>
          <div className="field">
            <span className="flabel" id="c-freq">Tous les…</span>
            <div className="chips" role="group" aria-labelledby="c-freq">
              {[['jour', 'Jour'], ['semaine', 'Semaine'], ['mois', 'Mois'], ['trimestre', 'Trimestre'], ['an', 'An']].map(([k, t]) => (
                <button key={k} type="button" className="chip" aria-pressed={freq === k} onClick={() => setFreq(k)}>{t}</button>
              ))}
            </div>
          </div>
          <div className="tiles" aria-live="polite">
            <div className="tile"><span className="muted sm">Par mois</span><b>{monthly === null ? '—' : eur(monthly)}</b></div>
            <div className="tile"><span className="muted sm">Par an</span><b>{monthly === null ? '—' : eur(monthly * 12)}</b></div>
          </div>
          <p className="muted sm">Exemple : un café à 2,50 € tous les jours.</p>
        </>
      )}
    </main>
  );
}
