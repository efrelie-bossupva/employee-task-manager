import {
  DepartmentItem,
  Profile,
  ProjectItem,
  TaskComment,
  TaskItem,
  TASK_CATEGORIES,
} from '../types';

const todayStr = () => new Date().toISOString().split('T')[0];
const daysAgoStr = (days: number) => {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().split('T')[0];
};
const daysAheadStr = (days: number) => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
};

export const DEMO_PROFILES: Profile[] = [
  {
    id: '00000000-0000-4000-8000-000000000001',
    email: 'superadmin@company.com',
    full_name: 'System Superadmin',
    role: 'superadmin',
    department: 'Executive Administration',
    created_at: '2026-01-01T08:00:00Z',
  },
  {
    id: 'mgr-001',
    email: 'manager@company.com',
    full_name: 'Sarah Jenkins (Manager)',
    role: 'manager',
    department: 'Operations & Engineering',
    created_at: '2026-01-10T08:00:00Z',
  },
  {
    id: 'emp-001',
    email: 'alex.rivera@company.com',
    full_name: 'Alex Rivera',
    role: 'employee',
    department: 'Development',
    created_at: '2026-01-12T08:00:00Z',
  },
  {
    id: 'emp-002',
    email: 'maria.santos@company.com',
    full_name: 'Maria Santos',
    role: 'employee',
    department: 'Client Support',
    created_at: '2026-01-14T08:00:00Z',
  },
  {
    id: 'emp-003',
    email: 'david.kim@company.com',
    full_name: 'David Kim',
    role: 'employee',
    department: 'Design & Creative',
    created_at: '2026-01-15T08:00:00Z',
  },
];

export const INITIAL_DEMO_TASKS: TaskItem[] = [
  {
    id: 'tsk-101',
    employee_id: 'emp-001',
    created_by: 'emp-001',
    title: 'Implement Supabase RLS policies for employee task isolation',
    description:
      'Set up PostgreSQL Row-Level Security so employees only query their own rows while managers have full visibility across the organization.',
    project_name: 'Security & Compliance',
    category: 'Development',
    status: 'completed',
    priority: 'high',
    task_date: todayStr(),
    due_date: todayStr(),
    completed_date: todayStr(),
    hours_spent: 3.5,
    manager_feedback: 'Great work on the security definer helper function—clean and fast.',
    created_at: new Date(Date.now() - 3600 * 1000 * 5).toISOString(),
    updated_at: new Date(Date.now() - 3600 * 1000 * 1).toISOString(),
  },
  {
    id: 'tsk-102',
    employee_id: 'emp-001',
    created_by: 'mgr-001',
    title: 'Optimize API response caching on dashboard metrics',
    description:
      'Assigned by Manager: Reduce initial load time on weekly summary metrics and verify mobile responsiveness.',
    project_name: 'Dashboard v2',
    category: 'Development',
    status: 'in_progress',
    priority: 'urgent',
    task_date: todayStr(),
    due_date: daysAheadStr(1),
    completed_date: null,
    hours_spent: 2.0,
    timer_accumulated_seconds: 7200,
    timer_started_at: new Date(Date.now() - 1000 * 60 * 14).toISOString(),
    is_timer_running: true,
    manager_feedback: 'Please prioritize this before Friday deployment.',
    created_at: new Date(Date.now() - 3600 * 1000 * 4).toISOString(),
    updated_at: new Date(Date.now() - 3600 * 1000 * 2).toISOString(),
  },
  {
    id: 'tsk-103',
    employee_id: 'emp-002',
    created_by: 'emp-002',
    title: 'Onboard 4 new enterprise client accounts & verify billing setup',
    description:
      'Completed walkthrough calls with Acme Corp, Globex, Initech, and Stark Logistics. Configured workspace permissions for each team.',
    project_name: 'Enterprise Onboarding',
    category: 'Client Support',
    status: 'review',
    priority: 'high',
    task_date: todayStr(),
    due_date: todayStr(),
    completed_date: null,
    hours_spent: 4.25,
    manager_feedback: null,
    created_at: new Date(Date.now() - 3600 * 1000 * 6).toISOString(),
    updated_at: new Date(Date.now() - 3600 * 1000 * 1.5).toISOString(),
  },
  {
    id: 'tsk-104',
    employee_id: 'emp-002',
    created_by: 'emp-002',
    title: 'Resolve Tier-2 support ticket queue (#4410 - #4422)',
    description:
      'Investigated webhook timeout reports for two EU customers; waiting on third-party gateway status confirmation.',
    category: 'Client Support',
    status: 'blocked',
    priority: 'urgent',
    task_date: todayStr(),
    due_date: todayStr(),
    hours_spent: 1.75,
    manager_feedback: 'Escalated to vendor account rep—keep monitoring.',
    created_at: new Date(Date.now() - 3600 * 1000 * 7).toISOString(),
    updated_at: new Date(Date.now() - 3600 * 1000 * 3).toISOString(),
  },
  {
    id: 'tsk-105',
    employee_id: 'emp-003',
    created_by: 'emp-003',
    title: 'Design Q4 product release presentation deck & social assets',
    description:
      'Created 18 slide layouts and exported high-res banners for LinkedIn and documentation portal.',
    project_name: 'Q4 Product Launch',
    category: 'Design & Creative',
    status: 'in_progress',
    priority: 'medium',
    task_date: todayStr(),
    due_date: daysAheadStr(2),
    completed_date: null,
    hours_spent: 3.0,
    timer_accumulated_seconds: 10800,
    timer_started_at: null,
    is_timer_running: false,
    manager_feedback: null,
    created_at: new Date(Date.now() - 3600 * 1000 * 8).toISOString(),
    updated_at: new Date(Date.now() - 3600 * 1000 * 2).toISOString(),
  },
  {
    id: 'tsk-106',
    employee_id: 'emp-003',
    created_by: 'mgr-001',
    title: 'Audit accessibility contrast ratios across dark/light UI components',
    description:
      'Ensure all status badges and form controls meet WCAG AA standards.',
    category: 'Design & Creative',
    status: 'todo',
    priority: 'low',
    task_date: daysAgoStr(1),
    due_date: daysAheadStr(3),
    hours_spent: 0.5,
    manager_feedback: null,
    created_at: new Date(Date.now() - 3600 * 1000 * 24).toISOString(),
    updated_at: new Date(Date.now() - 3600 * 1000 * 20).toISOString(),
  },
];

export const INITIAL_DEMO_COMMENTS: TaskComment[] = [
  {
    id: 'cmt-1',
    task_id: 'tsk-102',
    author_id: 'mgr-001',
    content: 'Hey Alex, let me know once the benchmark numbers are ready for review.',
    created_at: new Date(Date.now() - 3600 * 1000 * 3).toISOString(),
  },
  {
    id: 'cmt-2',
    task_id: 'tsk-102',
    author_id: 'emp-001',
    content: 'Will do! Query latency is already down by 62% in local testing.',
    created_at: new Date(Date.now() - 3600 * 1000 * 2).toISOString(),
  },
  {
    id: 'cmt-3',
    task_id: 'tsk-103',
    author_id: 'emp-002',
    content: 'All 4 accounts are live. Ready for manager sign-off.',
    created_at: new Date(Date.now() - 3600 * 1000 * 1.5).toISOString(),
  },
];

export const INITIAL_DEMO_DEPARTMENTS: DepartmentItem[] = TASK_CATEGORIES.map(
  (name, idx) => ({
    id: `dept-${idx + 1}`,
    name,
    created_at: '2026-01-01T08:00:00Z',
  })
);

export const INITIAL_DEMO_PROJECTS: ProjectItem[] = [
  {
    id: 'proj-1',
    name: 'Security & Compliance',
    description: 'RLS hardening, audit logging, and access control improvements.',
    status: 'active',
    created_at: '2026-01-05T08:00:00Z',
  },
  {
    id: 'proj-2',
    name: 'Dashboard v2',
    description: 'Performance optimization and UI refresh for analytics views.',
    status: 'active',
    created_at: '2026-01-08T08:00:00Z',
  },
  {
    id: 'proj-3',
    name: 'Enterprise Onboarding',
    description: 'Client workspace setup, billing verification, and training.',
    status: 'active',
    created_at: '2026-01-12T08:00:00Z',
  },
  {
    id: 'proj-4',
    name: 'Q4 Product Launch',
    description: 'Release decks, creative assets, and go-to-market collateral.',
    status: 'active',
    created_at: '2026-01-15T08:00:00Z',
  },
];

