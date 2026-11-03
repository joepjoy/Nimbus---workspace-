import { CalendarDays, FolderKanban, Plus, Search } from 'lucide-react';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ProjectModal } from '../components/ProjectModal';
import { AvatarStack, EmptyState, ErrorBox, PageHeader, PageLoader, ProgressBar, ProjectStatusBadge } from '../components/ui';
import { useAsync } from '../hooks/useAsync';
import { useWorkspace } from '../hooks/useWorkspace';
import { api } from '../services/api';
import { formatDate, PROJECT_STATUSES } from '../services/format';
import type { Project } from '../types';

export default function Projects() {
  const { current } = useWorkspace();
  const navigate = useNavigate();
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('');
  const [creating, setCreating] = useState(false);
  const { data, loading, error } = useAsync(
    () => api.get<Project[]>('/projects', { workspaceId: current!.id, q: q || undefined, status: status || undefined }),
    [current?.id, q, status],
  );

  if (!current) return null;
  const filtered = !!q || !!status;

  return (
    <div className="fade-up">
      <PageHeader
        title="Projects"
        subtitle={`All projects in ${current.name}`}
        actions={<button className="btn-primary" onClick={() => setCreating(true)}><Plus className="h-4 w-4" /> New project</button>}
      />

      <div className="mb-5 flex flex-wrap gap-3">
        <div className="relative min-w-52 flex-1 sm:max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <input className="input pl-9" placeholder="Search projects" aria-label="Search projects" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <select className="input w-auto" aria-label="Filter by status" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">All statuses</option>
          {PROJECT_STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
      </div>

      {error && <ErrorBox message={error} />}
      {loading && !data ? (
        <PageLoader />
      ) : data && data.length === 0 ? (
        <EmptyState
          icon={<FolderKanban className="h-10 w-10" />}
          title={filtered ? 'No projects match your filters' : 'No projects yet'}
          text={filtered ? 'Try a different search or status.' : 'Create a project to start organising tasks.'}
          action={!filtered && <button className="btn-primary" onClick={() => setCreating(true)}><Plus className="h-4 w-4" /> Create project</button>}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {data?.map((p) => (
            <Link key={p.id} to={`/app/projects/${p.id}`} className="card block p-5 transition hover:-translate-y-0.5 hover:border-brand/50">
              <div className="flex items-start justify-between gap-2">
                <h3 className="truncate font-semibold text-white">{p.name}</h3>
                <ProjectStatusBadge status={p.status} />
              </div>
              <p className="mt-1 line-clamp-2 min-h-10 text-sm text-muted">{p.description || 'No description'}</p>
              <div className="mt-4">
                <div className="mb-1.5 flex justify-between text-xs text-muted"><span>{p.completedTasks}/{p.totalTasks} tasks</span><span>{p.progress}%</span></div>
                <ProgressBar value={p.progress} />
              </div>
              <div className="mt-4 flex items-center justify-between text-xs text-muted">
                <AvatarStack names={p.members.map((m) => m.name)} />
                <span className="flex items-center gap-1"><CalendarDays className="h-3.5 w-3.5" /> {formatDate(p.dueDate)}</span>
              </div>
            </Link>
          ))}
        </div>
      )}

      {creating && (
        <ProjectModal workspaceId={current.id} onClose={() => setCreating(false)} onSaved={(p) => { setCreating(false); navigate(`/app/projects/${p.id}`); }} />
      )}
    </div>
  );
}
