import { useEffect, useState, type FormEvent } from 'react';
import { api, errorMessage } from '../services/api';
import { PROJECT_STATUSES, toDateInput } from '../services/format';
import type { Member, Project, ProjectStatus } from '../types';
import { ErrorBox, Field, Modal, Spinner } from './ui';

interface Props {
  workspaceId: string;
  project?: Project;
  onClose: () => void;
  onSaved: (project: Project) => void;
}

/** Create or edit a project, including picking its team members. */
export function ProjectModal({ workspaceId, project, onClose, onSaved }: Props) {
  const [members, setMembers] = useState<Member[]>([]);
  const [name, setName] = useState(project?.name ?? '');
  const [description, setDescription] = useState(project?.description ?? '');
  const [status, setStatus] = useState<ProjectStatus>(project?.status ?? 'PLANNING');
  const [startDate, setStartDate] = useState(toDateInput(project?.startDate));
  const [dueDate, setDueDate] = useState(toDateInput(project?.dueDate));
  const [memberIds, setMemberIds] = useState<string[]>(project?.members.map((m) => m.id) ?? []);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api.get<Member[]>(`/workspaces/${workspaceId}/members`).then(setMembers).catch((e) => setError(errorMessage(e)));
  }, [workspaceId]);

  const toggle = (id: string) => setMemberIds((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]));

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError('');
    if (startDate && dueDate && dueDate < startDate) return setError('Due date cannot be before the start date.');
    setBusy(true);
    try {
      const body = { name, description, status, startDate: startDate || null, dueDate: dueDate || null, memberIds };
      const saved = project
        ? await api.put<Project>(`/projects/${project.id}`, body)
        : await api.post<Project>('/projects', { ...body, workspaceId });
      onSaved(saved);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal title={project ? 'Edit project' : 'New project'} onClose={onClose} wide>
      <form onSubmit={submit} className="space-y-4">
        {error && <ErrorBox message={error} />}
        <Field label="Name"><input className="input" required minLength={2} autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Website redesign" /></Field>
        <Field label="Description"><textarea className="input min-h-20" value={description} onChange={(e) => setDescription(e.target.value)} /></Field>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Status">
            <select className="input" value={status} onChange={(e) => setStatus(e.target.value as ProjectStatus)}>
              {PROJECT_STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </Field>
          <Field label="Start date"><input className="input" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} /></Field>
          <Field label="Due date"><input className="input" type="date" value={dueDate} min={startDate || undefined} onChange={(e) => setDueDate(e.target.value)} /></Field>
        </div>
        <fieldset>
          <legend className="label">Team members</legend>
          <div className="flex flex-wrap gap-2">
            {members.map((m) => {
              const on = memberIds.includes(m.userId);
              return (
                <button type="button" key={m.userId} onClick={() => toggle(m.userId)} aria-pressed={on}
                  className={`rounded-full border px-3 py-1 text-sm transition ${on ? 'border-brand bg-brand/20 text-white' : 'border-line text-muted hover:text-white'}`}>
                  {m.user.name}
                </button>
              );
            })}
          </div>
          {!project && <p className="mt-1 text-xs text-muted">You are added automatically.</p>}
        </fieldset>
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" className="btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn-primary" disabled={busy}>{busy && <Spinner className="h-4 w-4" />} {project ? 'Save changes' : 'Create project'}</button>
        </div>
      </form>
    </Modal>
  );
}
