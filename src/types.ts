export type UserRole = 'employee' | 'manager' | 'superadmin';

export type TaskStatus = 'todo' | 'in_progress' | 'review' | 'completed' | 'blocked';

export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';

export interface Profile {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  department: string;
  avatar_url?: string;
  created_at: string;
}

export interface DepartmentItem {
  id: string;
  name: string;
  created_by?: string | null;
  created_at: string;
}

export type ProjectStatus = 'active' | 'completed' | 'archived';

export interface ProjectItem {
  id: string;
  name: string;
  description?: string;
  status: ProjectStatus;
  created_by?: string | null;
  created_at: string;
}

export interface ProjectMember {
  id: string;
  project_id: string;
  employee_id: string;
  assigned_by?: string | null;
  created_at: string;
}

export interface TaskItem {
  id: string;
  employee_id: string;
  created_by: string;
  title: string;
  description: string;
  project_name?: string | null;
  category: string;
  status: TaskStatus;
  priority: TaskPriority;
  task_date: string; // YYYY-MM-DD
  due_date?: string | null;
  completed_date?: string | null; // YYYY-MM-DD
  hours_spent: number;
  timer_started_at?: string | null;
  timer_accumulated_seconds?: number;
  is_timer_running?: boolean;
  manager_feedback?: string | null;
  is_deleted?: boolean;
  deleted_at?: string | null;
  deleted_by?: string | null;
  deleted_by_name?: string | null;
  created_at: string;
  updated_at: string;
}

export interface TaskComment {
  id: string;
  task_id: string;
  author_id: string;
  author_name?: string | null;
  author_role?: UserRole | null;
  content: string;
  created_at: string;
}

export type NotificationType =
  | 'task_assigned'
  | 'task_logged'
  | 'status_changed'
  | 'feedback_added'
  | 'comment_added'
  | 'task_deleted'
  | 'task_restored'
  | 'activity';

export interface AppNotification {
  id: string;
  recipient_id: string;
  actor_id?: string | null;
  actor_name: string;
  task_id?: string | null;
  type: NotificationType;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
}

export const TASK_CATEGORIES = [
  'Development',
  'Operations',
  'Client Support',
  'Design & Creative',
  'Sales & Marketing',
  'Administration',
  'Research',
  'General',
] as const;

export const STATUS_CONFIG: Record<
  TaskStatus,
  { label: string; badgeClass: string; dotClass: string }
> = {
  todo: {
    label: 'To Do',
    badgeClass: 'bg-slate-100 text-slate-700 border-slate-200',
    dotClass: 'bg-slate-400',
  },
  in_progress: {
    label: 'In Progress',
    badgeClass: 'bg-blue-50 text-blue-700 border-blue-200',
    dotClass: 'bg-blue-500',
  },
  review: {
    label: 'For Review',
    badgeClass: 'bg-amber-50 text-amber-700 border-amber-200',
    dotClass: 'bg-amber-500',
  },
  completed: {
    label: 'Completed',
    badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    dotClass: 'bg-emerald-500',
  },
  blocked: {
    label: 'Blocked',
    badgeClass: 'bg-rose-50 text-rose-700 border-rose-200',
    dotClass: 'bg-rose-500',
  },
};

export const PRIORITY_CONFIG: Record<
  TaskPriority,
  { label: string; badgeClass: string }
> = {
  low: {
    label: 'Low',
    badgeClass: 'bg-slate-100 text-slate-600 border-slate-200',
  },
  medium: {
    label: 'Medium',
    badgeClass: 'bg-sky-50 text-sky-700 border-sky-200',
  },
  high: {
    label: 'High',
    badgeClass: 'bg-orange-50 text-orange-700 border-orange-200',
  },
  urgent: {
    label: 'Urgent',
    badgeClass: 'bg-red-50 text-red-700 border-red-200',
  },
};

