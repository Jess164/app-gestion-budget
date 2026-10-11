import { useEffect, useRef, type ReactNode } from 'react';
import { IconBack } from './icons';

export function Seg<T extends string>(props: {
  items: Array<[T, string]>;
  value: T;
  onChange: (v: T) => void;
  wide?: boolean;
  label?: string;
}) {
  return (
    <div className={'seg' + (props.wide ? ' wide' : '')} role="group" aria-label={props.label}>
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
