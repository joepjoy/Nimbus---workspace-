import { Building2, Check, Plus, Users } from 'lucide-react';
import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { ActivityList } from '../components/ActivityList';
import { EmptyState, ErrorBox, Field, Modal, PageHeader, RoleBadge, Spinner } from '../components/ui';
import { useAsync } from '../hooks/useAsync';
import { useWorkspace } from '../hooks/useWorkspace';
import { api, errorMessage } from '../services/api';
import { formatDate } from '../services/format';
import type { Activity, Workspace } from '../types';

function CreateWorkspaceModal({ onClose }: { onClose: () => void }) {
  const { reload } = useWorkspace();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const ws = await api.post<Workspace>('/workspaces', { name, description });
      await reload(ws.id);
      onClose();
      navigate('/app/dashboard');
    } catch (err) {
      setError(errorMessage(err));
      setBusy(false);
    }
  }

  return (
    <Modal title="Create workspace" onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        {error && <ErrorBox message={error} />}
        <Field label="Workspace name"><input className="input" required minLength={2} autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Marketing team" /></Field>
        <Field label="Description"><textarea className="input min-h-20" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What is this workspace for?" /></Field>
        <div className="flex justify-end gap-2">
          <button type="button" className="btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn-primary" disabled={busy}>{busy && <Spinner className="h-4 w-4" />} Create workspace</button>
        </div>
      </form>
    </Modal>
  );
}

export default function Workspaces() {
  const { workspaces, current, select } = useWorkspace();
  const [params, setParams] = useSearchParams();
  const [creating, setCreating] = useState(params.get('new') === '1');
  const navigate = useNavigate();

  useEffect(() => {
    if (params.get('new') === '1') setCreating(true);
  }, [params]);

  const close = () => {
    setCreating(false);
    if (params.has('new')) setParams({}, { replace: true });
  };

  const { data: activity } = useAsync(
    () => (current ? api.get<Activity[]>(`/workspaces/${current.id}/activities`, { limit: 8 }) : Promise.resolve([])),
    [current?.id],
  );

  return (
    <div className="fade-up">
      <PageHeader
        title="Workspace"
        subtitle="Switch between workspaces or create a new one."
        actions={<button className="btn-primary" onClick={() => setCreating(true)}><Plus className="h-4 w-4" /> New workspace</button>}
      />

      {workspaces.length === 0 ? (
        <EmptyState
          icon={<Building2 className="h-10 w-10" />}
          title="Create your first workspace"
          text="A workspace is where your team's projects and tasks live. You can invite teammates afterwards."
          action={<button className="btn-primary" onClick={() => setCreating(true)}><Plus className="h-4 w-4" /> Create workspace</button>}
        />
      ) : (
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="grid content-start gap-4 sm:grid-cols-2 lg:col-span-2">
            {workspaces.map((w) => {
              const active = w.id === current?.id;
              return (
                <div key={w.id} className={`card p-5 ${active ? 'ring-1 ring-brand/60' : ''}`}>
                  <div className="flex items-start justify-between gap-2">
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-violet to-cyan font-bold text-white">{w.name[0]?.toUpperCase()}</span>
                    <RoleBadge role={w.myRole} />
                  </div>
                  <h3 className="mt-3 truncate font-semibold text-white">{w.name}</h3>
                  <p className="mt-1 line-clamp-2 min-h-10 text-sm text-muted">{w.description || 'No description'}</p>
                  <div className="mt-3 flex items-center gap-4 text-xs text-muted">
                    <span className="flex items-center gap-1"><Users className="h-3.5 w-3.5" /> {w._count?.members ?? 0} members</span>
                    <span>{w._count?.projects ?? 0} projects</span>
                    <span className="ml-auto">{formatDate(w.createdAt)}</span>
                  </div>
                  <div className="mt-4 flex gap-2">
                    {active ? (
                      <span className="btn-ghost flex-1 cursor-default text-cyan"><Check className="h-4 w-4" /> Current</span>
                    ) : (
                      <button className="btn-ghost flex-1" onClick={() => select(w.id)}>Switch to</button>
                    )}
                    <button className="btn-primary flex-1" onClick={() => { select(w.id); navigate('/app/dashboard'); }}>Open</button>
                  </div>
                </div>
              );
            })}
          </div>

          <section className="card h-fit p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-semibold text-white">{current?.name} activity</h2>
              <Link to="/app/settings" className="text-sm text-cyan hover:underline">Settings</Link>
            </div>
            <ActivityList items={activity ?? []} />
          </section>
        </div>
      )}

      {creating && <CreateWorkspaceModal onClose={close} />}
    </div>
  );
}
