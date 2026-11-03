import { Prisma } from '@prisma/client';
import { z } from 'zod';
import { assertAllMembers, requireMember, requireProjectAccess, requireTaskAccess } from '../services/access';
import { logActivity, statusLabel } from '../services/activity';
import { asyncHandler, dateField, HttpError, ok, optionalText, param, parse, query } from '../utils/http';
import { prisma } from '../utils/prisma';

const statuses = ['TODO', 'IN_PROGRESS', 'REVIEW', 'COMPLETED'] as const;
const priorities = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'] as const;

const base = z.object({
  title: z.string().trim().min(2, 'Title must be at least 2 characters').max(200),
  description: optionalText(5000),
  status: z.enum(statuses).default('TODO'),
  priority: z.enum(priorities).default('MEDIUM'),
  assignedTo: z.preprocess((v) => (v === '' ? null : v), z.string().nullable().optional()),
  dueDate: dateField,
});

const include = {
  project: { select: { id: true, name: true, workspaceId: true } },
  assignee: { select: { id: true, name: true, email: true } },
} satisfies Prisma.TaskInclude;

export const list = asyncHandler(async (req, res) => {
  const workspaceId = query(req, 'workspaceId');
  const projectId = query(req, 'projectId');
  if (!workspaceId && !projectId) throw new HttpError(400, 'workspaceId or projectId is required');

  let wsId = workspaceId;
  if (projectId) {
    const { project } = await requireProjectAccess(req.userId, projectId);
    wsId = project.workspaceId;
  } else {
    await requireMember(req.userId, workspaceId!);
  }

  const status = query(req, 'status');
  const priority = query(req, 'priority');
  const assignee = query(req, 'assignedTo');
  const q = query(req, 'q');
  const where: Prisma.TaskWhereInput = {
    project: { workspaceId: wsId },
    ...(projectId ? { projectId } : {}),
    ...(status && (statuses as readonly string[]).includes(status) ? { status: status as (typeof statuses)[number] } : {}),
    ...(priority && (priorities as readonly string[]).includes(priority) ? { priority: priority as (typeof priorities)[number] } : {}),
    ...(assignee ? { assignedTo: assignee === 'unassigned' ? null : assignee } : {}),
    ...(q ? { OR: [{ title: { contains: q, mode: 'insensitive' } }, { description: { contains: q, mode: 'insensitive' } }] } : {}),
  };
  const tasks = await prisma.task.findMany({ where, include, orderBy: [{ updatedAt: 'desc' }] });
  ok(res, tasks);
});

export const create = asyncHandler(async (req, res) => {
  const { projectId, ...data } = parse(z.object({ projectId: z.string().min(1) }).and(base), req.body);
  const { project } = await requireProjectAccess(req.userId, projectId);
  if (data.assignedTo) await assertAllMembers(project.workspaceId, [data.assignedTo]);

  const task = await prisma.task.create({ data: { ...data, projectId }, include });
  await logActivity({ workspaceId: project.workspaceId, projectId, userId: req.userId, action: 'TASK_CREATED', description: `created task "${task.title}" in ${project.name}` });
  if (task.assignee) {
    await logActivity({ workspaceId: project.workspaceId, projectId, userId: req.userId, action: 'TASK_ASSIGNED', description: `assigned "${task.title}" to ${task.assignee.name}` });
  }
  ok(res, task, 201);
});

export const get = asyncHandler(async (req, res) => {
  const { task } = await requireTaskAccess(req.userId, param(req, 'id'));
  const full = await prisma.task.findUniqueOrThrow({ where: { id: task.id }, include });
  ok(res, full);
});

export const update = asyncHandler(async (req, res) => {
  const { task: before, workspaceId } = await requireTaskAccess(req.userId, param(req, 'id'));
  // .partial() keeps defaults out: only fields the client sent are updated.
  const data = parse(base.partial().extend({ projectId: z.string().optional() }), req.body);
  if (data.assignedTo) await assertAllMembers(workspaceId, [data.assignedTo]);
  if (data.projectId && data.projectId !== before.projectId) {
    const target = await prisma.project.findUnique({ where: { id: data.projectId } });
    if (!target || target.workspaceId !== workspaceId) throw new HttpError(400, 'Target project must be in the same workspace');
  }

  const task = await prisma.task.update({ where: { id: before.id }, data, include });
  const log = (action: string, description: string) =>
    logActivity({ workspaceId, projectId: task.projectId, userId: req.userId, action, description });

  if (data.status && data.status !== before.status) {
    if (data.status === 'COMPLETED') await log('TASK_COMPLETED', `completed task "${task.title}"`);
    else await log('TASK_STATUS_CHANGED', `moved "${task.title}" from ${statusLabel[before.status]} to ${statusLabel[data.status]}`);
  }
  if (data.assignedTo !== undefined && data.assignedTo !== before.assignedTo) {
    await log('TASK_ASSIGNED', task.assignee ? `assigned "${task.title}" to ${task.assignee.name}` : `unassigned "${task.title}"`);
  }
  const editedKeys = ['title', 'description', 'priority', 'dueDate', 'projectId'] as const;
  if (editedKeys.some((k) => data[k] !== undefined)) {
    await log('TASK_UPDATED', `updated task "${task.title}"`);
  }
  ok(res, task);
});

export const remove = asyncHandler(async (req, res) => {
  const { task, workspaceId } = await requireTaskAccess(req.userId, param(req, 'id'));
  await prisma.task.delete({ where: { id: task.id } });
  await logActivity({ workspaceId, projectId: task.projectId, userId: req.userId, action: 'TASK_DELETED', description: `deleted task "${task.title}"` });
  ok(res, { message: 'Task deleted' });
});
