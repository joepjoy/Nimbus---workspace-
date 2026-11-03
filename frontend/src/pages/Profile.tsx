import { useState, type FormEvent } from 'react';
import { Avatar, ErrorBox, Field, PageHeader, Spinner, SuccessBox } from '../components/ui';
import { useAuth } from '../hooks/useAuth';
import { api, errorMessage } from '../services/api';
import { formatDate } from '../services/format';
import type { User } from '../types';

export default function Profile() {
  const { user, setUser } = useAuth();
  const [name, setName] = useState(user!.name);
  const [bio, setBio] = useState(user!.bio ?? '');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  async function save(e: FormEvent) {
    e.preventDefault();
    setError('');
    setMessage('');
    setBusy(true);
    try {
      const d = await api.put<{ user: User }>('/auth/me', { name, bio });
      setUser(d.user);
      setMessage('Profile updated.');
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fade-up max-w-2xl">
      <PageHeader title="Profile" subtitle="Manage your personal details." />
      <div className="card p-5 sm:p-6">
        <div className="mb-6 flex items-center gap-4">
          <Avatar name={user!.name} size="lg" />
          <div>
            <p className="text-lg font-semibold text-white">{user!.name}</p>
            <p className="text-sm text-muted">{user!.email}</p>
            <p className="text-xs text-muted">Member since {formatDate(user!.createdAt)}</p>
          </div>
        </div>
        <form onSubmit={save} className="space-y-4">
          {message && <SuccessBox message={message} />}
          {error && <ErrorBox message={error} />}
          <Field label="Full name"><input className="input" required minLength={2} value={name} onChange={(e) => setName(e.target.value)} /></Field>
          <Field label="Email" hint="Email cannot be changed."><input className="input opacity-60" value={user!.email} disabled /></Field>
          <Field label="About you"><textarea className="input min-h-24" maxLength={300} value={bio} onChange={(e) => setBio(e.target.value)} placeholder="Role, team, interests…" /></Field>
          <button className="btn-primary" disabled={busy}>{busy && <Spinner className="h-4 w-4" />} Save profile</button>
        </form>
      </div>
    </div>
  );
}
