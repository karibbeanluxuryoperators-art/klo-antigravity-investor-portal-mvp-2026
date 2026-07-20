// ── KLO ErrorBoundary ─────────────────────────────────────────────────────────
// Wraps any subtree so that a runtime error during render no longer produces
// a silent white page. Instead we show the error stack + a "reload" button
// plus a link to the home page. This is the v1.7.2 hardening for the supplier
// + admin gates, where a single thrown import / undefined access used to take
// down the whole route and leave the user staring at a blank screen.
//
// v1.7.2 also adds a "diagnostic panel" mode via the `showDiagnostic` prop.
// When true, the boundary shows the last known /api/config status so we can
// tell at a glance whether Supabase is reachable from the user's browser.
//
// Implementation note: we keep React.Component as a class (the only reliable
// way to catch render errors) but don't use `this.props`/`this.state` typings
// from React types — we cast around the missing @types/react install so the
// boundary itself doesn't introduce a type error.

import React, { useState, useCallback } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

interface ErrorBoundaryProps {
  children: React.ReactNode;
  /** What the user was trying to do — shown in the error card. */
  context?: string;
  /** Show a small diagnostic panel (api config status, gate state). */
  showDiagnostic?: boolean;
}

interface CaughtError {
  error: Error;
  componentStack: string | null;
}

interface ErrorCatcherProps {
  children: React.ReactNode;
  onError: (info: CaughtError) => void;
}

// We intentionally do NOT type this with React.Component. With React 19
// installed but no @types/react in the project, `React.Component<P, S>` is
// `any`, and the `this.props` / `this.state` typings vanish. Casting the
// instance to a typed local interface is the cleanest path.
interface CatcherInstance {
  props: ErrorCatcherProps;
  state: { hasError: boolean };
  setState: (next: { hasError: boolean }) => void;
}

class RawErrorCatcher extends React.Component {
  state = { hasError: false };

  static getDerivedStateFromError(): { hasError: boolean } {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo): void {
    const inst = this as unknown as CatcherInstance;
    inst.props.onError({ error, componentStack: info.componentStack ?? null });
  }

  render(): React.ReactNode {
    const inst = this as unknown as CatcherInstance;
    if (inst.state.hasError) {
      // The actual error UI is rendered by the parent <ErrorBoundary>;
      // this component just signals that the catch happened.
      return null;
    }
    return inst.props.children;
  }
}

export const ErrorBoundary: React.FC<ErrorBoundaryProps> = ({ children, context, showDiagnostic }) => {
  const [caught, setCaught] = useState<CaughtError | null>(null);
  const [configStatus, setConfigStatus] = useState<'unknown' | 'ok' | 'missing' | 'error'>('unknown');
  const [configMessage, setConfigMessage] = useState<string>('');

  const probeConfig = useCallback(async () => {
    try {
      const res = await fetch('/api/config', { cache: 'no-store' });
      if (!res.ok) {
        setConfigStatus('error');
        setConfigMessage(`HTTP ${res.status}`);
        return;
      }
      const data = await res.json();
      const url = data?.supabase?.url;
      const key = data?.supabase?.anonKey;
      if (!url || !key) {
        setConfigStatus('missing');
        setConfigMessage('no url/anonKey in response');
        return;
      }
      setConfigStatus('ok');
      setConfigMessage(url);
    } catch (e: any) {
      setConfigStatus('error');
      setConfigMessage(e?.message || 'fetch failed');
    }
  }, []);

  const handleError = useCallback(
    (info: CaughtError) => {
      // eslint-disable-next-line no-console
      console.error('[ErrorBoundary] caught:', info.error, info.componentStack);
      setCaught(info);
      if (showDiagnostic && configStatus === 'unknown') {
        void probeConfig();
      }
    },
    [showDiagnostic, configStatus, probeConfig]
  );

  if (caught) {
    const { error, componentStack } = caught;
    const ctx = context || 'this page';
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center px-6 py-12">
        <div className="max-w-xl w-full bg-white border border-slate-100 shadow-sm rounded-2xl p-8 md:p-10 space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-red-50 rounded-full flex items-center justify-center text-red-500 shrink-0">
              <AlertTriangle size={24} />
            </div>
            <div>
              <p className="text-[10px] font-sans uppercase tracking-[0.4em] text-red-500 font-semibold">
                Runtime error
              </p>
              <h1 className="text-2xl md:text-3xl font-serif italic text-slate-900 leading-tight mt-1">
                {ctx} failed to load
              </h1>
            </div>
          </div>

          <p className="text-sm text-slate-600 leading-relaxed font-light">
            Something on this page threw an error before it could render. Try
            reloading (a fresh fetch often clears it) or head back to the home
            page. If this keeps happening, the KLO team has the full error in
            the browser console.
          </p>

          <details className="bg-slate-50 border border-slate-100 rounded-xl p-4 text-xs text-slate-700 font-mono">
            <summary className="cursor-pointer text-slate-500 font-sans text-[10px] uppercase tracking-[0.3em] font-semibold">
              Error details
            </summary>
            <div className="mt-3 space-y-2 whitespace-pre-wrap break-words">
              <div>
                <strong className="text-red-600">{error.name}:</strong> {error.message}
              </div>
              {componentStack && (
                <div className="text-[10px] text-slate-500 leading-relaxed">
                  {componentStack.split('\n').slice(0, 8).join('\n')}
                </div>
              )}
            </div>
          </details>

          {showDiagnostic && (
            <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 text-xs">
              <p className="text-[10px] font-sans uppercase tracking-[0.3em] text-slate-500 font-semibold mb-2">
                Diagnostic
              </p>
              <div className="space-y-1 font-mono text-[11px] text-slate-700">
                <div>
                  <span className="text-slate-400">GET /api/config →</span>{' '}
                  <span
                    className={
                      configStatus === 'ok'
                        ? 'text-emerald-600 font-semibold'
                        : configStatus === 'missing' || configStatus === 'error'
                          ? 'text-red-600 font-semibold'
                          : 'text-slate-500'
                    }
                  >
                    {configStatus}
                  </span>
                  {configMessage && (
                    <span className="text-slate-500"> — {configMessage}</span>
                  )}
                </div>
                <div>
                  <span className="text-slate-400">window.location →</span>{' '}
                  <span className="text-slate-700">{window.location.pathname}</span>
                </div>
                <div>
                  <span className="text-slate-400">userAgent →</span>{' '}
                  <span className="text-slate-500 break-all">{navigator.userAgent}</span>
                </div>
              </div>
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <button
              onClick={() => window.location.reload()}
              className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-[#B8963E] text-white rounded-full text-[10px] font-sans uppercase tracking-[0.3em] font-semibold hover:bg-slate-900 transition-all"
            >
              <RefreshCw size={12} /> Reload page
            </button>
            <button
              onClick={() => { window.location.href = '/'; }}
              className="inline-flex items-center justify-center gap-2 px-6 py-3 border border-slate-200 text-slate-700 rounded-full text-[10px] font-sans uppercase tracking-[0.3em] font-semibold hover:bg-slate-900 hover:text-white hover:border-slate-900 transition-all"
            >
              <Home size={12} /> Back to home
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <RawErrorCatcher onError={handleError}>{children}</RawErrorCatcher>
  );
};
