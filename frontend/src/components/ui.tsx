import { Loader2, X } from 'lucide-react';
import { useEffect, type ReactNode } from 'react';
import { initials, PRIORITIES, PROJECT_STATUSES, TASK_STATUSES } from '../services/format';
import type { Priority, ProjectStatus, Role, TaskStatus } from '../types';

export function Spinner({ className = '' }: { className?: string }) {
  return <Loader2 className={`animate-spin text-muted ${className || 'h-5 w-5'}`} />;
}

export function PageLoader() {
  return (
    <div className="flex min-h-[40vh] items-center justify-center">
      <Spinner className="h-7 w-7" />
    </div>
  );
}

export function ErrorBox({ message }: { message: string }) {
  return <div role="alert" className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">{message}</div>;
}

export function SuccessBox({ message }: { message: string }) {
  return <div role="status" className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">{message}</div>;
}

export function EmptyState({ icon, title, text, action }: { icon?: ReactNode; title: string; text?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center rounded-2xl border border-dashed border-line px-6 py-12 text-center">
      {icon && <div className="mb-3 text-muted">{icon}</div>}
      <h3 className="font-semibold text-white">{title}</h3>
      {text && <p className="mt-1 max-w-sm text-sm text-muted">{text}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-muted">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function Modal({ title, onClose, children, wide }: { title: string; onClose: () => void; children: ReactNode; wide?: boolean }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-0 backdrop-blur-sm sm:items-center sm:p-4" onMouseDown={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onMouseDown={(e) => e.stopPropagation()}
        className={`fade-up card max-h-[92vh] w-full overflow-y-auto rounded-b-none bg-surface p-5 sm:rounded-b-2xl ${wide ? 'sm:max-w-2xl' : 'sm:max-w-md'}`}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">{title}</h2>
          <button onClick={onClose} aria-label="Close" className="rounded-lg p-1.5 text-muted hover:bg-surface2 hover:text-white">
            <X className="h-5 w-5" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return (
    <label className="block">
      <span className="label">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-muted">{hint}</span>}
    </label>
  );
}

export function Avatar({ name, size = 'md' }: { name: string; size?: 'sm' | 'md' | 'lg' }) {
  const dims = { sm: 'h-6 w-6 text-[10px]', md: 'h-8 w-8 text-xs', lg: 'h-14 w-14 text-lg' }[size];
  const hue = [...name].reduce((a, c) => a + c.charCodeAt(0), 0) % 4;
  const grad = ['from-brand to-cyan', 'from-violet to-brand', 'from-cyan to-violet', 'from-brand to-violet'][hue];
  return (
    <span title={name} className={`inline-flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br ${grad} font-semibold text-white ${dims}`}>
      {initials(name)}
    </span>
  );
}

export function AvatarStack({ names }: { names: string[] }) {
  return (
    <div className="flex -space-x-2">
      {names.slice(0, 4).map((n) => (
        <span key={n} className="rounded-full ring-2 ring-surface">
          <Avatar name={n} size="sm" />
        </span>
      ))}
      {names.length > 4 && <span className="flex h-6 w-6 items-center justify-center rounded-full bg-surface2 text-[10px] ring-2 ring-surface">+{names.length - 4}</span>}
    </div>
  );
}

export function ProgressBar({ value }: { value: number }) {
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-bg/80" role="progressbar" aria-valuenow={value} aria-valuemin={0} aria-valuemax={100}>
      <div className="h-full rounded-full bg-gradient-to-r from-brand via-violet to-cyan transition-all" style={{ width: `${value}%` }} />
    </div>
  );
}

const statusStyles: Record<TaskStatus, string> = {
  TODO: 'bg-slate-500/10 text-slate-300 ring-slate-500/30',
  IN_PROGRESS: 'bg-brand/10 text-blue-300 ring-brand/30',
  REVIEW: 'bg-violet/10 text-violet-300 ring-violet/30',
  COMPLETED: 'bg-emerald-500/10 text-emerald-300 ring-emerald-500/30',
};
export const TaskStatusBadge = ({ status }: { status: TaskStatus }) => (
  <span className={`badge ${statusStyles[status]}`}>{TASK_STATUSES.find((s) => s.value === status)?.label}</span>
);

const projStyles: Record<ProjectStatus, string> = {
  PLANNING: 'bg-slate-500/10 text-slate-300 ring-slate-500/30',
  ACTIVE: 'bg-cyan/10 text-cyan ring-cyan/30',
  ON_HOLD: 'bg-amber-500/10 text-amber-300 ring-amber-500/30',
  COMPLETED: 'bg-emerald-500/10 text-emerald-300 ring-emerald-500/30',
};
export const ProjectStatusBadge = ({ status }: { status: ProjectStatus }) => (
  <span className={`badge ${projStyles[status]}`}>{PROJECT_STATUSES.find((s) => s.value === status)?.label}</span>
);

const prioStyles: Record<Priority, string> = {
  LOW: 'bg-slate-500/10 text-slate-300 ring-slate-500/30',
  MEDIUM: 'bg-blue-500/10 text-blue-300 ring-blue-500/30',
  HIGH: 'bg-orange-500/10 text-orange-300 ring-orange-500/30',
  URGENT: 'bg-red-500/10 text-red-300 ring-red-500/30',
};
export const PriorityBadge = ({ priority }: { priority: Priority }) => (
  <span className={`badge ${prioStyles[priority]}`}>{PRIORITIES.find((p) => p.value === priority)?.label}</span>
);

const roleStyles: Record<Role, string> = {
  OWNER: 'bg-violet/10 text-violet-300 ring-violet/30',
  ADMIN: 'bg-brand/10 text-blue-300 ring-brand/30',
  MEMBER: 'bg-slate-500/10 text-slate-300 ring-slate-500/30',
};
export const RoleBadge = ({ role }: { role: Role }) => (
  <span className={`badge ${roleStyles[role]}`}>{role.charAt(0) + role.slice(1).toLowerCase()}</span>
);

export function Logo({ size = 'md' }: { size?: 'md' | 'lg' }) {
  return (
    <span className="inline-flex items-center gap-2.5">
      <span className={`flex items-center justify-center rounded-xl bg-gradient-to-br from-brand to-violet shadow-lg shadow-brand/30 ${size === 'lg' ? 'h-10 w-10' : 'h-8 w-8'}`}>
        <svg viewBox="0 0 32 32" className={size === 'lg' ? 'h-6 w-6' : 'h-5 w-5'}>
          <path d="M10 21a4 4 0 0 1 .6-7.95A5.5 5.5 0 0 1 21.2 14.5 3.3 3.3 0 0 1 21 21z" fill="#fff" />
        </svg>
      </span>
      <span className={`font-bold tracking-tight text-white ${size === 'lg' ? 'text-2xl' : 'text-lg'}`}>Nimbus</span>
    </span>
  );
}
