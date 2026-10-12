import '@fontsource-variable/caveat';
import '@fontsource-variable/space-grotesk';
import './styles.css';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import { App } from './App';
import { ErrorScreen } from './ui/ErrorScreen';
import { isNative } from './native/platform';

// Met l'appli web à jour toute seule quand une nouvelle version est publiée. L'APK, lui, contient déjà tous ses fichiers.
if (!isNative()) registerSW({ immediate: true });

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorScreen>
      <App />
    </ErrorScreen>
  </StrictMode>
);
