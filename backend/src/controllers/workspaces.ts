import { z } from 'zod';
import { logActivity, userSelect } from '../services/activity';
import { requireMember } from '../services/access';
import { asyncHandler, HttpError, ok, optionalText, param, parse, query } from '../utils/http';
import { prisma } from '../utils/prisma';

const schema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(80),
  description: optionalText(500),
});

export const list = asyncHandler(async (req, res) => {
  const rows = await prisma.workspaceMember.findMany({
    where: { userId: req.userId },
    include: { workspace: { include: { _count: { select: { members: true, projects: true } } } } },
    orderBy: { joinedAt: 'asc' },
  });
  ok(res, rows.map((m) => ({ ...m.workspace, myRole: m.role })));
});

export const create = asyncHandler(async (req, res) => {
  const data = parse(schema, req.body);
  const workspace = await prisma.$transaction(async (tx) => {
    const ws = await tx.workspace.create({
      data: { name: data.name, description: data.description, ownerId: req.userId, members: { create: { userId: req.userId, role: 'OWNER' } } },
      include: { _count: { select: { members: true, projects: true } } },
    });
    await tx.activity.create({
      data: { workspaceId: ws.id, userId: req.userId, action: 'WORKSPACE_CREATED', description: `created workspace "${ws.name}"` },
    });
    return ws;
  });
  ok(res, { ...workspace, myRole: 'OWNER' }, 201);
});

export const get = asyncHandler(async (req, res) => {
  const id = param(req, 'id');
  const membership = await requireMember(req.userId, id);
  const workspace = await prisma.workspace.findUniqueOrThrow({
    where: { id },
    include: { owner: { select: userSelect }, _count: { select: { members: true, projects: true } } },
  });
  ok(res, { ...workspace, myRole: membership.role });
});

export const update = asyncHandler(async (req, res) => {
  const id = param(req, 'id');
  await requireMember(req.userId, id, 'ADMIN');
  const data = parse(schema.partial(), req.body);
  const workspace = await prisma.workspace.update({ where: { id }, data });
  await logActivity({ workspaceId: id, userId: req.userId, action: 'WORKSPACE_UPDATED', description: `updated workspace settings` });
  ok(res, workspace);
});

export const remove = asyncHandler(async (req, res) => {
  const id = param(req, 'id');
  await requireMember(req.userId, id, 'OWNER');
  await prisma.workspace.delete({ where: { id } });
  ok(res, { message: 'Workspace deleted' });
});

// ---- Team ----

export const listMembers = asyncHandler(async (req, res) => {
  const id = param(req, 'id');
  await requireMember(req.userId, id);
  const [members, openCounts, doneCounts] = await Promise.all([
    prisma.workspaceMember.findMany({ where: { workspaceId: id }, include: { user: { select: userSelect } }, orderBy: { joinedAt: 'asc' } }),
    prisma.task.groupBy({ by: ['assignedTo'], where: { project: { workspaceId: id }, status: { not: 'COMPLETED' }, assignedTo: { not: null } }, _count: true }),
    prisma.task.groupBy({ by: ['assignedTo'], where: { project: { workspaceId: id }, status: 'COMPLETED', assignedTo: { not: null } }, _count: true }),
  ]);
  const open = new Map(openCounts.map((c) => [c.assignedTo, c._count]));
  const done = new Map(doneCounts.map((c) => [c.assignedTo, c._count]));
  ok(res, members.map((m) => ({ ...m, openTasks: open.get(m.userId) ?? 0, completedTasks: done.get(m.userId) ?? 0 })));
});

export const addMember = asyncHandler(async (req, res) => {
  const id = param(req, 'id');
  const me = await requireMember(req.userId, id, 'ADMIN');
  const data = parse(
    z.object({
      email: z.string().trim().toLowerCase().email('Enter a valid email address'),
      role: z.enum(['ADMIN', 'MEMBER']).default('MEMBER'),
    }),
    req.body,
  );
  if (data.role === 'ADMIN' && me.role !== 'OWNER') throw new HttpError(403, 'Only the owner can add admins');
  const user = await prisma.user.findUnique({ where: { email: data.email } });
  if (!user) throw new HttpError(404, 'No registered user found with that email. Ask them to sign up first.');
  const existing = await prisma.workspaceMember.findUnique({ where: { workspaceId_userId: { workspaceId: id, userId: user.id } } });
  if (existing) throw new HttpError(409, 'This user is already a member of the workspace');
  const member = await prisma.workspaceMember.create({
    data: { workspaceId: id, userId: user.id, role: data.role },
    include: { user: { select: userSelect } },
  });
  await logActivity({ workspaceId: id, userId: req.userId, action: 'MEMBER_ADDED', description: `added ${user.name} to the workspace as ${data.role.toLowerCase()}` });
  ok(res, { ...member, openTasks: 0, completedTasks: 0 }, 201);
});

export const updateMemberRole = asyncHandler(async (req, res) => {
  const id = param(req, 'id');
  const targetId = param(req, 'userId');
  await requireMember(req.userId, id, 'OWNER');
  const data = parse(z.object({ role: z.enum(['ADMIN', 'MEMBER']) }), req.body);
  const target = await prisma.workspaceMember.findUnique({ where: { workspaceId_userId: { workspaceId: id, userId: targetId } }, include: { user: true } });
  if (!target) throw new HttpError(404, 'Member not found');
  if (target.role === 'OWNER') throw new HttpError(400, "The owner's role cannot be changed");
  const member = await prisma.workspaceMember.update({ where: { id: target.id }, data: { role: data.role }, include: { user: { select: userSelect } } });
  await logActivity({ workspaceId: id, userId: req.userId, action: 'MEMBER_ROLE_CHANGED', description: `changed ${target.user.name}'s role to ${data.role.toLowerCase()}` });
  ok(res, member);
});

export const removeMember = asyncHandler(async (req, res) => {
  const id = param(req, 'id');
  const targetId = param(req, 'userId');
  const me = await requireMember(req.userId, id);
  const target = await prisma.workspaceMember.findUnique({ where: { workspaceId_userId: { workspaceId: id, userId: targetId } }, include: { user: true } });
  if (!target) throw new HttpError(404, 'Member not found');
  if (target.role === 'OWNER') throw new HttpError(400, 'The workspace owner cannot be removed');

  const leaving = targetId === req.userId;
  if (!leaving) {
    if (me.role === 'MEMBER') throw new HttpError(403, 'You do not have permission to remove members');
    if (me.role === 'ADMIN' && target.role === 'ADMIN') throw new HttpError(403, 'Only the owner can remove admins');
  }

  await prisma.$transaction([
    prisma.task.updateMany({ where: { assignedTo: targetId, project: { workspaceId: id } }, data: { assignedTo: null } }),
    prisma.projectMember.deleteMany({ where: { userId: targetId, project: { workspaceId: id } } }),
    prisma.workspaceMember.delete({ where: { id: target.id } }),
  ]);
  await logActivity({
    workspaceId: id,
    userId: req.userId,
    action: 'MEMBER_REMOVED',
    description: leaving ? 'left the workspace' : `removed ${target.user.name} from the workspace`,
  });
  ok(res, { message: 'Member removed' });
});

// ---- Activity ----

export const listActivities = asyncHandler(async (req, res) => {
  const id = param(req, 'id');
  await requireMember(req.userId, id);
  const projectId = query(req, 'projectId');
  const limit = Math.min(Number(query(req, 'limit') ?? 20) || 20, 100);
  const activities = await prisma.activity.findMany({
    where: { workspaceId: id, ...(projectId ? { projectId } : {}) },
    include: { user: { select: { id: true, name: true } } },
    orderBy: { createdAt: 'desc' },
    take: limit,
  });
  ok(res, activities);
});
