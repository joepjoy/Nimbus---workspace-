import { Prisma } from '@prisma/client';
import { z } from 'zod';
import { assertAllMembers, requireMember, requireProjectAccess } from '../services/access';
import { logActivity, userSelect } from '../services/activity';
import { asyncHandler, dateField, HttpError, ok, optionalText, param, parse, query } from '../utils/http';
import { prisma } from '../utils/prisma';

const statuses = ['PLANNING', 'ACTIVE', 'ON_HOLD', 'COMPLETED'] as const;

const base = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(120),
  description: optionalText(2000),
  status: z.enum(statuses).default('PLANNING'),
  startDate: dateField,
  dueDate: dateField,
  memberIds: z.array(z.string()).max(100).optional(),
});

function checkDates(d: { startDate?: Date | null; dueDate?: Date | null }) {
  if (d.startDate && d.dueDate && d.dueDate < d.startDate) {
    throw new HttpError(400, 'Due date cannot be before the start date');
  }
}

const include = {
  members: { include: { user: { select: userSelect } } },
  tasks: { select: { status: true } },
} satisfies Prisma.ProjectInclude;

type ProjectRow = Prisma.ProjectGetPayload<{ include: typeof include }>;

function serialize(p: ProjectRow) {
  const { tasks, members, ...rest } = p;
  const completedTasks = tasks.filter((t) => t.status === 'COMPLETED').length;
  return {
    ...rest,
    members: members.map((m) => m.user),
    totalTasks: tasks.length,
    completedTasks,
    progress: tasks.length ? Math.round((completedTasks / tasks.length) * 100) : 0,
  };
}

export const list = asyncHandler(async (req, res) => {
  const workspaceId = query(req, 'workspaceId');
  if (!workspaceId) throw new HttpError(400, 'workspaceId is required');
  await requireMember(req.userId, workspaceId);
  const status = query(req, 'status');
  const q = query(req, 'q');
  const projects = await prisma.project.findMany({
    where: {
      workspaceId,
      ...(status && (statuses as readonly string[]).includes(status) ? { status: status as (typeof statuses)[number] } : {}),
      ...(q ? { name: { contains: q, mode: 'insensitive' } } : {}),
    },
    include,
    orderBy: { createdAt: 'desc' },
  });
  ok(res, projects.map(serialize));
});

export const create = asyncHandler(async (req, res) => {
  const { workspaceId, ...rest } = parse(z.object({ workspaceId: z.string().min(1) }).and(base), req.body);
  await requireMember(req.userId, workspaceId);
  checkDates(rest);
  const memberIds = [...new Set([req.userId, ...(rest.memberIds ?? [])])];
  await assertAllMembers(workspaceId, memberIds);

  const project = await prisma.project.create({
    data: {
      workspaceId,
      name: rest.name,
      description: rest.description,
      status: rest.status,
      startDate: rest.startDate,
      dueDate: rest.dueDate,
      members: { create: memberIds.map((userId) => ({ userId })) },
    },
    include,
  });
  await logActivity({ workspaceId, projectId: project.id, userId: req.userId, action: 'PROJECT_CREATED', description: `created project "${project.name}"` });
  ok(res, serialize(project), 201);
});

export const get = asyncHandler(async (req, res) => {
  const { project } = await requireProjectAccess(req.userId, param(req, 'id'));
  const full = await prisma.project.findUniqueOrThrow({ where: { id: project.id }, include });
  ok(res, serialize(full));
});

export const update = asyncHandler(async (req, res) => {
  const { project, membership } = await requireProjectAccess(req.userId, param(req, 'id'));
  const isProjectMember = await prisma.projectMember.findUnique({ where: { projectId_userId: { projectId: project.id, userId: req.userId } } });
  if (membership.role === 'MEMBER' && !isProjectMember) {
    throw new HttpError(403, 'Only project members or admins can edit this project');
  }
  const data = parse(base.partial(), req.body);
  checkDates({ startDate: data.startDate === undefined ? project.startDate : data.startDate, dueDate: data.dueDate === undefined ? project.dueDate : data.dueDate });
  if (data.memberIds) await assertAllMembers(project.workspaceId, data.memberIds);

  const { memberIds, ...fields } = data;
  const updated = await prisma.$transaction(async (tx) => {
    if (memberIds) {
      await tx.projectMember.deleteMany({ where: { projectId: project.id, userId: { notIn: memberIds } } });
      await tx.projectMember.createMany({ data: memberIds.map((userId) => ({ projectId: project.id, userId })), skipDuplicates: true });
    }
    return tx.project.update({ where: { id: project.id }, data: fields, include });
  });
  await logActivity({
    workspaceId: project.workspaceId,
    projectId: project.id,
    userId: req.userId,
    action: 'PROJECT_UPDATED',
    description: data.status && data.status !== project.status ? `changed project "${updated.name}" status to ${data.status.replace('_', ' ').toLowerCase()}` : `updated project "${updated.name}"`,
  });
  ok(res, serialize(updated));
});

export const remove = asyncHandler(async (req, res) => {
  const { project } = await requireProjectAccess(req.userId, param(req, 'id'), 'ADMIN');
  await prisma.project.delete({ where: { id: project.id } });
  await logActivity({ workspaceId: project.workspaceId, userId: req.userId, action: 'PROJECT_DELETED', description: `deleted project "${project.name}"` });
  ok(res, { message: 'Project deleted' });
});
