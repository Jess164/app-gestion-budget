import { useRef, useState } from 'react';
import type { MemberKey, Snapshot } from '../domain/types';
import { isScriptUrl, parseInvite, type Invite } from '../data/invite';
import { ScriptError, useStore } from '../data/store';
import { IconCopy } from '../ui/icons';
import { Seg, SubHead, copyText, toast } from '../ui/kit';

type Step = 'home' | 'new' | 'join' | 'who';

export const isIOS = () =>
  /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
export const isStandalone = () =>
  window.matchMedia('(display-mode: standalone)').matches || (navigator as unknown as { standalone?: boolean }).standalone === true;

export function Setup({ initialInvite, onDone }: { initialInvite: string; onDone: (fresh: boolean) => void }) {
  const store = useStore();
  const [step, setStep] = useState<Step>(initialInvite ? 'join' : 'home');
  const [url, setUrl] = useState('');
  const [nameA, setNameA] = useState('');
  const [nameB, setNameB] = useState('');
  const [inviteText, setInviteText] = useState(initialInvite);
  const [invite, setInvite] = useState<Invite | null>(null);
  const [snap, setSnap] = useState<Snapshot | null>(null);
  const [who, setWho] = useState<MemberKey>('b');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const area = useRef<HTMLTextAreaElement>(null);
  const iosBrowser = isIOS() && !isStandalone();

  async function createNew() {
    setError('');
    const u = url.trim();
    if (!isScriptUrl(u)) {
      return setError("Cette adresse ne ressemble pas à celle d'un script Google. Elle commence par https://script.google.com/macros/s/ et finit par /exec.");
    }
    if (!nameA.trim() || !nameB.trim()) return setError('Entre vos deux prénoms.');
    setBusy(true);
    try {
      await store.setupNew(u, nameA.trim(), nameB.trim());
      onDone(true);
    } catch (e) {
      setError(e instanceof ScriptError ? e.message : 'Une erreur inattendue est survenue. Réessaie.');
    } finally {
      setBusy(false);
    }
  }

  async function join() {
    setError('');
    const inv = parseInvite(inviteText);
    if (!inv) return setError("Ce lien d'invitation n'est pas valide. Copie-le en entier, depuis « https » jusqu'à la fin.");
    setBusy(true);
    try {
      const s = await store.fetchForJoin(inv);
      setInvite(inv);
      setSnap(s);
      setWho(inv.who);
      setStep('who');
    } catch (e) {
      setError(e instanceof ScriptError ? e.message : 'Une erreur inattendue est survenue. Réessaie.');
    } finally {
      setBusy(false);
    }
  }

  if (step === 'home') {
    return (
      <main className="screen sub">
        <div className="welcome">
          <h1 className="title-hand"><span className="hl">PasD'Tal'</span></h1>
          <p className="muted">Le budget de deux sœurs.</p>
        </div>
        {iosBrowser && (
          <div className="info">
            <b>Sur iPhone, installe d'abord l'appli</b>
            <span>Touche le bouton Partager, puis « Sur l'écran d'accueil ». Ouvre ensuite PasD'Tal' depuis la nouvelle icône pour la configurer.</span>
          </div>
        )}
        <button className="choice" type="button" onClick={() => setStep('new')}>
          <b>C'est moi qui ai installé le script Google</b>
          <span className="muted sm">Première configuration : tu colles l'adresse du script et vos prénoms.</span>
        </button>
        <button className="choice" type="button" onClick={() => setStep('join')}>
          <b>J'ai un lien d'invitation</b>
          <span className="muted sm">Ta sœur t'a envoyé un lien : colle-le pour retrouver vos données.</span>
        </button>
      </main>
    );
  }

  if (step === 'new') {
    return (
      <>
        <SubHead title="Configuration" onBack={() => setStep('home')} />
        <main className="screen sub" style={{ paddingTop: 8 }}>
          <div className="field">
            <label className="flabel" htmlFor="s-url">Adresse du script Google</label>
            <input id="s-url" className="input" inputMode="url" autoComplete="off" placeholder="https://script.google.com/macros/s/…/exec" value={url} onChange={(e) => setUrl(e.target.value)} />
            <span className="muted sm">Tu la trouves après « Déployer », dans « Application Web ».</span>
          </div>
          <div className="grid2">
            <div className="field">
              <label className="flabel" htmlFor="s-a">Ton prénom</label>
              <input id="s-a" className="input" autoComplete="given-name" value={nameA} onChange={(e) => setNameA(e.target.value)} />
            </div>
            <div className="field">
              <label className="flabel" htmlFor="s-b">Prénom de ta sœur</label>
              <input id="s-b" className="input" autoComplete="off" value={nameB} onChange={(e) => setNameB(e.target.value)} />
            </div>
          </div>
          {error && <p className="info is-error" role="alert">{error}</p>}
          <button className="btn primary block" type="button" disabled={busy} onClick={createNew}>{busy ? 'Connexion au script…' : 'Relier mon téléphone'}</button>
        </main>
      </>
    );
  }

  if (step === 'join') {
    return (
      <>
        <SubHead title="Rejoindre" onBack={() => setStep('home')} />
        <main className="screen sub" style={{ paddingTop: 8 }}>
          {iosBrowser && inviteText && (
            <div className="info">
              <b>Sur iPhone : installe l'appli avant de rejoindre</b>
              <span>Copie le lien, ajoute PasD'Tal' à l'écran d'accueil (Partager, puis « Sur l'écran d'accueil »), ouvre-la, puis colle le lien ici.</span>
              <button className="btn sm" type="button" style={{ alignSelf: 'flex-start', marginTop: 6 }} onClick={async () => toast((await copyText(inviteText, area.current)) ? 'Lien copié' : 'Lien sélectionné : copie-le')}>
                <IconCopy />Copier le lien
              </button>
            </div>
          )}
          <div className="field">
            <label className="flabel" htmlFor="s-inv">Lien d'invitation</label>
            <textarea id="s-inv" ref={area} className="input" placeholder="Colle ici le lien reçu de ta sœur" value={inviteText} onChange={(e) => setInviteText(e.target.value)} />
          </div>
          {error && <p className="info is-error" role="alert">{error}</p>}
          <button className="btn primary block" type="button" disabled={busy || !inviteText.trim()} onClick={join}>{busy ? 'Connexion…' : 'Continuer'}</button>
        </main>
      </>
    );
  }

  // step === 'who'
  return (
    <>
      <SubHead title="Qui es-tu ?" onBack={() => setStep('join')} />
      <main className="screen sub" style={{ paddingTop: 8 }}>
        <p>Choisis ton prénom. L'autre budget sera celui de ta sœur.</p>
        {snap && <Seg<MemberKey> wide items={[['a', snap.members.a.name], ['b', snap.members.b.name]]} value={who} onChange={setWho} label="Qui es-tu ?" />}
        <button
          className="btn primary block"
          type="button"
          onClick={() => {
            if (!invite) return;
            store.finishJoin(invite, who);
            toast(`Bienvenue ${snap?.members[who].name ?? ''} !`);
            onDone(false);
          }}
        >
          C'est parti
        </button>
      </main>
    </>
  );
}
