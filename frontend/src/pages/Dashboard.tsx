import { AlertTriangle, CheckCircle2, Clock, FolderKanban, ListTodo, Rocket } from 'lucide-react';
import { Link } from 'react-router-dom';
import { ActivityList } from '../components/ActivityList';
import { EmptyState, ErrorBox, PageHeader, PageLoader, PriorityBadge, ProgressBar, ProjectStatusBadge } from '../components/ui';
import { useAsync } from '../hooks/useAsync';
import { useAuth } from '../hooks/useAuth';
import { useWorkspace } from '../hooks/useWorkspace';
import { api } from '../services/api';
import { formatDate, isOverdue, TASK_STATUSES } from '../services/format';
import type { DashboardStats } from '../types';

const donutColors: Record<string, string> = { TODO: '#94a3b8', IN_PROGRESS: '#3b82f6', REVIEW: '#8b5cf6', COMPLETED: '#34d399' };

function Donut({ data }: { data: DashboardStats['tasksByStatus'] }) {
  const total = Object.values(data).reduce((a, b) => a + b, 0);
  const r = 52;
  const c = 2 * Math.PI * r;
  let offset = 0;
  return (
    <div className="flex flex-wrap items-center gap-6">
      <svg viewBox="0 0 140 140" className="h-36 w-36 shrink-0 -rotate-90" role="img" aria-label="Tasks by status">
        <circle cx="70" cy="70" r={r} fill="none" stroke="#1b2548" strokeWidth="16" />
        {total > 0 &&
          TASK_STATUSES.map((s) => {
            const len = (data[s.value] / total) * c;
            const el = <circle key={s.value} cx="70" cy="70" r={r} fill="none" stroke={donutColors[s.value]} strokeWidth="16" strokeDasharray={`${len} ${c - len}`} strokeDashoffset={-offset} />;
            offset += len;
            return el;
          })}
        <text x="70" y="70" textAnchor="middle" dominantBaseline="central" className="rotate-90 origin-center fill-white text-2xl font-bold" style={{ transformBox: 'fill-box' }}>{total}</text>
      </svg>
      <ul className="space-y-2 text-sm">
        {TASK_STATUSES.map((s) => (
          <li key={s.value} className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: donutColors[s.value] }} />
            <span className="text-muted">{s.label}</span>
            <span className="ml-auto pl-4 font-semibold text-white">{data[s.value]}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const { current } = useWorkspace();
  const { data, loading, error } = useAsync(() => api.get<DashboardStats>('/dashboard/stats', { workspaceId: current!.id }), [current?.id]);

  if (!current) return null;
  if (loading && !data) return <PageLoader />;
  if (error) return <ErrorBox message={error} />;
  if (!data) return null;

  const t = data.totals;
  const cards = [
    { label: 'Total projects', value: t.totalProjects, icon: FolderKanban, tone: 'text-brand' },
    { label: 'Active projects', value: t.activeProjects, icon: Rocket, tone: 'text-cyan' },
    { label: 'Total tasks', value: t.totalTasks, icon: ListTodo, tone: 'text-violet' },
    { label: 'Completed', value: t.completedTasks, icon: CheckCircle2, tone: 'text-emerald-400' },
    { label: 'Pending', value: t.pendingTasks, icon: Clock, tone: 'text-amber-400' },
    { label: 'Overdue', value: t.overdueTasks, icon: AlertTriangle, tone: 'text-red-400' },
  ];

  return (
    <div className="fade-up">
      <PageHeader title={`Hello, ${user!.name.split(' ')[0]}`} subtitle={`Here's what's happening in ${current.name}.`} />

      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-6">
        {cards.map(({ label, value, icon: Icon, tone }) => (
          <div key={label} className="card p-4">
            <Icon className={`h-5 w-5 ${tone}`} />
            <p className="mt-3 text-3xl font-bold text-white">{value}</p>
            <p className="text-xs text-muted">{label}</p>
          </div>
        ))}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <section className="card p-5">
          <h2 className="mb-4 font-semibold text-white">Tasks by status</h2>
          <Donut data={data.tasksByStatus} />
        </section>

        <section className="card p-5 lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-semibold text-white">Project progress</h2>
            <Link to="/app/projects" className="text-sm text-cyan hover:underline">View all</Link>
          </div>
          {data.projectProgress.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted">No projects yet.</p>
          ) : (
            <ul className="space-y-4">
              {data.projectProgress.map((p) => (
                <li key={p.id}>
                  <div className="mb-1.5 flex items-center justify-between gap-2 text-sm">
                    <Link to={`/app/projects/${p.id}`} className="truncate font-medium text-white hover:text-cyan">{p.name}</Link>
                    <span className="flex shrink-0 items-center gap-2">
                      <ProjectStatusBadge status={p.status} />
                      <span className="w-20 text-right text-muted">{p.completedTasks}/{p.totalTasks} · {p.progress}%</span>
                    </span>
                  </div>
                  <ProgressBar value={p.progress} />
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="card p-5 lg:col-span-2">
          <h2 className="mb-4 font-semibold text-white">Upcoming deadlines <span className="text-xs font-normal text-muted">(next 14 days & overdue)</span></h2>
          {data.upcomingDeadlines.length === 0 ? (
            <EmptyState title="Nothing due soon" text="Tasks and projects with due dates will show up here." />
          ) : (
            <ul className="divide-y divide-line">
              {data.upcomingDeadlines.map((d) => (
                <li key={`${d.type}-${d.id}`} className="flex items-center gap-3 py-3">
                  <div className="min-w-0 flex-1">
                    <Link to={d.type === 'task' ? `/app/tasks/${d.id}` : `/app/projects/${d.id}`} className="block truncate text-sm font-medium text-white hover:text-cyan">{d.title}</Link>
                    <p className="truncate text-xs text-muted">{d.type === 'task' ? `${d.project?.name}${d.assignee ? ` · ${d.assignee.name}` : ''}` : 'Project deadline'}</p>
                  </div>
                  {d.priority && <PriorityBadge priority={d.priority} />}
                  <span className={`shrink-0 text-xs ${isOverdue(d.dueDate, 'TODO') ? 'font-semibold text-red-400' : 'text-muted'}`}>
                    {isOverdue(d.dueDate, 'TODO') ? 'Overdue · ' : ''}{formatDate(d.dueDate)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="card p-5">
          <h2 className="mb-4 font-semibold text-white">Recent activity</h2>
          <ActivityList items={data.recentActivity} />
        </section>
      </div>
    </div>
  );
}
