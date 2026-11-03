import { ArrowLeft, CalendarDays, Pencil, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ActivityList } from '../components/ActivityList';
import { TaskModal } from '../components/TaskModal';
import { Avatar, ErrorBox, PageLoader, PriorityBadge, TaskStatusBadge } from '../components/ui';
import { useAsync } from '../hooks/useAsync';
import { api, errorMessage } from '../services/api';
import { formatDate, isOverdue, TASK_STATUSES, timeAgo } from '../services/format';
import type { Activity, Task, TaskStatus } from '../types';

export default function TaskDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [editing, setEditing] = useState(false);
  const [actionError, setActionError] = useState('');
  const task = useAsync(() => api.get<Task>(`/tasks/${id}`), [id]);
  const activity = useAsync(
    () => (task.data?.project.workspaceId ? api.get<Activity[]>(`/workspaces/${task.data.project.workspaceId}/activities`, { projectId: task.data.projectId, limit: 50 }) : Promise.resolve([])),
    [id, task.data?.project.workspaceId],
  );

  if (task.loading && !task.data) return <PageLoader />;
  if (task.error) return <div className="space-y-4"><ErrorBox message={task.error} /><Link to="/app/board" className="btn-ghost">Back to board</Link></div>;
  const t = task.data;
  if (!t) return null;

  // Only show history entries that mention this task's title.
  const history = (activity.data ?? []).filter((a) => a.description.includes(`"${t.title}"`));

  async function setStatus(status: TaskStatus) {
    setActionError('');
    try {
      task.setData(await api.put<Task>(`/tasks/${t!.id}`, { status }));
      void activity.reload();
    } catch (e) {
      setActionError(errorMessage(e));
    }
  }

  async function remove() {
    if (!window.confirm(`Delete task "${t!.title}"?`)) return;
    try {
      await api.del(`/tasks/${t!.id}`);
      navigate(`/app/projects/${t!.projectId}`);
    } catch (e) {
      setActionError(errorMessage(e));
    }
  }

  return (
    <div className="fade-up">
      <Link to={`/app/projects/${t.projectId}`} className="mb-4 inline-flex items-center gap-1 text-sm text-muted hover:text-white"><ArrowLeft className="h-4 w-4" /> {t.project.name}</Link>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="card p-5 sm:p-6 lg:col-span-2">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <h1 className="text-2xl font-bold text-white">{t.title}</h1>
            <div className="flex gap-2">
              <button className="btn-ghost" onClick={() => setEditing(true)}><Pencil className="h-4 w-4" /> Edit</button>
              <button className="btn-danger" onClick={remove}><Trash2 className="h-4 w-4" /> Delete</button>
            </div>
          </div>
          {actionError && <div className="mt-4"><ErrorBox message={actionError} /></div>}
          <h2 className="label mt-6">Description</h2>
          <p className="whitespace-pre-wrap text-sm text-slate-300">{t.description || 'No description provided.'}</p>

          <h2 className="label mt-8">History</h2>
          {history.length ? (
            <ul className="space-y-2 text-sm">
              {history.map((a) => (
                <li key={a.id} className="flex justify-between gap-3 border-b border-line/60 pb-2 text-slate-300">
                  <span><span className="font-medium text-white">{a.user.name}</span> {a.description}</span>
                  <span className="shrink-0 text-xs text-muted">{timeAgo(a.createdAt)}</span>
                </li>
              ))}
            </ul>
          ) : (
            <ActivityList items={[]} />
          )}
        </div>

        <aside className="card h-fit space-y-5 p-5">
          <div>
            <p className="label">Status</p>
            <div className="mb-2"><TaskStatusBadge status={t.status} /></div>
            <select className="input" aria-label="Change status" value={t.status} onChange={(e) => setStatus(e.target.value as TaskStatus)}>
              {TASK_STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </div>
          <div><p className="label">Priority</p><PriorityBadge priority={t.priority} /></div>
          <div>
            <p className="label">Assignee</p>
            {t.assignee ? <span className="flex items-center gap-2 text-sm text-white"><Avatar name={t.assignee.name} size="sm" />{t.assignee.name}</span> : <span className="text-sm text-muted">Unassigned</span>}
          </div>
          <div>
            <p className="label">Due date</p>
            <p className={`flex items-center gap-1.5 text-sm ${isOverdue(t.dueDate, t.status) ? 'font-semibold text-red-400' : 'text-white'}`}>
              <CalendarDays className="h-4 w-4" /> {formatDate(t.dueDate)} {isOverdue(t.dueDate, t.status) && '(overdue)'}
            </p>
          </div>
          <div><p className="label">Project</p><Link to={`/app/projects/${t.projectId}`} className="text-sm text-cyan hover:underline">{t.project.name}</Link></div>
          <div className="border-t border-line pt-4 text-xs text-muted">Created {formatDate(t.createdAt)} · Updated {timeAgo(t.updatedAt)}</div>
        </aside>
      </div>

      {editing && t.project.workspaceId && (
        <TaskModal workspaceId={t.project.workspaceId} task={t} onClose={() => setEditing(false)} onSaved={(saved) => { setEditing(false); task.setData(saved); void activity.reload(); }} />
      )}
    </div>
  );
}
