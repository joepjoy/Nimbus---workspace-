import { useEffect, useState, type FormEvent } from 'react';
import { api, errorMessage } from '../services/api';
import { PRIORITIES, TASK_STATUSES, toDateInput } from '../services/format';
import type { Member, Priority, Project, Task, TaskStatus } from '../types';
import { ErrorBox, Field, Modal, Spinner } from './ui';

interface Props {
  workspaceId: string;
  task?: Task;
  defaultProjectId?: string;
  defaultStatus?: TaskStatus;
  onClose: () => void;
  onSaved: (task: Task) => void;
}

/** Create or edit a task. Loads projects and workspace members for the pickers. */
export function TaskModal({ workspaceId, task, defaultProjectId, defaultStatus, onClose, onSaved }: Props) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [title, setTitle] = useState(task?.title ?? '');
  const [description, setDescription] = useState(task?.description ?? '');
  const [projectId, setProjectId] = useState(task?.projectId ?? defaultProjectId ?? '');
  const [assignedTo, setAssignedTo] = useState(task?.assignedTo ?? '');
  const [priority, setPriority] = useState<Priority>(task?.priority ?? 'MEDIUM');
  const [status, setStatus] = useState<TaskStatus>(task?.status ?? defaultStatus ?? 'TODO');
  const [dueDate, setDueDate] = useState(toDateInput(task?.dueDate));
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    Promise.all([
      api.get<Project[]>('/projects', { workspaceId }),
      api.get<Member[]>(`/workspaces/${workspaceId}/members`),
    ])
      .then(([p, m]) => {
        setProjects(p);
        setMembers(m);
        setProjectId((cur) => cur || p[0]?.id || '');
      })
      .catch((e) => setError(errorMessage(e)));
  }, [workspaceId]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!projectId) return setError('Create a project first, then add tasks to it.');
    setError('');
    setBusy(true);
    try {
      const body = { title, description, projectId, assignedTo: assignedTo || null, priority, status, dueDate: dueDate || null };
      const saved = task ? await api.put<Task>(`/tasks/${task.id}`, body) : await api.post<Task>('/tasks', body);
      onSaved(saved);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal title={task ? 'Edit task' : 'New task'} onClose={onClose} wide>
      <form onSubmit={submit} className="space-y-4">
        {error && <ErrorBox message={error} />}
        <Field label="Title"><input className="input" required minLength={2} autoFocus value={title} onChange={(e) => setTitle(e.target.value)} placeholder="What needs to be done?" /></Field>
        <Field label="Description"><textarea className="input min-h-24" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Add more detail (optional)" /></Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Project">
            <select className="input" required value={projectId} onChange={(e) => setProjectId(e.target.value)}>
              {!projects.length && <option value="">No projects yet</option>}
              {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </Field>
          <Field label="Assignee">
            <select className="input" value={assignedTo} onChange={(e) => setAssignedTo(e.target.value)}>
              <option value="">Unassigned</option>
              {members.map((m) => <option key={m.userId} value={m.userId}>{m.user.name}</option>)}
            </select>
          </Field>
          <Field label="Status">
            <select className="input" value={status} onChange={(e) => setStatus(e.target.value as TaskStatus)}>
              {TASK_STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </Field>
          <Field label="Priority">
            <select className="input" value={priority} onChange={(e) => setPriority(e.target.value as Priority)}>
              {PRIORITIES.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
            </select>
          </Field>
          <Field label="Due date"><input className="input" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} /></Field>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" className="btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn-primary" disabled={busy}>{busy && <Spinner className="h-4 w-4" />} {task ? 'Save changes' : 'Create task'}</button>
        </div>
      </form>
    </Modal>
  );
}
