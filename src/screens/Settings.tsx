import { useState } from 'react';
import { categoriesOf, categoryInUse } from '../domain/budget';
import { PALETTE } from '../domain/defaults';
import { numToInput, parseAmount } from '../domain/money';
import { other, type CategoryRec, type MemberRec, type PrefsRec } from '../domain/types';
import { newId } from '../data/ids';
import { useStore, type ThemeMode } from '../data/store';
import { IconPlus } from '../ui/icons';
import { Seg, Sheet, SubHead, toast } from '../ui/kit';
import { SyncLine } from './Budget';

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

export function Settings(props: { onBack: () => void; onInvite: () => void; systemDark: boolean }) {
  const store = useStore();
  const s = store.snapshot();
  const me = store.config!.me;
  const mine = s.members[me];
  const hers = s.members[other(me)];
  const cats = categoriesOf(s, me);
  const [open, setOpen] = useState<string | null>(null);
  const [toDelete, setToDelete] = useState<CategoryRec | null>(null);
  const [forget, setForget] = useState(false);

  const saveMember = (m: MemberRec, patch: Partial<MemberRec>) => { store.put<MemberRec>({ ...m, ...patch }); toast('Enregistré'); };
  const savePrefs = (patch: Partial<PrefsRec>) => store.put<PrefsRec>({ ...s.prefs, ...patch });
  const saveCat = (c: CategoryRec, patch: Partial<CategoryRec>) => { store.put<CategoryRec>({ ...c, ...patch }); };

  function addCategory() {
    const used = new Set(cats.map((c) => c.color));
    const color = PALETTE.find((p) => !used.has(p)) ?? PALETTE[0];
    const c = store.put<CategoryRec>({ id: newId('cat'), type: 'category', owner: me, name: 'Nouvelle catégorie', color, plafond: null, order: cats.length });
    setOpen(c.id);
    setTimeout(() => document.getElementById(`name-${c.id}`)?.focus(), 50);
  }

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
            {cats.map((c) => (
              <div className="cat-set" key={c.id} style={{ ['--c' as string]: c.color }}>
                <button className="color-btn" type="button" aria-expanded={open === c.id} aria-label={`Couleur de ${c.name}`} onClick={() => setOpen(open === c.id ? null : c.id)} />
                <CommitInput id={`name-${c.id}`} label={`Nom de ${c.name}`} value={c.name} onCommit={(v) => v.trim() && saveCat(c, { name: v.trim() })} />
                <CommitInput label={`Plafond de ${c.name}`} inputMode="decimal" placeholder="Aucun" value={c.plafond ? numToInput(c.plafond) : ''} onCommit={(v) => saveCat(c, { plafond: parseAmount(v) })} />
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
            ))}
          </div>
          <button className="btn dashed block" type="button" onClick={addCategory}><IconPlus />Nouvelle catégorie</button>
        </section>

        <section className="card">
          <h2 className="set-title">Synchro</h2>
          <SyncLine store={store} />
          <button className="btn block" type="button" onClick={() => void store.syncNow()}>Synchroniser maintenant</button>
          <button className="btn primary block" type="button" onClick={props.onInvite}>Inviter ma sœur</button>
          <button className="link-btn" type="button" onClick={() => setForget(true)}>Déconnecter ce téléphone</button>
        </section>
        <p className="foot-note">PasD'Tal' · étape 1 · tes données restent dans ton Google Drive.</p>
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
            {categoryInUse(s, toDelete.id) ? 'Ses dépenses ne disparaissent pas : elles seront rangées dans « Autre ».' : 'Aucune dépense ne l\'utilise.'}
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
