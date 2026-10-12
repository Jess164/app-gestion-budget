import { useEffect, useRef, useState, type ReactNode } from 'react';
import { evalExpr, r2 } from '../domain/money';
import { IconBack, IconDown } from './icons';

export function Seg<T extends string>(props: {
  items: Array<[T, string]>;
  value: T;
  onChange: (v: T) => void;
  wide?: boolean;
  /** Classes en plus : « sq » (coins carrés), « tight » (texte serré). */
  extra?: string;
  label?: string;
}) {
  return (
    <div className={'seg' + (props.wide ? ' wide' : '') + (props.extra ? ` ${props.extra}` : '')} role="group" aria-label={props.label}>
      {props.items.map(([v, text]) => (
        <button key={v} type="button" aria-pressed={v === props.value} onClick={() => props.onChange(v)}>
          {text}
        </button>
      ))}
    </div>
  );
}

export function SubHead({ title, onBack }: { title: string; onBack: () => void }) {
  return (
    <header className="sub-head">
      <button className="icon-btn" type="button" onClick={onBack} aria-label="Retour">
        <IconBack />
      </button>
      <h1 className="title-hand sm">
        <span className="hl">{title}</span>
      </h1>
    </header>
  );
}

export function Sheet(props: { title: string; children?: ReactNode; actions: ReactNode; onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const close = useRef(props.onClose);
  close.current = props.onClose;
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && close.current();
    document.addEventListener('keydown', onKey);
    ref.current?.querySelector<HTMLElement>('button')?.focus();
    return () => document.removeEventListener('keydown', onKey);
  }, []);
  return (
    <>
      <div className="overlay" onClick={props.onClose} />
      <div className="sheet" role="dialog" aria-modal="true" aria-labelledby="sheet-title" ref={ref}>
        <h2 id="sheet-title">{props.title}</h2>
        {props.children}
        <div className="sheet-actions">
          {props.actions}
          <button className="btn block" type="button" onClick={props.onClose}>
            Annuler
          </button>
        </div>
      </div>
    </>
  );
}

let toastTimer: ReturnType<typeof setTimeout> | undefined;
/** Petit message en bas de l'écran pendant 2,6 secondes. */
export function toast(message: string) {
  const el = document.getElementById('toast');
  if (!el) return;
  el.textContent = message;
  el.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => (el.hidden = true), 2600);
}

/** Copie dans le presse-papiers, et sélectionne le texte si la copie est refusée. */
export async function copyText(text: string, fallback?: HTMLTextAreaElement | null): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    if (fallback) {
      fallback.focus();
      fallback.select();
    }
    return false;
  }
}

/** Un interrupteur sur toute la largeur, avec un titre et une explication. */
export function SwitchRow(props: { title: string; desc?: string; on: boolean; onChange: (on: boolean) => void; bare?: boolean; disabled?: boolean }) {
  return (
    <button
      type="button"
      className={'switch-row' + (props.bare ? ' bare' : '')}
      role="switch"
      aria-checked={props.on}
      disabled={props.disabled}
      onClick={() => props.onChange(!props.on)}
    >
      <span className="switch-text">
        <b>{props.title}</b>
        {props.desc && <span className="muted sm">{props.desc}</span>}
      </span>
      <span className="switch" aria-hidden="true" />
    </button>
  );
}

export function SelectBox(props: { id: string; value: string; options: Array<{ id: string; name: string }>; onChange: (v: string) => void; disabled?: boolean }) {
  return (
    <div className="select-wrap">
      <select id={props.id} className="input" value={props.value} disabled={props.disabled} onChange={(e) => props.onChange(e.target.value)}>
        {props.options.map((o) => (
          <option key={o.id} value={o.id}>{o.name}</option>
        ))}
      </select>
      <IconDown />
    </div>
  );
}

/**
 * Qui a payé et la part de chacune, pour une dépense ou un abonnement commun.
 * share : la part de la membre qui utilise ce téléphone, entre 0 et 1.
 * La part se règle au curseur (par 5 %) ou en tapant un montant dans l'une des deux cases.
 */
export function PayerAndPart(props: {
  herName: string;
  payerIsMe: boolean;
  onPayer: (me: boolean) => void;
  share: number;
  onShare: (share: number) => void;
  amount: number | null;
  disabled?: boolean;
}) {
  const [editing, setEditing] = useState<'me' | 'her' | null>(null);
  const [draft, setDraft] = useState('');
  const amt = props.amount && props.amount > 0 ? props.amount : 0;
  const mine = r2(amt * props.share);
  const hers = r2(amt - mine);
  const pct = props.share * 100;
  const pctText = (p: number) => (Math.abs(p - Math.round(p)) < 0.05 ? `${Math.round(p)}` : `≈ ${Math.round(p)}`);
  const money = (v: number) => r2(v).toFixed(2).replace('.', ',');

  function type(who: 'me' | 'her', text: string) {
    setDraft(text);
    const v = evalExpr(text);
    if (!amt || !Number.isFinite(v)) return;
    const x = Math.min(amt, Math.max(0, v));
    props.onShare(who === 'me' ? x / amt : (amt - x) / amt);
  }

  const box = (who: 'me' | 'her', label: string, p: number, value: number) => (
    <div>
      <label className="muted sm" htmlFor={`part-${who}`}>{label} · {pctText(p)}&nbsp;%</label>
      <span className="part-amt">
        <input
          id={`part-${who}`}
          className="input"
          inputMode="decimal"
          autoComplete="off"
          placeholder="—"
          disabled={props.disabled || !amt}
          value={editing === who ? draft : amt ? money(value) : ''}
          onFocus={(e) => { setEditing(who); setDraft(amt ? money(value) : ''); e.target.select(); }}
          onChange={(e) => type(who, e.target.value)}
          onBlur={() => setEditing(null)}
          onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
        />
        <b aria-hidden="true">€</b>
      </span>
    </div>
  );

  return (
    <>
      <div className="field">
        <span className="flabel" id="f-payer">Payé par</span>
        <div className={'seg wide'} role="group" aria-labelledby="f-payer">
          <button type="button" aria-pressed={props.payerIsMe} disabled={props.disabled} onClick={() => props.onPayer(true)}>Toi</button>
          <button type="button" aria-pressed={!props.payerIsMe} disabled={props.disabled} onClick={() => props.onPayer(false)}>{props.herName}</button>
        </div>
      </div>
      <div className="field">
        <label className="flabel" htmlFor="f-part">Ta part : <b>{pctText(pct)}&nbsp;%</b></label>
        <input
          id="f-part"
          type="range"
          min={0}
          max={100}
          step={5}
          value={Math.round(pct / 5) * 5}
          disabled={props.disabled}
          onChange={(e) => props.onShare(Number(e.target.value) / 100)}
        />
        <div className="part-tiles">
          {box('me', 'Toi', pct, mine)}
          {box('her', props.herName, 100 - pct, hers)}
        </div>
        {!props.disabled && <span className="muted sm">{amt ? 'Touche un montant pour écrire la part toi-même.' : 'Entre d\'abord le montant total.'}</span>}
      </div>
    </>
  );
}
