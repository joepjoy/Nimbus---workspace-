import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Logo } from '../components/ui';

export function AuthLayout({ title, subtitle, children, footer }: { title: string; subtitle: string; children: ReactNode; footer?: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 py-10">
      <Link to="/" className="mb-8"><Logo size="lg" /></Link>
      <div className="fade-up card w-full max-w-md p-6 sm:p-8">
        <h1 className="text-2xl font-bold text-white">{title}</h1>
        <p className="mt-1 text-sm text-muted">{subtitle}</p>
        <div className="mt-6">{children}</div>
      </div>
      {footer && <p className="mt-6 text-sm text-muted">{footer}</p>}
    </div>
  );
}
