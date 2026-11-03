import { ChevronDown, FolderKanban, KanbanSquare, LayoutDashboard, LogOut, Menu, Plus, Settings, User as UserIcon, Users, Building2, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Avatar, Logo, PageLoader } from '../components/ui';
import { useAuth } from '../hooks/useAuth';
import { useWorkspace } from '../hooks/useWorkspace';

const nav = [
  { to: '/app/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/app/workspaces', label: 'Workspace', icon: Building2 },
  { to: '/app/projects', label: 'Projects', icon: FolderKanban },
  { to: '/app/board', label: 'Task Board', icon: KanbanSquare },
  { to: '/app/team', label: 'Team', icon: Users },
];
const nav2 = [
  { to: '/app/profile', label: 'Profile', icon: UserIcon },
  { to: '/app/settings', label: 'Settings', icon: Settings },
];

// Pages that work without a selected workspace
const NO_WORKSPACE_OK = ['/app/workspaces', '/app/profile', '/app/settings'];

export function AppLayout() {
  const { user, logout } = useAuth();
  const { workspaces, current, select, loading } = useWorkspace();
  const [open, setOpen] = useState(false);
  const [menu, setMenu] = useState(false);
  const [wsMenu, setWsMenu] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setOpen(false);
    setMenu(false);
    setWsMenu(false);
  }, [location.pathname]);

  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) {
        setMenu(false);
        setWsMenu(false);
      }
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  if (loading) return <PageLoader />;
  if (!current && !NO_WORKSPACE_OK.includes(location.pathname)) return <Navigate to="/app/workspaces" replace />;

  const link = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
      isActive ? 'bg-gradient-to-r from-brand/20 to-violet/20 text-white ring-1 ring-brand/30' : 'text-muted hover:bg-surface2/70 hover:text-white'
    }`;

  const sidebar = (
    <div className="flex h-full flex-col gap-6 p-4">
      <div className="flex items-center justify-between px-1">
        <Link to="/app/dashboard"><Logo /></Link>
        <button className="rounded-lg p-1.5 text-muted hover:bg-surface2 lg:hidden" onClick={() => setOpen(false)} aria-label="Close menu">
          <X className="h-5 w-5" />
        </button>
      </div>
      <nav className="flex flex-col gap-1" aria-label="Main">
        {nav.map(({ to, label, icon: Icon }) => (
          <NavLink key={to} to={to} className={link}>
            <Icon className="h-[18px] w-[18px]" /> {label}
          </NavLink>
        ))}
      </nav>
      <nav className="mt-auto flex flex-col gap-1 border-t border-line pt-4" aria-label="Account">
        {nav2.map(({ to, label, icon: Icon }) => (
          <NavLink key={to} to={to} className={link}>
            <Icon className="h-[18px] w-[18px]" /> {label}
          </NavLink>
        ))}
      </nav>
    </div>
  );

  return (
    <div className="min-h-screen lg:pl-64">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 border-r border-line bg-surface/80 backdrop-blur lg:block">{sidebar}</aside>
      {open && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-black/60" onClick={() => setOpen(false)} />
          <aside className="fade-up absolute inset-y-0 left-0 w-72 border-r border-line bg-surface">{sidebar}</aside>
        </div>
      )}

      <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-line bg-bg/80 px-4 backdrop-blur sm:px-6" ref={menuRef}>
        <button className="rounded-lg p-2 text-muted hover:bg-surface2 lg:hidden" onClick={() => setOpen(true)} aria-label="Open menu">
          <Menu className="h-5 w-5" />
        </button>

        <div className="relative">
          <button onClick={() => setWsMenu((v) => !v)} className="flex items-center gap-2 rounded-xl border border-line bg-surface/70 px-3 py-2 text-sm hover:bg-surface2" aria-haspopup="menu" aria-expanded={wsMenu}>
            <span className="flex h-6 w-6 items-center justify-center rounded-md bg-gradient-to-br from-violet to-cyan text-xs font-bold text-white">
              {current?.name[0]?.toUpperCase() ?? '?'}
            </span>
            <span className="max-w-[9rem] truncate font-medium text-white sm:max-w-[14rem]">{current?.name ?? 'No workspace'}</span>
            <ChevronDown className="h-4 w-4 text-muted" />
          </button>
          {wsMenu && (
            <div role="menu" className="fade-up card absolute left-0 top-12 w-64 bg-surface p-1.5">
              {workspaces.map((w) => (
                <button
                  key={w.id}
                  role="menuitem"
                  onClick={() => { select(w.id); setWsMenu(false); }}
                  className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm hover:bg-surface2 ${w.id === current?.id ? 'text-white' : 'text-muted'}`}
                >
                  <span className="truncate">{w.name}</span>
                  {w.id === current?.id && <span className="ml-auto text-xs text-cyan">Current</span>}
                </button>
              ))}
              <button role="menuitem" onClick={() => navigate('/app/workspaces?new=1')} className="mt-1 flex w-full items-center gap-2 rounded-lg border-t border-line px-3 py-2 text-sm text-cyan hover:bg-surface2">
                <Plus className="h-4 w-4" /> New workspace
              </button>
            </div>
          )}
        </div>

        <div className="relative ml-auto">
          <button onClick={() => setMenu((v) => !v)} className="flex items-center gap-2 rounded-xl p-1.5 hover:bg-surface2" aria-haspopup="menu" aria-expanded={menu}>
            <Avatar name={user!.name} />
            <span className="hidden text-sm font-medium text-white sm:block">{user!.name}</span>
            <ChevronDown className="hidden h-4 w-4 text-muted sm:block" />
          </button>
          {menu && (
            <div role="menu" className="fade-up card absolute right-0 top-12 w-56 bg-surface p-1.5">
              <div className="border-b border-line px-3 py-2">
                <p className="truncate text-sm font-medium text-white">{user!.name}</p>
                <p className="truncate text-xs text-muted">{user!.email}</p>
              </div>
              <Link role="menuitem" to="/app/profile" className="mt-1 flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-300 hover:bg-surface2"><UserIcon className="h-4 w-4" /> Profile</Link>
              <Link role="menuitem" to="/app/settings" className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-300 hover:bg-surface2"><Settings className="h-4 w-4" /> Settings</Link>
              <button role="menuitem" onClick={async () => { await logout(); navigate('/'); }} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-red-300 hover:bg-surface2">
                <LogOut className="h-4 w-4" /> Log out
              </button>
            </div>
          )}
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8">
        <Outlet />
      </main>
    </div>
  );
}
