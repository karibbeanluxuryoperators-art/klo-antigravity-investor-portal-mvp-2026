// hooks/useArchive.ts
// v1.8.0 Step 14: shared hook for soft-delete (archive / restore) + show-archived toggle.
//
// Usage:
//   const { showArchived, setShowArchived, archive, restore, isArchiving, isRestoring } =
//     useArchive({ table: 'leads', bearer, onAfterChange: fetchRows });
//   ...
//   <ShowArchivedToggle value={showArchived} onChange={setShowArchived} lang={lang} />
//   <ArchiveButton row={row} isArchived={!!row.archived_at} onArchive={archive} onRestore={restore} lang={lang} />
//
// Why a hook + components, not a one-off implementation per tab:
//   - 4 management components (Leads, Clients, Suppliers, EntityEditor) need the same pattern
//   - 12 endpoints (6 entities × archive/restore) all need the same Bearer auth + error handling
//   - One source of truth for the API URL shape (/api/{table}/:id/archive, /restore)
//
// The hook is admin-only — archive/restore endpoints already check role='admin' server-side.

import { useCallback, useEffect, useState } from 'react';

export type ArchiveTable = 'leads' | 'clients' | 'suppliers' | 'assets' | 'experiences' | 'bookings';

interface UseArchiveOpts {
  /** The table the rows belong to. Used to build the endpoint URL. */
  table: ArchiveTable;
  /** Bearer token from the Supabase session, or null if not signed in. */
  bearer: string | null;
  /** Optional callback fired AFTER every successful archive/restore so the caller can refetch rows. */
  onAfterChange?: () => void | Promise<void>;
}

export interface UseArchiveReturn {
  /** When true, list fetches should pass ?include_archived=true. */
  showArchived: boolean;
  setShowArchived: (v: boolean) => void;
  /** Archive a single row. Returns the API response or throws on error. */
  archive: (id: string) => Promise<{ success: boolean; already_archived?: boolean; archived_at?: string }>;
  /** Restore a single archived row. */
  restore: (id: string) => Promise<{ success: boolean; already_active?: boolean }>;
  /** True while an archive/restore request is in flight (for UI spinners). */
  busyId: string | null;
}

export function useArchive({ table, bearer, onAfterChange }: UseArchiveOpts): UseArchiveReturn {
  // showArchived default = false. Persisted in localStorage so it survives navigation
  // across /admin sub-pages. Keyed by table so Leads can be "show archived" while
  // Clients stays "active only" — independent toggles.
  const storageKey = `klo.showArchived.${table}`;
  const [showArchived, setShowArchivedState] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return window.localStorage?.getItem(storageKey) === 'true';
  });
  const setShowArchived = useCallback((v: boolean) => {
    setShowArchivedState(v);
    try { window.localStorage?.setItem(storageKey, v ? 'true' : 'false'); } catch { /* ignore quota / private mode */ }
  }, [storageKey]);

  const [busyId, setBusyId] = useState<string | null>(null);

  const callEndpoint = useCallback(async (id: string, action: 'archive' | 'restore') => {
    if (!bearer) throw new Error('Not signed in');
    setBusyId(id);
    try {
      const res = await fetch(`/api/${table}/${id}/${action}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${bearer}` },
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `HTTP ${res.status}`);
      }
      const data = await res.json();
      if (onAfterChange) await onAfterChange();
      return data;
    } finally {
      setBusyId(null);
    }
  }, [table, bearer, onAfterChange]);

  const archive = useCallback((id: string) => callEndpoint(id, 'archive'), [callEndpoint]);
  const restore = useCallback((id: string) => callEndpoint(id, 'restore'), [callEndpoint]);

  // Defensive: if bearer goes away (user signed out), drop the local state so a
  // subsequent archive attempt doesn't get stuck. We don't auto-fetch; that's
  // the caller's responsibility.
  useEffect(() => {
    if (!bearer && busyId) setBusyId(null);
  }, [bearer, busyId]);

  return { showArchived, setShowArchived, archive, restore, busyId };
}
