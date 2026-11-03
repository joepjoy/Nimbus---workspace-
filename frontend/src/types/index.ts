export type Role = 'OWNER' | 'ADMIN' | 'MEMBER';
export type ProjectStatus = 'PLANNING' | 'ACTIVE' | 'ON_HOLD' | 'COMPLETED';
export type TaskStatus = 'TODO' | 'IN_PROGRESS' | 'REVIEW' | 'COMPLETED';
export type Priority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';

export interface User {
  id: string;
  name: string;
  email: string;
  bio?: string | null;
  createdAt?: string;
}

export interface Workspace {
  id: string;
  name: string;
  description?: string | null;
  ownerId: string;
  createdAt: string;
  myRole: Role;
  _count?: { members: number; projects: number };
}

export interface Member {
  id: string;
  userId: string;
  role: Role;
  joinedAt: string;
  user: User;
  openTasks: number;
  completedTasks: number;
}

export interface Project {
  id: string;
  workspaceId: string;
  name: string;
  description?: string | null;
  status: ProjectStatus;
  startDate?: string | null;
  dueDate?: string | null;
  createdAt: string;
  members: User[];
  totalTasks: number;
  completedTasks: number;
  progress: number;
}

export interface Task {
  id: string;
  projectId: string;
  title: string;
  description?: string | null;
  status: TaskStatus;
  priority: Priority;
  assignedTo?: string | null;
  dueDate?: string | null;
  createdAt: string;
  updatedAt: string;
  project: { id: string; name: string; workspaceId?: string };
  assignee?: { id: string; name: string; email?: string } | null;
}

export interface Activity {
  id: string;
  action: string;
  description: string;
  createdAt: string;
  projectId?: string | null;
  user: { id: string; name: string };
}

export interface DashboardStats {
  totals: {
    totalProjects: number;
    activeProjects: number;
    totalTasks: number;
    completedTasks: number;
    pendingTasks: number;
    overdueTasks: number;
  };
  tasksByStatus: Record<TaskStatus, number>;
  openTasksByPriority: Record<Priority, number>;
  projectProgress: { id: string; name: string; status: ProjectStatus; totalTasks: number; completedTasks: number; progress: number }[];
  recentActivity: Activity[];
  upcomingDeadlines: {
    type: 'task' | 'project';
    id: string;
    title: string;
    dueDate: string;
    project: { id: string; name: string } | null;
    assignee: { id: string; name: string } | null;
    priority: Priority | null;
  }[];
}
