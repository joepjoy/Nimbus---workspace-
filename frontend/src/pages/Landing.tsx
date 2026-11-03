import { Activity, ArrowRight, CheckCircle2, KanbanSquare, LayoutDashboard, ShieldCheck, Users } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Logo } from '../components/ui';
import { useAuth } from '../hooks/useAuth';

const features = [
  { icon: LayoutDashboard, title: 'Live dashboard', text: 'Projects, deadlines and progress computed from your real data, never hardcoded.' },
  { icon: KanbanSquare, title: 'Kanban task board', text: 'Drag tasks across To Do, In Progress, Review and Completed. Changes persist instantly.' },
  { icon: Users, title: 'Teams & roles', text: 'Invite teammates by email and control access with Owner, Admin and Member roles.' },
  { icon: Activity, title: 'Activity tracking', text: 'Every project and task update is recorded so everyone stays in the loop.' },
  { icon: ShieldCheck, title: 'Secure by design', text: 'Hashed passwords, HTTP-only cookies and workspace-level permission checks.' },
  { icon: CheckCircle2, title: 'Stay on schedule', text: 'Due dates, priorities and overdue flags keep work moving.' },
];

export default function Landing() {
  const { user } = useAuth();
  return (
    <div className="min-h-screen">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-4 py-5 sm:px-6">
        <Logo />
        <nav className="flex items-center gap-2">
          {user ? (
            <Link to="/app/dashboard" className="btn-primary">Open dashboard</Link>
          ) : (
            <>
              <Link to="/login" className="btn-ghost">Log in</Link>
              <Link to="/register" className="btn-primary">Get started</Link>
            </>
          )}
        </nav>
      </header>

      <section className="mx-auto max-w-6xl px-4 pb-16 pt-12 text-center sm:px-6 sm:pt-20">
        <span className="badge bg-brand/10 text-blue-300 ring-brand/30">Team project management</span>
        <h1 className="mx-auto mt-6 max-w-3xl text-4xl font-extrabold leading-tight tracking-tight text-white sm:text-6xl">
          Plan, track and ship work with <span className="bg-gradient-to-r from-brand via-violet to-cyan bg-clip-text text-transparent">Nimbus</span>
        </h1>
        <p className="mx-auto mt-5 max-w-xl text-lg text-muted">
          A focused workspace for your team: projects, tasks, Kanban boards and a live dashboard, all in one place.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link to={user ? '/app/dashboard' : '/register'} className="btn-primary px-6 py-3">
            {user ? 'Go to dashboard' : 'Create free account'} <ArrowRight className="h-4 w-4" />
          </Link>
          {!user && <Link to="/login" className="btn-ghost px-6 py-3">I already have an account</Link>}
        </div>

        <div className="card mx-auto mt-14 max-w-4xl p-4 sm:p-6" aria-hidden="true">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[['To Do', 'bg-slate-400', 3], ['In Progress', 'bg-brand', 2], ['Review', 'bg-violet', 1], ['Completed', 'bg-emerald-400', 4]].map(([label, color, n]) => (
              <div key={label as string} className="rounded-xl bg-bg/60 p-3 text-left">
                <div className="mb-3 flex items-center gap-2 text-xs font-medium text-muted"><span className={`h-2 w-2 rounded-full ${color}`} />{label}</div>
                {Array.from({ length: n as number }).map((_, i) => (
                  <div key={i} className="mb-2 rounded-lg border border-line bg-surface p-2.5">
                    <div className="h-2 w-3/4 rounded bg-line" />
                    <div className="mt-2 h-2 w-1/2 rounded bg-line/60" />
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-20 sm:px-6">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {features.map(({ icon: Icon, title, text }) => (
            <div key={title} className="card p-5">
              <span className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-brand/20 to-violet/20 text-cyan"><Icon className="h-5 w-5" /></span>
              <h3 className="font-semibold text-white">{title}</h3>
              <p className="mt-1 text-sm text-muted">{text}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="border-t border-line py-6 text-center text-sm text-muted">© {new Date().getFullYear()} Nimbus – Team Workspace</footer>
    </div>
  );
}
