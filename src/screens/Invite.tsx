import { useRef } from 'react';
import { other } from '../domain/types';
import { inviteLink } from '../data/invite';
import { useStore } from '../data/store';
import { IconCopy } from '../ui/icons';
import { SubHead, copyText, toast } from '../ui/kit';

export function Invite({ fresh, onBack }: { fresh?: boolean; onBack: () => void }) {
  const store = useStore();
  const cfg = store.config!;
  const her = store.snapshot().members[other(cfg.me)];
  const link = inviteLink(window.location.href, { url: cfg.url, code: cfg.code, who: other(cfg.me) });
  const area = useRef<HTMLTextAreaElement>(null);

  return (
    <>
      <SubHead title="Inviter ma sœur" onBack={onBack} />
      <main className="screen sub" style={{ paddingTop: 8 }}>
        {fresh && (
          <div className="info">
            <b>C'est prêt !</b>
            <span>Ton téléphone est relié à ton script Google. Il ne reste qu'à inviter {her.name}.</span>
          </div>
        )}
        <p>
          Envoie ce lien à {her.name} par SMS ou WhatsApp. Il donne accès à vos données : ne l'envoie qu'à elle.
        </p>
        <textarea ref={area} className="input" readOnly value={link} aria-label="Lien d'invitation" onFocus={(e) => e.target.select()} />
        <button
          className="btn primary block"
          type="button"
          onClick={async () => toast((await copyText(link, area.current)) ? 'Lien copié' : 'Lien sélectionné : copie-le avec ton téléphone')}
        >
          <IconCopy />Copier le lien
        </button>
        <section className="card">
          <h2>Sur iPhone</h2>
          <ol className="steps">
            <li>Ouvre le lien dans Safari.</li>
            <li>Touche le bouton Partager, puis « Sur l'écran d'accueil ».</li>
            <li>Ouvre PasD'Tal' depuis la nouvelle icône.</li>
            <li>Choisis « J'ai un lien d'invitation » et colle le lien.</li>
          </ol>
        </section>
        <section className="card">
          <h2>Sur Android</h2>
          <ol className="steps">
            <li>Ouvre le lien dans Chrome et choisis qui tu es.</li>
            <li>Menu ⋮ puis « Installer l'application » (ou « Ajouter à l'écran d'accueil »).</li>
          </ol>
        </section>
      </main>
    </>
  );
}
