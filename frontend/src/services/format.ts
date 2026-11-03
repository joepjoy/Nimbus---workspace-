import type { Priority, ProjectStatus, Role, TaskStatus } from '../types';

export const TASK_STATUSES: { value: TaskStatus; label: string; color: string }[] = [
  { value: 'TODO', label: 'To Do', color: 'bg-slate-400' },
  { value: 'IN_PROGRESS', label: 'In Progress', color: 'bg-brand' },
  { value: 'REVIEW', label: 'Review', color: 'bg-violet' },
  { value: 'COMPLETED', label: 'Completed', color: 'bg-emerald-400' },
];
export const PRIORITIES: { value: Priority; label: string }[] = [
  { value: 'LOW', label: 'Low' },
  { value: 'MEDIUM', label: 'Medium' },
  { value: 'HIGH', label: 'High' },
  { value: 'URGENT', label: 'Urgent' },
];
export const PROJECT_STATUSES: { value: ProjectStatus; label: string }[] = [
  { value: 'PLANNING', label: 'Planning' },
  { value: 'ACTIVE', label: 'Active' },
  { value: 'ON_HOLD', label: 'On Hold' },
  { value: 'COMPLETED', label: 'Completed' },
];

export const statusLabel = (s: TaskStatus) => TASK_STATUSES.find((x) => x.value === s)?.label ?? s;
export const projectStatusLabel = (s: ProjectStatus) => PROJECT_STATUSES.find((x) => x.value === s)?.label ?? s;
export const roleLabel = (r: Role) => r.charAt(0) + r.slice(1).toLowerCase();

export const isAdmin = (r?: Role) => r === 'OWNER' || r === 'ADMIN';

export function formatDate(value?: string | null) {
  if (!value) return '—';
  return new Date(value).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
}

/** yyyy-mm-dd for <input type="date"> */
export const toDateInput = (value?: string | null) => (value ? value.slice(0, 10) : '');

export function isOverdue(due?: string | null, status?: TaskStatus) {
  if (!due || status === 'COMPLETED') return false;
  return new Date(due).getTime() < Date.now(); // same rule as the dashboard query
}

export function timeAgo(value: string) {
  const s = Math.max(1, Math.round((Date.now() - new Date(value).getTime()) / 1000));
  if (s < 60) return 'just now';
  const m = Math.round(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.round(h / 24);
  if (d < 30) return `${d}d ago`;
  return formatDate(value);
}

export const initials = (name: string) =>
  name.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join('');
