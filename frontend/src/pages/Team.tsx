import { Mail, Trash2, UserPlus } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { Avatar, EmptyState, ErrorBox, Field, Modal, PageHeader, PageLoader, RoleBadge, Spinner, SuccessBox } from '../components/ui';
import { useAsync } from '../hooks/useAsync';
import { useAuth } from '../hooks/useAuth';
import { useWorkspace } from '../hooks/useWorkspace';
import { api, errorMessage } from '../services/api';
import { formatDate, isAdmin } from '../services/format';
import type { Member, Task } from '../types';

function AddMemberModal({ workspaceId, canAddAdmin, onClose, onAdded }: { workspaceId: string; canAddAdmin: boolean; onClose: () => void; onAdded: () => void }) {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'MEMBER' | 'ADMIN'>('MEMBER');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      await api.post(`/workspaces/${workspaceId}/members`, { email, role });
      onAdded();
    } catch (err) {
      setError(errorMessage(err));
      setBusy(false);
    }
  }

  return (
    <Modal title="Add team member" onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        {error && <ErrorBox message={error} />}
        <Field label="Email address" hint="The person must already have a Nimbus account."><input className="input" type="email" required autoFocus value={email} onChange={(e) => setEmail(e.target.value)} placeholder="teammate@company.com" /></Field>
        <Field label="Role">
          <select className="input" value={role} onChange={(e) => setRole(e.target.value as 'MEMBER' | 'ADMIN')}>
            <option value="MEMBER">Member: work on projects and tasks</option>
            {canAddAdmin && <option value="ADMIN">Admin: also manage projects and members</option>}
          </select>
        </Field>
        <div className="flex justify-end gap-2">
          <button type="button" className="btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn-primary" disabled={busy}>{busy && <Spinner className="h-4 w-4" />} Add member</button>
        </div>
      </form>
    </Modal>
  );
}

function MemberTasks({ member, workspaceId, onClose }: { member: Member; workspaceId: string; onClose: () => void }) {
  const { data, loading, error } = useAsync(() => api.get<Task[]>('/tasks', { workspaceId, assignedTo: member.userId }), [member.userId]);
  return (
    <Modal title={`${member.user.name}'s tasks`} onClose={onClose} wide>
      <div className="mb-4 flex items-center gap-3">
        <Avatar name={member.user.name} size="lg" />
        <div>
          <p className="font-medium text-white">{member.user.name}</p>
          <p className="flex items-center gap-1 text-sm text-muted"><Mail className="h-3.5 w-3.5" />{member.user.email}</p>
          {member.user.bio && <p className="mt-1 text-sm text-slate-300">{member.user.bio}</p>}
        </div>
      </div>
      {error && <ErrorBox message={error} />}
      {loading ? <PageLoader /> : data && data.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted">No tasks assigned.</p>
      ) : (
        <ul className="divide-y divide-line">
          {data?.map((t) => (
            <li key={t.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
              <Link to={`/app/tasks/${t.id}`} className="truncate text-white hover:text-cyan">{t.title}</Link>
              <span className="shrink-0 text-xs text-muted">{t.project.name} · {t.status.replace('_', ' ').toLowerCase()}</span>
            </li>
          ))}
        </ul>
      )}
    </Modal>
  );
}

export default function Team() {
  const { current } = useWorkspace();
  const { user } = useAuth();
  const [adding, setAdding] = useState(false);
  const [viewing, setViewing] = useState<Member | null>(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const { data, loading, error: loadError, reload } = useAsync(() => api.get<Member[]>(`/workspaces/${current!.id}/members`), [current?.id]);

  if (!current) return null;
  const myRole = current.myRole;
  const admin = isAdmin(myRole);

  async function act(fn: () => Promise<unknown>, ok: string) {
    setError('');
    setMessage('');
    try {
      await fn();
      setMessage(ok);
      await reload();
    } catch (e) {
      setError(errorMessage(e));
    }
  }

  const canRemove = (m: Member) => m.role !== 'OWNER' && (m.userId === user!.id || myRole === 'OWNER' || (myRole === 'ADMIN' && m.role === 'MEMBER'));

  return (
    <div className="fade-up">
      <PageHeader
        title="Team"
        subtitle={`People in ${current.name}`}
        actions={admin && <button className="btn-primary" onClick={() => setAdding(true)}><UserPlus className="h-4 w-4" /> Add member</button>}
      />
      {message && <div className="mb-4"><SuccessBox message={message} /></div>}
      {(error || loadError) && <div className="mb-4"><ErrorBox message={error || loadError!} /></div>}

      {loading && !data ? <PageLoader /> : data && data.length === 0 ? <EmptyState title="No members" /> : (
        <div className="card overflow-hidden">
          <div className="hidden grid-cols-12 gap-3 border-b border-line px-5 py-3 text-xs uppercase tracking-wide text-muted md:grid">
            <span className="col-span-4">Member</span><span className="col-span-2">Role</span><span className="col-span-2">Joined</span><span className="col-span-2">Tasks</span><span className="col-span-2 text-right">Actions</span>
          </div>
          <ul className="divide-y divide-line">
            {data?.map((m) => (
              <li key={m.id} className="grid grid-cols-2 items-center gap-3 px-5 py-4 md:grid-cols-12">
                <button onClick={() => setViewing(m)} className="col-span-2 flex min-w-0 items-center gap-3 text-left md:col-span-4">
                  <Avatar name={m.user.name} />
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium text-white">{m.user.name}{m.userId === user!.id && <span className="ml-1.5 text-xs text-muted">(you)</span>}</span>
                    <span className="block truncate text-xs text-muted">{m.user.email}</span>
                  </span>
                </button>
                <div className="md:col-span-2">
                  {myRole === 'OWNER' && m.role !== 'OWNER' ? (
                    <select aria-label={`Role for ${m.user.name}`} className="input w-auto py-1" value={m.role} onChange={(e) => act(() => api.put(`/workspaces/${current.id}/members/${m.userId}`, { role: e.target.value }), `Updated ${m.user.name}'s role.`)}>
                      <option value="ADMIN">Admin</option>
                      <option value="MEMBER">Member</option>
                    </select>
                  ) : <RoleBadge role={m.role} />}
                </div>
                <span className="hidden text-sm text-muted md:col-span-2 md:block">{formatDate(m.joinedAt)}</span>
                <span className="text-sm text-muted md:col-span-2">{m.openTasks} open · {m.completedTasks} done</span>
                <div className="col-span-2 flex justify-end gap-2 md:col-span-2">
                  <button className="btn-ghost px-3 py-1.5" onClick={() => setViewing(m)}>View</button>
                  {canRemove(m) && (
                    <button className="btn-danger px-3 py-1.5" aria-label={m.userId === user!.id ? 'Leave workspace' : `Remove ${m.user.name}`}
                      onClick={() => window.confirm(m.userId === user!.id ? 'Leave this workspace?' : `Remove ${m.user.name} from the workspace?`) && act(() => api.del(`/workspaces/${current.id}/members/${m.userId}`), 'Member removed.')}>
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {adding && <AddMemberModal workspaceId={current.id} canAddAdmin={myRole === 'OWNER'} onClose={() => setAdding(false)} onAdded={() => { setAdding(false); setMessage('Member added.'); void reload(); }} />}
      {viewing && <MemberTasks member={viewing} workspaceId={current.id} onClose={() => setViewing(null)} />}
    </div>
  );
}
