import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { PrismaClient, type Priority, type ProjectStatus, type TaskStatus } from '@prisma/client';

const prisma = new PrismaClient();
const day = 24 * 60 * 60 * 1000;
const inDays = (n: number) => new Date(Date.now() + n * day);

async function main() {
  if (await prisma.user.findUnique({ where: { email: 'alice@nimbus.dev' } })) {
    console.log('Seed data already present, skipping.');
    return;
  }
  const passwordHash = await bcrypt.hash('Password123', 12);
  const [alice, bob, carol] = await Promise.all(
    [
      ['Alice Johnson', 'alice@nimbus.dev', 'Product lead'],
      ['Bob Martin', 'bob@nimbus.dev', 'Full-stack developer'],
      ['Carol Singh', 'carol@nimbus.dev', 'UI/UX designer'],
    ].map(([name, email, bio]) => prisma.user.create({ data: { name, email, bio, passwordHash } })),
  );

  const ws = await prisma.workspace.create({
    data: {
      name: 'Acme Product Team',
      description: 'Everything we are shipping this quarter.',
      ownerId: alice.id,
      members: { create: [{ userId: alice.id, role: 'OWNER' }, { userId: bob.id, role: 'ADMIN' }, { userId: carol.id, role: 'MEMBER' }] },
    },
  });

  const mkProject = (name: string, description: string, status: ProjectStatus, start: number, due: number, users: string[]) =>
    prisma.project.create({
      data: { workspaceId: ws.id, name, description, status, startDate: inDays(start), dueDate: inDays(due), members: { create: users.map((userId) => ({ userId })) } },
    });

  const web = await mkProject('Website Redesign', 'Refresh the marketing site with the new brand.', 'ACTIVE', -20, 14, [alice.id, carol.id]);
  const mobile = await mkProject('Mobile App v2', 'Ship the second major version of the mobile app.', 'ACTIVE', -10, 45, [alice.id, bob.id]);
  const api = await mkProject('API Platform', 'Public REST API and developer docs.', 'PLANNING', 5, 90, [bob.id]);
  const onboarding = await mkProject('Customer Onboarding', 'Improve first-run experience.', 'COMPLETED', -60, -5, [alice.id, carol.id]);

  type T = [string, string, TaskStatus, Priority, string | null, number | null];
  const tasks = (projectId: string, rows: T[]) =>
    prisma.task.createMany({
      data: rows.map(([title, description, status, priority, assignedTo, due]) => ({
        projectId, title, description, status, priority, assignedTo, dueDate: due === null ? null : inDays(due),
      })),
    });

  await tasks(web.id, [
    ['Design homepage hero', 'Explore three hero concepts.', 'COMPLETED', 'HIGH', carol.id, -8],
    ['Build pricing page', 'Responsive pricing table with toggle.', 'IN_PROGRESS', 'HIGH', bob.id, 3],
    ['Write launch copy', 'Headline and feature blurbs.', 'REVIEW', 'MEDIUM', alice.id, 2],
    ['Set up analytics', 'Track conversions on key pages.', 'TODO', 'LOW', null, 10],
    ['Fix navbar on mobile', 'Menu overlaps content on small screens.', 'TODO', 'URGENT', bob.id, -2],
  ]);
  await tasks(mobile.id, [
    ['Push notifications', 'Add FCM integration.', 'IN_PROGRESS', 'HIGH', bob.id, 7],
    ['Offline mode', 'Cache last-viewed projects.', 'TODO', 'MEDIUM', bob.id, 25],
    ['App store screenshots', 'Prepare assets for both stores.', 'TODO', 'LOW', carol.id, 40],
    ['Crash reporting', 'Integrate error monitoring.', 'COMPLETED', 'MEDIUM', bob.id, -3],
  ]);
  await tasks(api.id, [
    ['Draft OpenAPI spec', 'Describe all public endpoints.', 'IN_PROGRESS', 'HIGH', bob.id, 12],
    ['Choose rate limits', 'Define tiers and quotas.', 'TODO', 'MEDIUM', alice.id, 20],
  ]);
  await tasks(onboarding.id, [
    ['Welcome email series', '', 'COMPLETED', 'MEDIUM', alice.id, -20],
    ['Product tour', '', 'COMPLETED', 'HIGH', carol.id, -12],
  ]);

  const acts: [string, string, string, string, string | null, number][] = [
    [alice.id, 'WORKSPACE_CREATED', 'created workspace "Acme Product Team"', ws.id, null, -21],
    [alice.id, 'MEMBER_ADDED', 'added Bob Martin to the workspace as admin', ws.id, null, -21],
    [alice.id, 'PROJECT_CREATED', 'created project "Website Redesign"', ws.id, web.id, -20],
    [carol.id, 'TASK_COMPLETED', 'completed task "Design homepage hero"', ws.id, web.id, -8],
    [bob.id, 'TASK_COMPLETED', 'completed task "Crash reporting"', ws.id, mobile.id, -3],
    [bob.id, 'TASK_STATUS_CHANGED', 'moved "Build pricing page" from To Do to In Progress', ws.id, web.id, -1],
    [alice.id, 'TASK_ASSIGNED', 'assigned "Push notifications" to Bob Martin', ws.id, mobile.id, -1],
  ];
  await prisma.activity.createMany({
    data: acts.map(([userId, action, description, workspaceId, projectId, d]) => ({
      userId, action, description, workspaceId, projectId, createdAt: inDays(d),
    })),
  });

  console.log('Seeded. Log in with alice@nimbus.dev / bob@nimbus.dev / carol@nimbus.dev — password: Password123');
}

main().finally(() => prisma.$disconnect());
