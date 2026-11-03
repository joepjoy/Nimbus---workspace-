import type { Role } from '@prisma/client';
import { HttpError } from '../utils/http';
import { prisma } from '../utils/prisma';

const rank: Record<Role, number> = { MEMBER: 1, ADMIN: 2, OWNER: 3 };

/**
 * Ensures the user belongs to the workspace with at least `min` role.
 * Non-members get a 404 so workspace existence is not leaked.
 */
export async function requireMember(userId: string, workspaceId: string, min: Role = 'MEMBER') {
  const membership = await prisma.workspaceMember.findUnique({
    where: { workspaceId_userId: { workspaceId, userId } },
  });
  if (!membership) throw new HttpError(404, 'Workspace not found');
  if (rank[membership.role] < rank[min]) {
    throw new HttpError(403, 'You do not have permission to perform this action');
  }
  return membership;
}

/** Load a project and verify the caller is a member of its workspace. */
export async function requireProjectAccess(userId: string, projectId: string, min: Role = 'MEMBER') {
  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (!project) throw new HttpError(404, 'Project not found');
  const membership = await requireMember(userId, project.workspaceId, min).catch((e) => {
    if (e instanceof HttpError && e.status === 404) throw new HttpError(404, 'Project not found');
    throw e;
  });
  return { project, membership };
}

/** Load a task and verify the caller is a member of its workspace. */
export async function requireTaskAccess(userId: string, taskId: string) {
  const task = await prisma.task.findUnique({ where: { id: taskId }, include: { project: true } });
  if (!task) throw new HttpError(404, 'Task not found');
  const membership = await requireMember(userId, task.project.workspaceId).catch((e) => {
    if (e instanceof HttpError && e.status === 404) throw new HttpError(404, 'Task not found');
    throw e;
  });
  return { task, membership, workspaceId: task.project.workspaceId };
}

/** Throws unless every id is a member of the workspace. */
export async function assertAllMembers(workspaceId: string, userIds: string[]) {
  const unique = [...new Set(userIds)];
  if (!unique.length) return;
  const count = await prisma.workspaceMember.count({ where: { workspaceId, userId: { in: unique } } });
  if (count !== unique.length) throw new HttpError(400, 'All selected users must be members of the workspace');
}
