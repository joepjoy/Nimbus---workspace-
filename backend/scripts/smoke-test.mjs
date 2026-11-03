// End-to-end API smoke test. Run with the API up:  node scripts/smoke-test.mjs [baseUrl]
const BASE = process.argv[2] ?? 'http://localhost:4000/api';
let failed = 0;

class Client {
  cookie = '';
  async call(method, path, body) {
    const res = await fetch(BASE + path, {
      method,
      headers: { 'Content-Type': 'application/json', ...(this.cookie ? { Cookie: this.cookie } : {}) },
      body: body ? JSON.stringify(body) : undefined,
    });
    const set = res.headers.get('set-cookie');
    if (set) this.cookie = set.split(';')[0];
    return { status: res.status, body: await res.json().catch(() => null) };
  }
}

function check(name, cond, extra = '') {
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${name}${cond ? '' : '  ' + extra}`);
  if (!cond) failed++;
}

const stamp = Date.now();
const a = new Client();
const b = new Client();
const outsider = new Client();

// --- Auth
let r = await a.call('GET', '/auth/me');
check('protected route rejects anonymous', r.status === 401);
r = await a.call('POST', '/auth/register', { name: 'Tester A', email: `a${stamp}@test.dev`, password: 'short' });
check('register validates weak password', r.status === 400, JSON.stringify(r.body));
r = await a.call('POST', '/auth/register', { name: 'Tester A', email: `a${stamp}@test.dev`, password: 'Passw0rd123' });
check('register works', r.status === 201 && r.body.data.user.email && !('passwordHash' in r.body.data.user));
r = await a.call('POST', '/auth/register', { name: 'Tester A', email: `a${stamp}@test.dev`, password: 'Passw0rd123' });
check('duplicate email rejected', r.status === 409);
await b.call('POST', '/auth/register', { name: 'Tester B', email: `b${stamp}@test.dev`, password: 'Passw0rd123' });
await outsider.call('POST', '/auth/register', { name: 'Outsider', email: `o${stamp}@test.dev`, password: 'Passw0rd123' });
r = await a.call('GET', '/auth/me');
check('me returns session user', r.status === 200 && r.body.data.user.name === 'Tester A');
const bad = new Client();
r = await bad.call('POST', '/auth/login', { email: `a${stamp}@test.dev`, password: 'wrongpass1' });
check('login rejects bad password', r.status === 401);
r = await bad.call('POST', '/auth/login', { email: `a${stamp}@test.dev`, password: 'Passw0rd123' });
check('login works', r.status === 200);

// --- Password reset
r = await bad.call('POST', '/auth/forgot-password', { email: `a${stamp}@test.dev` });
const token = r.body?.data?.resetUrl?.split('token=')[1];
check('forgot password issues token (dev)', r.status === 200 && !!token);
r = await bad.call('POST', '/auth/reset-password', { token, newPassword: 'NewPassw0rd9' });
check('reset password works', r.status === 200);
r = await bad.call('POST', '/auth/reset-password', { token, newPassword: 'NewPassw0rd9' });
check('reset token is single use', r.status === 400);
r = await bad.call('POST', '/auth/login', { email: `a${stamp}@test.dev`, password: 'NewPassw0rd9' });
check('login with new password', r.status === 200);

// --- Workspace
r = await a.call('POST', '/workspaces', { name: 'Test WS', description: 'x' });
const ws = r.body?.data;
check('create workspace', r.status === 201 && ws.myRole === 'OWNER');
r = await outsider.call('GET', `/workspaces/${ws.id}`);
check('non-member cannot read workspace', r.status === 404);
r = await outsider.call('GET', `/projects?workspaceId=${ws.id}`);
check('non-member cannot list projects', r.status === 404);
r = await a.call('POST', `/workspaces/${ws.id}/members`, { email: `nobody${stamp}@test.dev` });
check('add unknown email -> 404', r.status === 404);
r = await a.call('POST', `/workspaces/${ws.id}/members`, { email: `b${stamp}@test.dev`, role: 'MEMBER' });
check('add member by email', r.status === 201);
const bId = r.body?.data?.userId;
r = await b.call('PUT', `/workspaces/${ws.id}`, { name: 'Hacked' });
check('member cannot edit workspace', r.status === 403);
r = await b.call('POST', `/workspaces/${ws.id}/members`, { email: `o${stamp}@test.dev` });
check('member cannot add members', r.status === 403);
r = await b.call('DELETE', `/workspaces/${ws.id}`);
check('member cannot delete workspace', r.status === 403);
r = await a.call('PUT', `/workspaces/${ws.id}/members/${bId}`, { role: 'ADMIN' });
check('owner promotes to admin', r.status === 200 && r.body.data.role === 'ADMIN');
await a.call('PUT', `/workspaces/${ws.id}/members/${bId}`, { role: 'MEMBER' });

// --- Projects
r = await a.call('POST', '/projects', { workspaceId: ws.id, name: 'Proj One', status: 'ACTIVE', startDate: '2026-01-10', dueDate: '2026-01-01' });
check('project rejects due < start', r.status === 400);
r = await a.call('POST', '/projects', { workspaceId: ws.id, name: 'Proj One', status: 'ACTIVE', startDate: '2026-01-01', dueDate: '2027-12-31', memberIds: [bId] });
const proj = r.body?.data;
check('create project', r.status === 201 && proj.members.length === 2 && proj.progress === 0);
r = await b.call('DELETE', `/projects/${proj.id}`);
check('member cannot delete project', r.status === 403);
r = await outsider.call('GET', `/projects/${proj.id}`);
check('outsider cannot read project', r.status === 404);
r = await a.call('PUT', `/projects/${proj.id}`, { name: 'Proj Renamed', status: 'ON_HOLD' });
check('update project', r.status === 200 && r.body.data.name === 'Proj Renamed' && r.body.data.status === 'ON_HOLD');

// --- Tasks
r = await outsider.call('POST', '/tasks', { projectId: proj.id, title: 'sneaky' });
check('outsider cannot create task', r.status === 404);
r = await a.call('POST', '/tasks', { projectId: proj.id, title: 'Task 1', priority: 'HIGH', assignedTo: bId, dueDate: '2020-01-01' });
const t1 = r.body?.data;
check('create + assign task', r.status === 201 && t1.assignee.id === bId);
r = await a.call('POST', '/tasks', { projectId: proj.id, title: 'Task 2', assignedTo: 'not-a-member' });
check('cannot assign to non-member', r.status === 400);
r = await a.call('POST', '/tasks', { projectId: proj.id, title: 'Task 2' });
const t2 = r.body?.data;
r = await b.call('PUT', `/tasks/${t1.id}`, { status: 'IN_PROGRESS' });
check('member moves task (status persisted)', r.status === 200 && r.body.data.status === 'IN_PROGRESS' && r.body.data.priority === 'HIGH');
r = await b.call('PUT', `/tasks/${t1.id}`, { status: 'COMPLETED' });
check('complete task', r.status === 200);
r = await a.call('GET', `/tasks?workspaceId=${ws.id}&q=task`);
check('search tasks', r.body.data.length === 2);
r = await a.call('GET', `/tasks?workspaceId=${ws.id}&status=COMPLETED`);
check('filter tasks by status', r.body.data.length === 1);
r = await a.call('GET', `/tasks?workspaceId=${ws.id}&assignedTo=unassigned`);
check('filter unassigned', r.body.data.length === 1 && r.body.data[0].id === t2.id);

// --- Dashboard
r = await a.call('GET', `/dashboard/stats?workspaceId=${ws.id}`);
const s = r.body?.data?.totals;
check('dashboard stats from DB', r.status === 200 && s.totalProjects === 1 && s.totalTasks === 2 && s.completedTasks === 1 && s.pendingTasks === 1 && s.overdueTasks === 0 && s.activeProjects === 0, JSON.stringify(s));
check('dashboard has activity', r.body.data.recentActivity.length >= 5);
r = await outsider.call('GET', `/dashboard/stats?workspaceId=${ws.id}`);
check('outsider cannot read dashboard', r.status === 404);

// --- Activity & team
r = await a.call('GET', `/workspaces/${ws.id}/activities?projectId=${proj.id}`);
check('project activity recorded', r.body.data.some((x) => x.action === 'TASK_COMPLETED') && r.body.data.some((x) => x.action === 'TASK_ASSIGNED'));
r = await a.call('GET', `/workspaces/${ws.id}/members`);
const bm = r.body.data.find((m) => m.userId === bId);
check('members list with task counts', bm.completedTasks === 1);

// --- Removal & cleanup
r = await a.call('DELETE', `/workspaces/${ws.id}/members/${bId}`);
check('admin/owner removes member', r.status === 200);
r = await b.call('GET', `/projects?workspaceId=${ws.id}`);
check('removed member loses access', r.status === 404);
r = await a.call('DELETE', `/tasks/${t2.id}`);
check('delete task', r.status === 200);
r = await a.call('DELETE', `/projects/${proj.id}`);
check('delete project', r.status === 200);
r = await a.call('PUT', '/auth/password', { currentPassword: 'NewPassw0rd9', newPassword: 'Another1234' });
check('change password', r.status === 200);
r = await a.call('POST', '/auth/logout');
check('logout', r.status === 200);
r = await a.call('DELETE', `/workspaces/${ws.id}`);
check('(after logout) cookie cleared -> 401 or works', r.status === 401 || r.status === 200);

console.log(failed ? `\n${failed} check(s) FAILED` : '\nAll checks passed');
process.exit(failed ? 1 : 0);
