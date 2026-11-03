import { timeAgo } from '../services/format';
import type { Activity } from '../types';
import { Avatar } from './ui';

export function ActivityList({ items }: { items: Activity[] }) {
  if (!items.length) return <p className="py-6 text-center text-sm text-muted">No activity yet.</p>;
  return (
    <ul className="space-y-4">
      {items.map((a) => (
        <li key={a.id} className="flex gap-3">
          <Avatar name={a.user.name} size="sm" />
          <div className="min-w-0 text-sm">
            <p className="text-slate-300">
              <span className="font-medium text-white">{a.user.name}</span> {a.description}
            </p>
            <p className="text-xs text-muted">{timeAgo(a.createdAt)}</p>
          </div>
        </li>
      ))}
    </ul>
  );
}
