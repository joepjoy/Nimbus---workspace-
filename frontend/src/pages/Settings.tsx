import { LogOut } from 'lucide-react';
import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { ErrorBox, Field, PageHeader, Spinner, SuccessBox } from '../components/ui';
import { useAuth } from '../hooks/useAuth';
import { useWorkspace } from '../hooks/useWorkspace';
import { api, errorMessage } from '../services/api';
import { isAdmin } from '../services/format';

function WorkspaceSettings() {
  const { current, reload } = useWorkspace();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    setName(current?.name ?? '');
    setDescription(current?.description ?? '');
  }, [current?.id, current?.name, current?.description]);

  if (!current) return null;
  const canEdit = isAdmin(current.myRole);

  async function save(e: FormEvent) {
    e.preventDefault();
    setError('');
    setMessage('');
    setBusy(true);
    try {
      await api.put(`/workspaces/${current!.id}`, { name, description });
      await reload();
      setMessage('Workspace updated.');
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!window.confirm(`Delete "${current!.name}" and ALL of its projects and tasks? This cannot be undone.`)) return;
    try {
      await api.del(`/workspaces/${current!.id}`);
      localStorage.removeItem('nimbus.workspace');
      await reload();
      navigate('/app/workspaces');
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  return (
    <section className="card p-5 sm:p-6">
      <h2 className="font-semibold text-white">Workspace settings</h2>
      <p className="mb-4 text-sm text-muted">{canEdit ? `Editing ${current.name}` : 'Only admins and owners can change workspace settings.'}</p>
      <form onSubmit={save} className="space-y-4">
        {message && <SuccessBox message={message} />}
        {error && <ErrorBox message={error} />}
        <Field label="Name"><input className="input" required minLength={2} disabled={!canEdit} value={name} onChange={(e) => setName(e.target.value)} /></Field>
        <Field label="Description"><textarea className="input min-h-20" disabled={!canEdit} value={description} onChange={(e) => setDescription(e.target.value)} /></Field>
        {canEdit && <button className="btn-primary" disabled={busy}>{busy && <Spinner className="h-4 w-4" />} Save workspace</button>}
      </form>
      {current.myRole === 'OWNER' && (
        <div className="mt-6 border-t border-line pt-5">
          <h3 className="text-sm font-semibold text-red-300">Danger zone</h3>
          <p className="mb-3 text-sm text-muted">Deleting a workspace permanently removes its projects, tasks and activity.</p>
          <button className="btn-danger" onClick={remove}>Delete workspace</button>
        </div>
      )}
    </section>
  );
}

function PasswordSettings() {
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setMessage('');
    if (next !== confirm) return setError('New passwords do not match.');
    setBusy(true);
    try {
      await api.put('/auth/password', { currentPassword: current, newPassword: next });
      setMessage('Password changed.');
      setCurrent(''); setNext(''); setConfirm('');
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="card p-5 sm:p-6">
      <h2 className="mb-4 font-semibold text-white">Change password</h2>
      <form onSubmit={submit} className="space-y-4">
        {message && <SuccessBox message={message} />}
        {error && <ErrorBox message={error} />}
        <Field label="Current password"><input className="input" type="password" required autoComplete="current-password" value={current} onChange={(e) => setCurrent(e.target.value)} /></Field>
        <Field label="New password" hint="At least 8 characters with a letter and a number."><input className="input" type="password" required autoComplete="new-password" value={next} onChange={(e) => setNext(e.target.value)} /></Field>
        <Field label="Confirm new password"><input className="input" type="password" required autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} /></Field>
        <button className="btn-primary" disabled={busy}>{busy && <Spinner className="h-4 w-4" />} Update password</button>
      </form>
    </section>
  );
}

export default function Settings() {
  const { logout } = useAuth();
  const navigate = useNavigate();
  return (
    <div className="fade-up max-w-2xl space-y-6">
      <PageHeader title="Settings" subtitle="Workspace and account preferences." />
      <WorkspaceSettings />
      <PasswordSettings />
      <section className="card flex items-center justify-between p-5 sm:p-6">
        <div>
          <h2 className="font-semibold text-white">Log out</h2>
          <p className="text-sm text-muted">End your session on this device.</p>
        </div>
        <button className="btn-ghost" onClick={async () => { await logout(); navigate('/'); }}><LogOut className="h-4 w-4" /> Log out</button>
      </section>
    </div>
  );
}
