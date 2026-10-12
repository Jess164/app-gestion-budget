import { useEffect, useState } from 'react';
import { categoriesOf, categoryInUse } from '../domain/budget';
import { PALETTE } from '../domain/defaults';
import { numToInput, parseAmount } from '../domain/money';
import { other, type CategoryRec, type MemberRec, type Owner, type PrefsRec } from '../domain/types';
import { newId } from '../data/ids';
import { useStore, type ThemeMode } from '../data/store';
import { IconPlus } from '../ui/icons';
import { Seg, Sheet, SubHead, toast } from '../ui/kit';
import { SyncLine } from './Budget';
import { isIOS } from './Setup';
import { dateShort } from '../domain/dates';
import { askPermission, permission, testNotification, upcoming, type Permission } from '../native/alerts';
import { BUILD, isAndroidBrowser, isNative } from '../native/platform';
import { apkUrl, type RemoteVersion } from '../native/update';

/** Champ qui n'enregistre qu'en quittant la saisie, pour ne pas synchroniser à chaque lettre. */
function CommitInput(props: {
  id?: string;
  value: string;
  onCommit: (v: string) => void;
  placeholder?: string;
  inputMode?: 'decimal' | 'text';
  label?: string;
}) {
  const [draft, setDraft] = useState(props.value);
  const [seen, setSeen] = useState(props.value);
  if (props.value !== seen) {
    setSeen(props.value);
    setDraft(props.value);
  }
  return (
    <input
      id={props.id}
      className="input"
      aria-label={props.label}
      inputMode={props.inputMode}
      placeholder={props.placeholder}
      autoComplete="off"
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={() => draft !== props.value && props.onCommit(draft)}
      onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
    />
  );
}

export function Settings(props: { onBack: () => void; onInvite: () => void; systemDark: boolean; today: string; apkUpdate?: RemoteVersion | null }) {
  const store = useStore();
  const s = store.snapshot();
  const me = store.config!.me;
  const mine = s.members[me];
  const hers = s.members[other(me)];
  const cats = categoriesOf(s, me);
  const communCats = categoriesOf(s, 'commun');
  const [open, setOpen] = useState<string | null>(null);
  const [toDelete, setToDelete] = useState<CategoryRec | null>(null);
  const [forget, setForget] = useState(false);

  const saveMember = (m: MemberRec, patch: Partial<MemberRec>) => { store.put<MemberRec>({ ...m, ...patch }); toast('Enregistré'); };
  const savePrefs = (patch: Partial<PrefsRec>) => store.put<PrefsRec>({ ...s.prefs, ...patch });
  const saveCat = (c: CategoryRec, patch: Partial<CategoryRec>) => { store.put<CategoryRec>({ ...c, ...patch }); };

  function addCategory(owner: Owner) {
    const list = owner === 'commun' ? communCats : cats;
    const used = new Set(list.map((c) => c.color));
    const color = PALETTE.find((p) => !used.has(p)) ?? PALETTE[0];
    const order = list.reduce((m, c) => Math.max(m, c.order + 1), 0);
    const c = store.put<CategoryRec>({ id: newId('cat'), type: 'category', owner, name: 'Nouvelle catégorie', color, plafond: null, order });
    setOpen(c.id);
    setTimeout(() => document.getElementById(`name-${c.id}`)?.focus(), 50);
  }

  const catRow = (c: CategoryRec, withCap: boolean) => (
    <div className={'cat-set' + (withCap ? '' : ' no-cap')} key={c.id} style={{ ['--c' as string]: c.color }}>
      <button className="color-btn" type="button" aria-expanded={open === c.id} aria-label={`Couleur de ${c.name}`} onClick={() => setOpen(open === c.id ? null : c.id)} />
      <CommitInput id={`name-${c.id}`} label={`Nom de ${c.name}`} value={c.name} onCommit={(v) => v.trim() && saveCat(c, { name: v.trim() })} />
      {withCap && (
        <CommitInput label={`Plafond de ${c.name}`} inputMode="decimal" placeholder="Aucun" value={c.plafond ? numToInput(c.plafond) : ''} onCommit={(v) => saveCat(c, { plafond: parseAmount(v) })} />
      )}
      {open === c.id && (
        <div className="cat-edit">
          <div className="palette" role="group" aria-label="Choisir une couleur">
            {PALETTE.map((p) => (
              <button key={p} type="button" style={{ ['--c' as string]: p }} aria-pressed={p === c.color} aria-label={`Couleur ${p}`} onClick={() => saveCat(c, { color: p })} />
            ))}
          </div>
          <button className="link-btn" type="button" style={{ alignSelf: 'flex-start' }} onClick={() => setToDelete(c)}>Supprimer « {c.name} »</button>
        </div>
      )}
    </div>
  );

  const modeText =
    store.mode === 'auto'
      ? `Suit le réglage de ton téléphone. En ce moment : mode ${props.systemDark ? 'sombre' : 'clair'}.`
      : `Toujours en mode ${store.mode === 'dark' ? 'sombre' : 'clair'}, quel que soit le réglage du téléphone.`;

  return (
    <>
      <SubHead title="Paramètres" onBack={props.onBack} />
      <main className="screen sub" style={{ paddingTop: 8 }}>
        <section className="stack">
          <h2 className="set-title">Apparence</h2>
          <Seg<ThemeMode> wide items={[['auto', 'Automatique'], ['light', 'Clair'], ['dark', 'Sombre']]} value={store.mode} onChange={(m) => store.setMode(m)} label="Apparence" />
          <p className="muted sm">{modeText}</p>
        </section>

        <section className="card">
          <h2 className="set-title">Vous deux</h2>
          <div className="field">
            <label className="flabel" htmlFor="p-me">Ton prénom</label>
            <CommitInput id="p-me" value={mine.name} onCommit={(v) => v.trim() && saveMember(mine, { name: v.trim() })} />
          </div>
          <div className="field">
            <label className="flabel" htmlFor="p-her">Prénom de ta sœur</label>
            <CommitInput id="p-her" value={hers.name} onCommit={(v) => v.trim() && saveMember(hers, { name: v.trim() })} />
          </div>
        </section>

        <section className="card">
          <h2 className="set-title">Mon budget</h2>
          <div className="field">
            <label className="flabel" htmlFor="p-plafond">Plafond du mois</label>
            <CommitInput id="p-plafond" inputMode="decimal" placeholder="Sans plafond" value={mine.plafond ? numToInput(mine.plafond) : ''} onCommit={(v) => saveMember(mine, { plafond: parseAmount(v) })} />
          </div>
          <div className="set-row">
            <span>Barre orange à partir de</span>
            <div className="stepper">
              <button className="icon-btn" type="button" aria-label="Moins 5 %" onClick={() => savePrefs({ seuil: Math.max(50, s.prefs.seuil - 5) })}>−</button>
              <output>{s.prefs.seuil}&nbsp;%</output>
              <button className="icon-btn" type="button" aria-label="Plus 5 %" onClick={() => savePrefs({ seuil: Math.min(95, s.prefs.seuil + 5) })}>+</button>
            </div>
          </div>
        </section>

        <section className="card">
          <h2 className="set-title">Mes catégories</h2>
          <p className="muted sm">Touche une couleur pour la changer ou supprimer la catégorie. Laisse le plafond vide pour ne pas en avoir.</p>
          <div>
            <div className="cat-set cat-set-head" aria-hidden="true"><span /><span>Nom</span><span>Plafond</span></div>
            {cats.map((c) => catRow(c, true))}
          </div>
          <button className="btn dashed block" type="button" onClick={() => addCategory(me)}><IconPlus />Nouvelle catégorie</button>
        </section>

        <section className="card">
          <h2 className="set-title">Catégories communes</h2>
          <p className="muted sm">Vous les modifiez toutes les deux. Le commun n'a pas de plafond.</p>
          <div>{communCats.map((c) => catRow(c, false))}</div>
          <button className="btn dashed block" type="button" onClick={() => addCategory('commun')}><IconPlus />Nouvelle catégorie commune</button>
        </section>

        {!isIOS() && <AlertsCard prefsDays={s.prefs.alerteJours} onDays={(d) => savePrefs({ alerteJours: d })} today={props.today} apkUpdate={props.apkUpdate} />}

        <section className="card">
          <h2 className="set-title">Synchro</h2>
          <SyncLine store={store} />
          <button className="btn block" type="button" onClick={() => void store.syncNow()}>Synchroniser maintenant</button>
          <button className="btn primary block" type="button" onClick={props.onInvite}>Inviter ma sœur</button>
          <button className="link-btn" type="button" onClick={() => setForget(true)}>Déconnecter ce téléphone</button>
        </section>
        <p className="foot-note">PasD'Tal'{BUILD ? ` · version 1.${BUILD}` : ''}{isNative() ? ' · APK Android' : ''} · tes données restent dans ton Google Drive.</p>
      </main>

      {toDelete && (
        <Sheet
          title={`Supprimer « ${toDelete.name} » ?`}
          onClose={() => setToDelete(null)}
          actions={
            <button className="btn block danger" type="button" onClick={() => { store.remove(toDelete.id); setToDelete(null); setOpen(null); toast('Catégorie supprimée'); }}>
              Supprimer la catégorie
            </button>
          }
        >
          <p className="muted">
            {categoryInUse(s, toDelete.id) ? 'Ses dépenses et abonnements ne disparaissent pas : ils seront rangés dans « Autre ».' : 'Aucune dépense ne l\'utilise.'}
          </p>
        </Sheet>
      )}
      {forget && (
        <Sheet
          title="Déconnecter ce téléphone ?"
          onClose={() => setForget(false)}
          actions={<button className="btn block danger" type="button" onClick={() => store.forget()}>Déconnecter</button>}
        >
          <p className="muted">
            L'appli oublie le lien avec le script Google sur ce téléphone.
            {store.pendingCount > 0 ? ` Attention : ${store.pendingCount} changement(s) pas encore synchronisé(s) seront perdus.` : ' Vos données restent dans ton Google Drive.'}
            {' '}Pour revenir, il faudra un lien d'invitation.
          </p>
        </Sheet>
      )}
    </>
  );
}

/** Les alertes avant la date limite de résiliation : réglages, et dans l'APK, la permission et les prochaines alertes. */
function AlertsCard(props: { prefsDays: number; onDays: (d: number) => void; today: string; apkUpdate?: RemoteVersion | null }) {
  const store = useStore();
  const [perm, setPerm] = useState<Permission>('unavailable');
  const native = isNative();
  useEffect(() => {
    if (native) void permission().then(setPerm);
  }, [native]);
  const next = native && store.config ? upcoming(store.snapshot(), store.config.me, props.today) : [];

  async function allow() {
    const p = await askPermission();
    setPerm(p);
    if (p !== 'granted') toast('Autorise les notifications de PasD\'Tal\' dans les réglages du téléphone');
  }

  return (
    <section className="card">
      <h2 className="set-title">Alertes</h2>
      {native && perm === 'granted' && <p className="info"><b>Notifications activées</b><span>Tu es prévenue à 9 h, le nombre de jours choisi avant chaque date limite de résiliation.</span></p>}
      {native && (perm === 'prompt' || perm === 'denied') && (
        <div className="info is-error">
          <b>Notifications bloquées</b>
          <span>{perm === 'denied' ? 'Autorise-les dans les réglages du téléphone : Applications, PasD\'Tal\', Notifications.' : 'Sans elles, tu ne seras pas prévenue.'}</span>
          <button className="btn sm" type="button" style={{ alignSelf: 'flex-start', marginTop: 6 }} onClick={() => void allow()}>Autoriser les notifications</button>
        </div>
      )}
      {!native && isAndroidBrowser() && (
        <div className="info">
          <b>Pour recevoir les alertes, installe l'APK</b>
          <span>Une fois l'APK téléchargé, ouvre-le et accepte l'installation. Puis, dans l'APK, relie ton téléphone avec un lien d'invitation (bouton « Inviter ma sœur » ici) ou avec le code secret du script.</span>
          <a className="btn sm primary" href={apkUrl()} download="pasdtal.apk" style={{ alignSelf: 'flex-start', marginTop: 6, textDecoration: 'none' }}>Télécharger l'APK</a>
        </div>
      )}
      <div className="set-row">
        <span>Délai d'alerte par défaut</span>
        <div className="stepper">
          <button className="icon-btn" type="button" aria-label="Un jour de moins" onClick={() => props.onDays(Math.max(0, props.prefsDays - 1))}>−</button>
          <output>{props.prefsDays}&nbsp;j</output>
          <button className="icon-btn" type="button" aria-label="Un jour de plus" onClick={() => props.onDays(Math.min(30, props.prefsDays + 1))}>+</button>
        </div>
      </div>
      <p className="muted sm">Pour les nouveaux abonnements. Tu peux le changer abonnement par abonnement.</p>
      {native && perm === 'granted' && (
        <>
          <h3 className="flabel">Prochaines alertes</h3>
          {next.length === 0 && <p className="muted sm">Aucune pour l'instant.</p>}
          <div className="list">
            {next.map((a) => (
              <div className="li" key={a.key}>
                <span className="li-main">
                  <span className="li-title">{a.title}</span>
                  <span className="li-sub">Le {dateShort(a.day, props.today)} à 9 h · date limite le {dateShort(a.deadline, props.today)}</span>
                </span>
              </div>
            ))}
          </div>
          <button className="btn block" type="button" onClick={async () => toast((await testNotification(props.prefsDays)) ? 'Notification envoyée dans 3 secondes' : 'Notifications bloquées')}>
            Tester une notification
          </button>
        </>
      )}
      {native && props.apkUpdate && (
        <a className="btn primary block" href={apkUrl()} style={{ textDecoration: 'none' }}>Télécharger la nouvelle version (1.{props.apkUpdate.build})</a>
      )}
    </section>
  );
}
