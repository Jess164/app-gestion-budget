import '@fontsource-variable/caveat';
import '@fontsource-variable/space-grotesk';
import './styles.css';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import { App } from './App';
import { ErrorScreen } from './ui/ErrorScreen';

// Met l'appli à jour toute seule quand une nouvelle version est publiée.
registerSW({ immediate: true });

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorScreen>
      <App />
    </ErrorScreen>
  </StrictMode>
);
