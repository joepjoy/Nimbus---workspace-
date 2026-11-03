import { ArrowLeft, CalendarDays, Pencil, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ActivityList } from '../components/ActivityList';
import { ProjectModal } from '../components/ProjectModal';
import { TaskModal } from '../components/TaskModal';
import { Avatar, EmptyState, ErrorBox, PageLoader, PriorityBadge, ProgressBar, ProjectStatusBadge, TaskStatusBadge } from '../components/ui';
import { useAsync } from '../hooks/useAsync';
import { useWorkspace } from '../hooks/useWorkspace';
import { api, errorMessage } from '../services/api';
import { formatDate, isAdmin, isOverdue } from '../services/format';
import type { Activity, Project, Task } from '../types';

export default function ProjectDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { current } = useWorkspace();
  const [editing, setEditing] = useState(false);
  const [addingTask, setAddingTask] = useState(false);
  const [actionError, setActionError] = useState('');

  const project = useAsync(() => api.get<Project>(`/projects/${id}`), [id]);
  const tasks = useAsync(() => api.get<Task[]>('/tasks', { projectId: id }), [id]);
  const activity = useAsync(
    () => (project.data ? api.get<Activity[]>(`/workspaces/${project.data.workspaceId}/activities`, { projectId: id, limit: 15 }) : Promise.resolve([])),
    [id, project.data?.workspaceId],
  );

  if (project.loading && !project.data) return <PageLoader />;
  if (project.error) return <div className="space-y-4"><ErrorBox message={project.error} /><Link to="/app/projects" className="btn-ghost">Back to projects</Link></div>;
  const p = project.data;
  if (!p) return null;

  const canDelete = isAdmin(current?.myRole);
  const refresh = () => { void project.reload(); void tasks.reload(); void activity.reload(); };

  async function remove() {
    if (!window.confirm(`Delete "${p!.name}" and all of its tasks? This cannot be undone.`)) return;
    try {
      await api.del(`/projects/${p!.id}`);
      navigate('/app/projects');
    } catch (e) {
      setActionError(errorMessage(e));
    }
  }

  return (
    <div className="fade-up">
      <Link to="/app/projects" className="mb-4 inline-flex items-center gap-1 text-sm text-muted hover:text-white"><ArrowLeft className="h-4 w-4" /> Projects</Link>

      <div className="card p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-2xl font-bold text-white">{p.name}</h1>
              <ProjectStatusBadge status={p.status} />
            </div>
            <p className="mt-2 max-w-2xl whitespace-pre-wrap text-sm text-muted">{p.description || 'No description provided.'}</p>
          </div>
          <div className="flex gap-2">
            <button className="btn-ghost" onClick={() => setEditing(true)}><Pencil className="h-4 w-4" /> Edit</button>
            {canDelete && <button className="btn-danger" onClick={remove}><Trash2 className="h-4 w-4" /> Delete</button>}
          </div>
        </div>
        {actionError && <div className="mt-4"><ErrorBox message={actionError} /></div>}

        <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <div><p className="label">Start date</p><p className="flex items-center gap-1.5 text-sm text-white"><CalendarDays className="h-4 w-4 text-muted" />{formatDate(p.startDate)}</p></div>
          <div><p className="label">Due date</p><p className="flex items-center gap-1.5 text-sm text-white"><CalendarDays className="h-4 w-4 text-muted" />{formatDate(p.dueDate)}</p></div>
          <div>
            <p className="label">Team</p>
            <div className="flex flex-wrap gap-2">{p.members.map((m) => <span key={m.id} className="flex items-center gap-1.5 text-sm text-white"><Avatar name={m.name} size="sm" />{m.name.split(' ')[0]}</span>)}</div>
          </div>
          <div>
            <p className="label">Progress · {p.completedTasks}/{p.totalTasks} tasks</p>
            <ProgressBar value={p.progress} />
            <p className="mt-1 text-sm font-semibold text-white">{p.progress}%</p>
          </div>
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <section className="card p-5 lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-semibold text-white">Tasks</h2>
            <div className="flex gap-2">
              <Link to={`/app/board?projectId=${p.id}`} className="btn-ghost">Open board</Link>
              <button className="btn-primary" onClick={() => setAddingTask(true)}><Plus className="h-4 w-4" /> Add task</button>
            </div>
          </div>
          {tasks.error && <ErrorBox message={tasks.error} />}
          {tasks.data && tasks.data.length === 0 ? (
            <EmptyState title="No tasks yet" text="Add the first task to this project." />
          ) : (
            <ul className="divide-y divide-line">
              {tasks.data?.map((t) => (
                <li key={t.id} className="flex flex-wrap items-center gap-3 py-3">
                  <Link to={`/app/tasks/${t.id}`} className="min-w-0 flex-1 truncate text-sm font-medium text-white hover:text-cyan">{t.title}</Link>
                  <PriorityBadge priority={t.priority} />
                  <TaskStatusBadge status={t.status} />
                  <span className={`w-24 text-right text-xs ${isOverdue(t.dueDate, t.status) ? 'font-semibold text-red-400' : 'text-muted'}`}>{formatDate(t.dueDate)}</span>
                  {t.assignee ? <Avatar name={t.assignee.name} size="sm" /> : <span className="h-6 w-6 rounded-full border border-dashed border-line" title="Unassigned" />}
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="card h-fit p-5">
          <h2 className="mb-4 font-semibold text-white">Project activity</h2>
          <ActivityList items={activity.data ?? []} />
        </section>
      </div>

      {editing && <ProjectModal workspaceId={p.workspaceId} project={p} onClose={() => setEditing(false)} onSaved={() => { setEditing(false); refresh(); }} />}
      {addingTask && <TaskModal workspaceId={p.workspaceId} defaultProjectId={p.id} onClose={() => setAddingTask(false)} onSaved={() => { setAddingTask(false); refresh(); }} />}
    </div>
  );
}
