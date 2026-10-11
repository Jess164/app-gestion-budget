import { useState } from 'react';
import { categoriesOf, myPartPct, partAFrom } from '../domain/budget';
import { catId } from '../domain/defaults';
import { addDays, addMonths, dateLong, dateShort, daysBetween, inDays } from '../domain/dates';
import { eur, evalExpr, numToInput, parseAmount } from '../domain/money';
import { FREQ, nextDue } from '../domain/subs';
import { other, type Freq, type Owner, type SubscriptionRec } from '../domain/types';
import { newId } from '../data/ids';
import { useStore } from '../data/store';
import { PayerAndPart, Seg, SelectBox, Sheet, SubHead, SwitchRow, toast } from '../ui/kit';
import { isIOS } from './Setup';

type Kind = 'perso' | 'commun';
const FREQS: Array<[Freq, string]> = (Object.keys(FREQ) as Freq[]).map((f) => [f, FREQ[f].short]);

function eqText(amount: string, freq: Freq): string {
  const v = evalExpr(amount);
  if (!(Number.isFinite(v) && v > 0)) return '';
  const m = v * FREQ[freq].perMonth;
  return `Soit ${eur(m)}/mois et ${eur(m * 12)}/an`;
}

export function SubscriptionForm(props: { existing?: SubscriptionRec; initialKind?: Kind; today: string; onDone: () => void }) {
  const store = useStore();
  const s = store.snapshot();
  const me = store.config!.me;
  const herKey = other(me);
  const her = s.members[herKey].name;
  const ex = props.existing;
  const ro = !!ex && ex.owner === herKey;
  const dis = ro || undefined;

  const defaultCat = (k: Kind) => {
    const owner: Owner = k === 'commun' ? 'commun' : me;
    const list = categoriesOf(s, owner);
    const wanted = catId(owner, k === 'commun' ? 'abos' : 'abonnements');
    return list.find((c) => c.id === wanted)?.id ?? list[0]?.id ?? '';
  };

  const [name, setName] = useState(ex?.name ?? '');
  const [essai, setEssai] = useState(ex?.essai ?? false);
  const [amount, setAmount] = useState(ex ? numToInput(ex.amount) : '');
  const [freq, setFreq] = useState<Freq>(ex?.freq ?? 'mois');
  const [next, setNext] = useState(ex ? nextDue(ex, props.today) : addMonths(props.today, 1));
  const [preavis, setPreavis] = useState(String(ex?.preavis ?? 0));
  const [kind, setKind] = useState<Kind>(ex ? (ex.owner === 'commun' ? 'commun' : 'perso') : props.initialKind ?? 'perso');
  const [payerIsMe, setPayerIsMe] = useState(ex?.payer ? ex.payer === me : true);
  const [part, setPart] = useState(myPartPct(me, ex?.partA ?? 0.5));
  const [cat, setCat] = useState(ex?.cat ?? defaultCat(kind));
  const [alerte, setAlerte] = useState(ex?.alerte ?? true);
  const [alerteJours, setAlerteJours] = useState(ex?.alerteJours ?? s.prefs.alerteJours);
  const [error, setError] = useState('');
  const [sheet, setSheet] = useState<'resilie' | 'delete' | null>(null);

  const isC = kind === 'commun';
  const catOwner: Owner = isC ? 'commun' : ro ? herKey : me;
  const options = categoriesOf(s, catOwner).map((c) => ({ id: c.id, name: c.name }));
  if (cat && !options.some((o) => o.id === cat)) options.unshift({ id: cat, name: 'Autre' });
  const pre = Math.max(0, parseInt(preavis, 10) || 0);
  const value = evalExpr(amount);

  function changeKind(k: Kind) {
    setKind(k);
    setCat(defaultCat(k));
  }

  function dlInfo() {
    if (!next) return <span>Choisis la date du prochain prélèvement.</span>;
    const dl = addDays(next, -pre);
    const days = daysBetween(props.today, dl);
    return (
      <>
        <span>Date limite de résiliation : <b>{dateLong(dl)}</b> ({days >= 0 ? inDays(days) : 'passée'})</span>
        <span className="sm muted">
          {pre ? `Le ${dateShort(next, props.today)} moins ${pre} jour${pre > 1 ? 's' : ''} de préavis` : "Pas de préavis : c'est le jour du prélèvement"}
        </span>
      </>
    );
  }

  function alertInfo(): string {
    if (!alerte) return 'Alerte coupée : tu ne seras pas prévenue.';
    if (!next) return '';
    const at = addDays(next, -pre - alerteJours);
    if (at < props.today) return "La date de l'alerte est déjà passée pour cette échéance.";
    return `Notification le ${dateShort(at, props.today)} sur ton Android, une fois l'APK installé.`;
  }

  function save() {
    const amt = parseAmount(amount);
    if (amt === null) return setError('Entre un montant, par exemple 9,99.');
    if (!next) return setError('Choisis la date du prochain prélèvement.');
    if (pre > 365) return setError('Le préavis ne peut pas dépasser 365 jours.');
    const owner: Owner = isC ? 'commun' : ex && ex.owner !== 'commun' ? ex.owner : me;
    const rec: SubscriptionRec = {
      id: ex?.id ?? newId('abo'),
      type: 'subscription',
      owner,
      name: name.trim() || 'Abonnement',
      amount: amt,
      freq,
      anchor: next,
      preavis: pre,
      essai,
      cat,
      alerte: essai ? true : alerte,
      alerteJours,
      resilieLe: ex?.resilieLe ?? null,
      createdAt: ex?.createdAt ?? Date.now(),
      updatedAt: 0,
      by: ''
    };
    if (isC) {
      rec.payer = payerIsMe ? me : herKey;
      rec.partA = partAFrom(me, part);
    }
    store.put<SubscriptionRec>(rec);
    store.materialize(props.today);
    toast(ex ? 'Abonnement enregistré' : `${rec.name} ajouté`);
    props.onDone();
  }

  function resilie() {
    if (!ex) return;
    store.put<SubscriptionRec>({ ...ex, resilieLe: props.today });
    toast(`${ex.name} résilié : plus de dépense ni d'alerte`);
    props.onDone();
  }

  function reactivate() {
    if (!ex) return;
    store.put<SubscriptionRec>({ ...ex, resilieLe: null, anchor: nextDue(ex, props.today) });
    toast(`${ex.name} réactivé`);
    props.onDone();
  }

  function remove() {
    if (!ex) return;
    store.remove(ex.id);
    toast('Abonnement supprimé');
    props.onDone();
  }

  const title = ex ? ex.name || 'Abonnement' : 'Nouvel abonnement';
  return (
    <>
      <SubHead title={title} onBack={props.onDone} />
      <main className="screen sub" style={{ paddingTop: 8 }}>
        {ro && <p className="pill-note">Abonnement de {her} · lecture seule</p>}
        {ex?.resilieLe && (
          <p className="info">
            <b>Résilié le {dateLong(ex.resilieLe)}.</b>
            <span>Il ne crée plus de dépense ni d'alerte.</span>
          </p>
        )}
        <div className="field">
          <label className="flabel" htmlFor="a-name">Nom</label>
          <input id="a-name" className="input" placeholder="Netflix, box internet…" autoComplete="off" value={name} disabled={dis} onChange={(e) => setName(e.target.value)} />
        </div>
        <SwitchRow title="Essai gratuit" desc="La fin de l'essai devient la première échéance" on={essai} onChange={setEssai} disabled={ro} />
        <div className="field">
          <label className="flabel" htmlFor="a-amount">{essai ? "Prix après l'essai" : 'Montant'}</label>
          <input id="a-amount" className="input" inputMode="decimal" placeholder="0,00" autoComplete="off" value={amount} disabled={dis} onChange={(e) => { setAmount(e.target.value); setError(''); }} />
        </div>
        <div className="field">
          <span className="flabel">Prélevé tous les…</span>
          {ro ? <span>{FREQ[freq].name}</span> : <Seg<Freq> wide extra="sq" items={FREQS} value={freq} onChange={setFreq} label="Fréquence" />}
          <span className="muted sm" aria-live="polite">{eqText(amount, freq)}</span>
        </div>
        <div className="grid2">
          <div className="field">
            <label className="flabel" htmlFor="a-next">{essai ? "Fin de l'essai" : 'Prochaine échéance'}</label>
            <input id="a-next" className="input" type="date" value={next} disabled={dis} onChange={(e) => setNext(e.target.value)} />
          </div>
          <div className="field">
            <label className="flabel" htmlFor="a-pre">Préavis (jours)</label>
            <input id="a-pre" className="input" inputMode="numeric" value={preavis} disabled={dis} onChange={(e) => setPreavis(e.target.value.replace(/[^0-9]/g, ''))} />
          </div>
        </div>
        <div className="info" aria-live="polite">{dlInfo()}</div>
        {!ro && (
          <div className="field">
            <span className="flabel">À qui</span>
            <Seg<Kind> wide items={[['perso', 'Perso'], ['commun', 'Commun']]} value={kind} onChange={changeKind} label="À qui" />
          </div>
        )}
        {isC && (
          <PayerAndPart
            herName={her}
            payerIsMe={payerIsMe}
            onPayer={setPayerIsMe}
            part={part}
            onPart={setPart}
            amount={Number.isFinite(value) ? value : null}
            disabled={ro}
          />
        )}
        <div className="field">
          <label className="flabel" htmlFor="a-cat">Catégorie</label>
          <SelectBox id="a-cat" value={cat} options={options} onChange={setCat} disabled={ro} />
        </div>
        {!ro && !isIOS() && (
          <section className="card" aria-label="Alerte">
            <SwitchRow bare title="Alerte" desc={essai ? "Toujours activée pour un essai gratuit" : 'Une notification sur ton Android avant la date limite'} on={essai || alerte} onChange={setAlerte} disabled={essai} />
            {(essai || alerte) && (
              <div className="row-between">
                <span>Me prévenir</span>
                <div className="stepper">
                  <button className="icon-btn" type="button" aria-label="Un jour de moins" onClick={() => setAlerteJours(Math.max(0, alerteJours - 1))}>−</button>
                  <output>{alerteJours} jour{alerteJours > 1 ? 's' : ''} avant</output>
                  <button className="icon-btn" type="button" aria-label="Un jour de plus" onClick={() => setAlerteJours(Math.min(30, alerteJours + 1))}>+</button>
                </div>
              </div>
            )}
            <span className="muted sm">{alertInfo()}</span>
          </section>
        )}
        {error && <p className="form-error" role="alert">{error}</p>}
        {!ro && (
          <div className="stack">
            <button className="btn primary block" type="button" onClick={save}>{ex ? 'Enregistrer' : "Ajouter l'abonnement"}</button>
            {ex && (ex.resilieLe
              ? <button className="btn block" type="button" onClick={reactivate}>Le réactiver</button>
              : <button className="btn block danger" type="button" onClick={() => setSheet('resilie')}>J'ai résilié</button>)}
            {ex && <button className="link-btn" type="button" onClick={() => setSheet('delete')}>Supprimer cet abonnement</button>}
          </div>
        )}
      </main>
      {sheet === 'resilie' && ex && (
        <Sheet title={`Tu as résilié ${ex.name} ?`} onClose={() => setSheet(null)} actions={<button className="btn block primary" type="button" onClick={resilie}>Oui, j'ai résilié</button>}>
          <p className="muted">Il ne créera plus de dépense ni d'alerte. Tu pourras le réactiver.</p>
        </Sheet>
      )}
      {sheet === 'delete' && ex && (
        <Sheet title={`Supprimer ${ex.name} ?`} onClose={() => setSheet(null)} actions={<button className="btn block danger" type="button" onClick={remove}>Supprimer l'abonnement</button>}>
          <p className="muted">Pour une erreur de saisie. Les dépenses déjà ajoutées restent dans le budget. S'il est arrêté, préfère « J'ai résilié ».</p>
        </Sheet>
      )}
    </>
  );
}
