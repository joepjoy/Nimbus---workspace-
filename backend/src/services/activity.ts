import { prisma } from '../utils/prisma';

export const userSelect = { id: true, name: true, email: true, bio: true } as const;

export function logActivity(params: {
  workspaceId: string;
  userId: string;
  action: string;
  description: string;
  projectId?: string | null;
}) {
  return prisma.activity.create({
    data: {
      workspaceId: params.workspaceId,
      userId: params.userId,
      action: params.action,
      description: params.description,
      projectId: params.projectId ?? null,
    },
  });
}

export const statusLabel: Record<string, string> = {
  TODO: 'To Do',
  IN_PROGRESS: 'In Progress',
  REVIEW: 'Review',
  COMPLETED: 'Completed',
};
