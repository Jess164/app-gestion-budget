import { Component, type ErrorInfo, type ReactNode } from 'react';

interface State {
  error: Error | null;
  detail: string;
}

/** Affiche le problème au lieu d'un écran vide, avec de quoi recharger et copier le détail pour le signaler. */
export class ErrorScreen extends Component<{ children: ReactNode }, State> {
  state: State = { error: null, detail: '' };

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    const lines = (text: string | null | undefined, n: number) =>
      (text || '').trim().split('\n').slice(0, n).map((l) => l.trim());
    const stack = lines(error.stack, 4).filter((l) => l.startsWith('at '));
    const where = lines(info.componentStack, 3);
    this.setState({
      detail: [`${error.name}: ${error.message}`, ...stack, '—', ...where, navigator.userAgent].join('\n')
    });
  }

  render() {
    if (!this.state.error) return this.props.children;
    const detail = this.state.detail || `${this.state.error.name}: ${this.state.error.message}`;
    return (
      <div className="app">
        <main className="screen sub">
          <h1 className="title-hand"><span className="hl">Oups</span></h1>
          <p>L'appli a rencontré un problème. Tes données ne sont pas perdues : elles sont gardées sur ton téléphone.</p>
          <p className="muted sm">Fais une capture de cet écran pour la montrer, puis recharge l'appli.</p>
          <pre className="info" style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontSize: 12, margin: 0 }}>{detail}</pre>
          <button className="btn primary block" type="button" onClick={() => window.location.reload()}>
            Recharger l'appli
          </button>
        </main>
      </div>
    );
  }
}
