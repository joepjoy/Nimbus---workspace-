# Nimbus – Team Workspace

A full-stack team project management app: authentication, workspaces, projects, tasks with a Kanban board, team roles, activity tracking and a live dashboard. All data is stored in PostgreSQL.

| Layer    | Tech |
| -------- | ---- |
| Frontend | React 19, TypeScript, Vite, Tailwind CSS 4, React Router, Axios, Lucide |
| Backend  | Node.js, Express 4, TypeScript, Zod validation |
| Database | PostgreSQL + Prisma ORM (migrations included) |
| Auth     | JWT in an HTTP-only cookie, bcrypt (`bcryptjs`) password hashing, role-based access |

## Features

- **Auth**: register, login, logout, password reset, profile and change password
- **Workspaces**: create / edit / delete, members with **Owner / Admin / Member** roles
- **Projects**: CRUD, status (Planning, Active, On Hold, Completed), dates, members, progress %
- **Tasks**: CRUD, assign, priority, due date, search and filters, **Kanban board** (drag and drop, persisted)
- **Team**: add members by registered email, change roles, remove, see each member's tasks
- **Activity feed** on the dashboard and project pages, **live dashboard** (every number is a DB query)

## Project structure

```
nimbus/
  backend/    Express API (src/controllers, routes, middleware, services, utils) + prisma/
  frontend/   React app (src/components, pages, layouts, services, hooks, types)
  docker-compose.yml   optional local PostgreSQL
```

## Local development

**Prerequisites:** Node.js 20+ and PostgreSQL 14+ (or Docker).

### 1. Database

Option A: Docker

```bash
docker compose up -d
```

Option B: your own PostgreSQL. Create a database and user, then use that connection string below.

### 2. Backend

```bash
cd backend
npm install
cp .env.example .env        # then edit DATABASE_URL and JWT_SECRET
npx prisma migrate deploy   # applies the migrations in prisma/migrations
npm run seed                # optional demo data
npm run dev                 # http://localhost:4000
```

Generate a JWT secret with: `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`

### 3. Frontend

```bash
cd frontend
npm install
npm run dev                 # http://localhost:5173 (proxies /api to :4000)
```

### Demo accounts (after `npm run seed`)

`alice@nimbus.dev` (owner), `bob@nimbus.dev` (admin), `carol@nimbus.dev` (member). Password: `Password123`

### Changing the schema

Edit `backend/prisma/schema.prisma`, then `npx prisma migrate dev --name describe_change`.

## API overview

All responses are JSON: `{ "success": true, "data": ... }` or `{ "success": false, "error": { "message", "details" } }`.

| Area | Endpoints |
| ---- | --------- |
| Auth | `POST /api/auth/register`, `login`, `logout`, `forgot-password`, `reset-password`; `GET/PUT /api/auth/me`; `PUT /api/auth/password` |
| Workspaces | `GET/POST /api/workspaces`; `GET/PUT/DELETE /api/workspaces/:id` |
| Team | `GET/POST /api/workspaces/:id/members`; `PUT/DELETE /api/workspaces/:id/members/:userId` |
| Activity | `GET /api/workspaces/:id/activities?projectId=&limit=` |
| Projects | `GET /api/projects?workspaceId=&status=&q=`; `POST`; `GET/PUT/DELETE /api/projects/:id` |
| Tasks | `GET /api/tasks?workspaceId=|projectId=&status=&priority=&assignedTo=&q=`; `POST`; `GET/PUT/DELETE /api/tasks/:id` |
| Dashboard | `GET /api/dashboard/stats?workspaceId=` |

### Permissions (enforced on the backend)

| Action | Member | Admin | Owner |
| ------ | :----: | :---: | :---: |
| View workspace data, create projects and tasks, move/edit tasks | yes | yes | yes |
| Edit a project | if on the project | yes | yes |
| Delete a project | no | yes | yes |
| Edit workspace settings, add/remove members | no | yes (admins can only remove members) | yes |
| Change roles, add admins, delete workspace | no | no | yes |

Non-members receive `404` for a workspace so its existence is not leaked.

## Password reset

There is no email service. The backend creates a one-time hashed token (valid 1 hour). **In development** the reset link is shown on the page and logged to the API console. **In production** the link is not returned: plug an email provider into `forgotPassword` in `backend/src/controllers/auth.ts` before relying on this flow.

## Testing

With the API running against a database:

```bash
cd backend
node scripts/smoke-test.mjs          # 46 end-to-end API checks (auth, permissions, CRUD, dashboard, activity)
```

## Production deployment

**Database:** create a managed PostgreSQL instance (Render, Neon, Supabase, Railway…) and copy its connection string.

**Backend (Render web service, root directory `backend`):**

- Build command: `npm install && npm run build`
- Start command: `npm run migrate:deploy && npm start`
- Environment: `DATABASE_URL`, `JWT_SECRET`, `NODE_ENV=production`, `CLIENT_URL=https://your-app.vercel.app`

**Frontend (Vercel, root directory `frontend`, framework Vite):**

- Edit `frontend/vercel.json` and replace `YOUR-RENDER-SERVICE` with your Render hostname. The rewrite proxies `/api` to the backend so the auth cookie stays first-party. Alternatively set `VITE_API_URL` to the API origin (cookies are then cross-site: `SameSite=None; Secure` is already used in production, and `CLIENT_URL` must match exactly).

## Security notes

Passwords are bcrypt-hashed and never returned; the JWT lives in an HTTP-only cookie; every input is validated with Zod; Helmet and CORS (origin allow-list with credentials) are enabled; auth endpoints are rate limited (in-memory, per instance); production errors never leak internals. Secrets are read from environment variables only.
