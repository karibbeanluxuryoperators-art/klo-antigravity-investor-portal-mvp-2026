import './index.css';
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

// v1.8.0 Sprint H1: Sentry observability for the React app.
// Guarded on VITE_SENTRY_DSN so the app boots and runs normally when the
// env var is missing (e.g. local dev, preview before secrets are set).
// Set VITE_SENTRY_DSN in Vercel env vars to enable.
const sentryDsn = (import.meta as any).env?.VITE_SENTRY_DSN;
if (sentryDsn) {
  // Dynamic import keeps @sentry/react out of the initial bundle when DSN is
  // absent. The await is fire-and-forget on the first render; errors are
  // reported once Sentry finishes initializing.
  import('@sentry/react').then((Sentry) => {
    Sentry.init({
      dsn: sentryDsn,
      integrations: [
        Sentry.browserTracingIntegration(),
      ],
      tracesSampleRate: 0.1,
      environment: (import.meta as any).env?.MODE || 'development',
      sendDefaultPii: false,
    });
    console.log('[sentry] frontend init OK');
  }).catch((e) => {
    console.warn('[sentry] frontend init failed:', e?.message || e);
  });
}

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
