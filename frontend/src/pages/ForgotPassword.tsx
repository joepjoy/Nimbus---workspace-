import { useState, type FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ErrorBox, Field, Spinner, SuccessBox } from '../components/ui';
import { AuthLayout } from '../layouts/AuthLayout';
import { api, errorMessage } from '../services/api';

export function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<{ message: string; resetUrl?: string } | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      setResult(await api.post('/auth/forgot-password', { email }));
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthLayout title="Reset your password" subtitle="Enter your email and we'll generate a reset link." footer={<Link to="/login" className="text-cyan hover:underline">Back to log in</Link>}>
      {result ? (
        <div className="space-y-4">
          <SuccessBox message={result.message} />
          {result.resetUrl && (
            <div className="rounded-xl border border-line bg-bg/60 p-3 text-sm">
              <p className="mb-1 text-xs uppercase tracking-wide text-muted">Development mode: no email service is configured</p>
              <a href={result.resetUrl} className="break-all text-cyan hover:underline">Open reset link</a>
            </div>
          )}
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-4">
          {error && <ErrorBox message={error} />}
          <Field label="Email"><input className="input" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@company.com" /></Field>
          <button className="btn-primary w-full" disabled={busy}>{busy && <Spinner className="h-4 w-4" />} Send reset link</button>
        </form>
      )}
    </AuthLayout>
  );
}

export function ResetPassword() {
  const [params] = useSearchParams();
  const token = params.get('token') ?? '';
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError('');
    if (password !== confirm) return setError('Passwords do not match.');
    setBusy(true);
    try {
      await api.post('/auth/reset-password', { token, newPassword: password });
      setDone(true);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthLayout title="Choose a new password" subtitle="Use at least 8 characters with a letter and a number.">
      {done ? (
        <div className="space-y-4">
          <SuccessBox message="Your password has been reset." />
          <Link to="/login" className="btn-primary w-full">Go to log in</Link>
        </div>
      ) : !token ? (
        <ErrorBox message="This reset link is missing its token." />
      ) : (
        <form onSubmit={submit} className="space-y-4">
          {error && <ErrorBox message={error} />}
          <Field label="New password"><input className="input" type="password" required autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} /></Field>
          <Field label="Confirm password"><input className="input" type="password" required autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} /></Field>
          <button className="btn-primary w-full" disabled={busy}>{busy && <Spinner className="h-4 w-4" />} Reset password</button>
        </form>
      )}
    </AuthLayout>
  );
}
