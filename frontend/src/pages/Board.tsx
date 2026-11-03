import { CalendarDays, Plus, Search } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { TaskModal } from '../components/TaskModal';
import { Avatar, ErrorBox, PageHeader, PageLoader, PriorityBadge } from '../components/ui';
import { useAsync } from '../hooks/useAsync';
import { useWorkspace } from '../hooks/useWorkspace';
import { api, errorMessage } from '../services/api';
import { formatDate, isOverdue, PRIORITIES, TASK_STATUSES } from '../services/format';
import type { Member, Project, Task, TaskStatus } from '../types';

export default function Board() {
  const { current } = useWorkspace();
  const [params, setParams] = useSearchParams();
  const [q, setQ] = useState('');
  const [debouncedQ, setDebouncedQ] = useState('');
  const [priority, setPriority] = useState('');
  const [assignee, setAssignee] = useState('');
  const projectId = params.get('projectId') ?? '';
  const [creating, setCreating] = useState<TaskStatus | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);
  const [overCol, setOverCol] = useState<TaskStatus | null>(null);
  const [moveError, setMoveError] = useState('');

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(q), 250);
    return () => clearTimeout(t);
  }, [q]);

  const wsId = current?.id;
  const filters = useAsync(async () => {
    const [projects, members] = await Promise.all([
      api.get<Project[]>('/projects', { workspaceId: wsId }),
      api.get<Member[]>(`/workspaces/${wsId}/members`),
    ]);
    return { projects, members };
  }, [wsId]);

  const tasks = useAsync(
    () => api.get<Task[]>('/tasks', { workspaceId: wsId, projectId: projectId || undefined, priority: priority || undefined, assignedTo: assignee || undefined, q: debouncedQ || undefined }),
    [wsId, projectId, priority, assignee, debouncedQ],
  );

  if (!current) return null;

  async function move(taskId: string, status: TaskStatus) {
    const prev = tasks.data;
    const task = prev?.find((t) => t.id === taskId);
    if (!prev || !task || task.status === status) return;
    setMoveError('');
    tasks.setData(prev.map((t) => (t.id === taskId ? { ...t, status } : t))); // optimistic
    try {
      await api.put(`/tasks/${taskId}`, { status });
    } catch (e) {
      tasks.setData(prev); // roll back
      setMoveError(errorMessage(e));
    }
  }

  const noProjects = filters.data && filters.data.projects.length === 0;

  return (
    <div className="fade-up">
      <PageHeader
        title="Task board"
        subtitle="Drag cards between columns to update their status."
        actions={<button className="btn-primary" onClick={() => setCreating('TODO')} disabled={!!noProjects}><Plus className="h-4 w-4" /> New task</button>}
      />

      <div className="mb-5 flex flex-wrap gap-3">
        <div className="relative min-w-48 flex-1 sm:max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <input className="input pl-9" placeholder="Search tasks" aria-label="Search tasks" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <select className="input w-auto" aria-label="Filter by project" value={projectId} onChange={(e) => setParams(e.target.value ? { projectId: e.target.value } : {})}>
          <option value="">All projects</option>
          {filters.data?.projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <select className="input w-auto" aria-label="Filter by assignee" value={assignee} onChange={(e) => setAssignee(e.target.value)}>
          <option value="">Anyone</option>
          <option value="unassigned">Unassigned</option>
          {filters.data?.members.map((m) => <option key={m.userId} value={m.userId}>{m.user.name}</option>)}
        </select>
        <select className="input w-auto" aria-label="Filter by priority" value={priority} onChange={(e) => setPriority(e.target.value)}>
          <option value="">Any priority</option>
          {PRIORITIES.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
        </select>
      </div>

      {(tasks.error || moveError) && <div className="mb-4"><ErrorBox message={moveError || tasks.error!} /></div>}
      {noProjects && <div className="mb-4 rounded-xl border border-line bg-surface/60 p-4 text-sm text-muted">Create a <Link to="/app/projects" className="text-cyan hover:underline">project</Link> first, then add tasks to it.</div>}

      {tasks.loading && !tasks.data ? (
        <PageLoader />
      ) : (
        <div className="-mx-4 flex snap-x gap-4 overflow-x-auto px-4 pb-4 sm:mx-0 sm:px-0 lg:grid lg:grid-cols-4 lg:overflow-visible">
          {TASK_STATUSES.map((col) => {
            const items = tasks.data?.filter((t) => t.status === col.value) ?? [];
            return (
              <section
                key={col.value}
                aria-label={col.label}
                onDragOver={(e) => { e.preventDefault(); setOverCol(col.value); }}
                onDragLeave={() => setOverCol((c) => (c === col.value ? null : c))}
                onDrop={(e) => { e.preventDefault(); setOverCol(null); const id = e.dataTransfer.getData('text/plain') || dragId; if (id) void move(id, col.value); setDragId(null); }}
                className={`w-72 shrink-0 snap-start rounded-2xl border bg-surface/60 p-3 transition lg:w-auto ${overCol === col.value ? 'border-brand bg-brand/5' : 'border-line'}`}
              >
                <div className="mb-3 flex items-center justify-between px-1">
                  <h2 className="flex items-center gap-2 text-sm font-semibold text-white">
                    <span className={`h-2.5 w-2.5 rounded-full ${col.color}`} /> {col.label}
                    <span className="rounded-full bg-bg px-2 py-0.5 text-xs font-normal text-muted">{items.length}</span>
                  </h2>
                  <button className="rounded-lg p-1 text-muted hover:bg-surface2 hover:text-white disabled:opacity-40" onClick={() => setCreating(col.value)} disabled={!!noProjects} aria-label={`Add task to ${col.label}`}>
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
                <div className="flex min-h-24 flex-col gap-2.5">
                  {items.map((t) => (
                    <article
                      key={t.id}
                      draggable
                      onDragStart={(e) => { e.dataTransfer.setData('text/plain', t.id); e.dataTransfer.effectAllowed = 'move'; setDragId(t.id); }}
                      onDragEnd={() => { setDragId(null); setOverCol(null); }}
                      className={`cursor-grab rounded-xl border border-line bg-surface2/80 p-3 transition hover:border-brand/50 active:cursor-grabbing ${dragId === t.id ? 'opacity-40' : ''}`}
                    >
                      <Link to={`/app/tasks/${t.id}`} draggable={false} className="block text-sm font-medium text-white hover:text-cyan">{t.title}</Link>
                      <p className="mt-0.5 truncate text-xs text-muted">{t.project.name}</p>
                      <div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1.5">
                        <PriorityBadge priority={t.priority} />
                        {t.dueDate && (
                          <span className={`flex items-center gap-1 whitespace-nowrap text-xs ${isOverdue(t.dueDate, t.status) ? 'font-semibold text-red-400' : 'text-muted'}`}>
                            <CalendarDays className="h-3 w-3" />{formatDate(t.dueDate)}
                          </span>
                        )}
                        <span className="ml-auto">{t.assignee ? <Avatar name={t.assignee.name} size="sm" /> : null}</span>
                      </div>
                      {/* Keyboard / touch friendly alternative to drag and drop */}
                      <select aria-label={`Move ${t.title}`} className="mt-3 w-full rounded-lg border border-line bg-bg/60 px-2 py-1 text-xs text-muted" value={t.status} onChange={(e) => move(t.id, e.target.value as TaskStatus)}>
                        {TASK_STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                      </select>
                    </article>
                  ))}
                  {items.length === 0 && <p className="rounded-xl border border-dashed border-line py-6 text-center text-xs text-muted">No tasks</p>}
                </div>
              </section>
            );
          })}
        </div>
      )}

      {creating && (
        <TaskModal workspaceId={current.id} defaultProjectId={projectId || undefined} defaultStatus={creating} onClose={() => setCreating(null)} onSaved={() => { setCreating(null); void tasks.reload(); }} />
      )}
    </div>
  );
}
