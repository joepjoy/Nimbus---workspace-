import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { api } from '../services/api';
import type { Workspace } from '../types';

interface WorkspaceState {
  workspaces: Workspace[];
  current: Workspace | null;
  loading: boolean;
  select: (id: string) => void;
  reload: (selectId?: string) => Promise<void>;
}

const WorkspaceContext = createContext<WorkspaceState | null>(null);
const KEY = 'nimbus.workspace';

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [currentId, setCurrentId] = useState<string | null>(() => localStorage.getItem(KEY));
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async (selectId?: string) => {
    const list = await api.get<Workspace[]>('/workspaces');
    setWorkspaces(list);
    setCurrentId((prev) => {
      const wanted = selectId ?? prev;
      const next = list.find((w) => w.id === wanted)?.id ?? list[0]?.id ?? null;
      if (next) localStorage.setItem(KEY, next);
      else localStorage.removeItem(KEY);
      return next;
    });
  }, []);

  useEffect(() => {
    reload().finally(() => setLoading(false));
  }, [reload]);

  const select = useCallback((id: string) => {
    localStorage.setItem(KEY, id);
    setCurrentId(id);
  }, []);

  const current = workspaces.find((w) => w.id === currentId) ?? null;
  const value = useMemo(() => ({ workspaces, current, loading, select, reload }), [workspaces, current, loading, select, reload]);
  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>;
}

export function useWorkspace() {
  const ctx = useContext(WorkspaceContext);
  if (!ctx) throw new Error('useWorkspace must be used inside WorkspaceProvider');
  return ctx;
}
