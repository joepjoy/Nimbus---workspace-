import { requireMember } from '../services/access';
import { asyncHandler, HttpError, ok, query } from '../utils/http';
import { prisma } from '../utils/prisma';

export const stats = asyncHandler(async (req, res) => {
  let workspaceId = query(req, 'workspaceId');
  if (!workspaceId) {
    const first = await prisma.workspaceMember.findFirst({ where: { userId: req.userId }, orderBy: { joinedAt: 'asc' } });
    if (!first) throw new HttpError(404, 'You are not a member of any workspace yet');
    workspaceId = first.workspaceId;
  }
  await requireMember(req.userId, workspaceId);

  const now = new Date();
  const soon = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);
  const inWs = { project: { workspaceId } };
  const open = { status: { not: 'COMPLETED' as const } };

  const [totalProjects, activeProjects, totalTasks, completedTasks, pendingTasks, overdueTasks, byStatus, byPriority, recentActivity, upcomingTasks, upcomingProjects, projects] =
    await Promise.all([
      prisma.project.count({ where: { workspaceId } }),
      prisma.project.count({ where: { workspaceId, status: 'ACTIVE' } }),
      prisma.task.count({ where: inWs }),
      prisma.task.count({ where: { ...inWs, status: 'COMPLETED' } }),
      prisma.task.count({ where: { ...inWs, ...open } }),
      prisma.task.count({ where: { ...inWs, ...open, dueDate: { lt: now } } }),
      prisma.task.groupBy({ by: ['status'], where: inWs, _count: true }),
      prisma.task.groupBy({ by: ['priority'], where: { ...inWs, ...open }, _count: true }),
      prisma.activity.findMany({
        where: { workspaceId },
        include: { user: { select: { id: true, name: true } } },
        orderBy: { createdAt: 'desc' },
        take: 10,
      }),
      prisma.task.findMany({
        where: { ...inWs, ...open, dueDate: { not: null, lte: soon } },
        include: { project: { select: { id: true, name: true } }, assignee: { select: { id: true, name: true } } },
        orderBy: { dueDate: 'asc' },
        take: 8,
      }),
      prisma.project.findMany({
        where: { workspaceId, status: { not: 'COMPLETED' }, dueDate: { not: null, lte: soon } },
        select: { id: true, name: true, dueDate: true, status: true },
        orderBy: { dueDate: 'asc' },
        take: 5,
      }),
      prisma.project.findMany({
        where: { workspaceId },
        select: { id: true, name: true, status: true, tasks: { select: { status: true } } },
        orderBy: { createdAt: 'desc' },
        take: 8,
      }),
    ]);

  const statusCounts: Record<string, number> = { TODO: 0, IN_PROGRESS: 0, REVIEW: 0, COMPLETED: 0 };
  byStatus.forEach((r) => (statusCounts[r.status] = r._count));
  const priorityCounts: Record<string, number> = { LOW: 0, MEDIUM: 0, HIGH: 0, URGENT: 0 };
  byPriority.forEach((r) => (priorityCounts[r.priority] = r._count));

  ok(res, {
    totals: { totalProjects, activeProjects, totalTasks, completedTasks, pendingTasks, overdueTasks },
    tasksByStatus: statusCounts,
    openTasksByPriority: priorityCounts,
    projectProgress: projects.map((p) => {
      const done = p.tasks.filter((t) => t.status === 'COMPLETED').length;
      return { id: p.id, name: p.name, status: p.status, totalTasks: p.tasks.length, completedTasks: done, progress: p.tasks.length ? Math.round((done / p.tasks.length) * 100) : 0 };
    }),
    recentActivity,
    upcomingDeadlines: [
      ...upcomingTasks.map((t) => ({ type: 'task' as const, id: t.id, title: t.title, dueDate: t.dueDate, project: t.project, assignee: t.assignee, priority: t.priority })),
      ...upcomingProjects.map((p) => ({ type: 'project' as const, id: p.id, title: p.name, dueDate: p.dueDate, project: null, assignee: null, priority: null })),
    ].sort((a, b) => +new Date(a.dueDate!) - +new Date(b.dueDate!)),
  });
});
