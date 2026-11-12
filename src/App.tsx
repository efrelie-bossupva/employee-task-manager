import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Briefcase,
  Plus,
  Search,
  Filter,
  Download,
  LogOut,
  Database,
  Users,
  CheckCircle2,
  Clock,
  AlertTriangle,
  LayoutList,
  Kanban,
  Shield,
  MessageSquare,
  Calendar,
  RefreshCw,
  ChevronRight,
  UserCheck,
  UserPlus,
  Edit3,
  Trash2,
  RotateCcw,
  Bell,
  CheckCheck,
} from 'lucide-react';
import {
  AppNotification,
  NotificationType,
  Profile,
  TaskComment,
  TaskItem,
  TaskPriority,
  TaskStatus,
  UserRole,
  STATUS_CONFIG,
  PRIORITY_CONFIG,
} from './types';
import { getSupabaseClient, getSupabaseConfig } from './lib/supabase';
import {
  DEMO_PROFILES,
  INITIAL_DEMO_COMMENTS,
  INITIAL_DEMO_TASKS,
} from './lib/mockData';
import { AuthScreen } from './components/AuthScreen';
import { TaskFormModal } from './components/TaskFormModal';
import { TaskDetailDrawer } from './components/TaskDetailDrawer';
import { AddEmployeeModal } from './components/AddEmployeeModal';
import logoImg from './img/logo.png';

const DEMO_TASKS_STORAGE_KEY = 'etm_demo_tasks_v1';
const DEMO_COMMENTS_STORAGE_KEY = 'etm_demo_comments_v1';
const DEMO_PROFILES_STORAGE_KEY = 'etm_demo_profiles_v1';
const DEMO_ACTIVE_USER_KEY = 'etm_demo_active_user_v1';

export function App() {
  const [supabaseConfig, setSupabaseConfig] = useState(() => getSupabaseConfig());
  const [currentUser, setCurrentUser] = useState<Profile | null>(null);
  const [isDemoSession, setIsDemoSession] = useState<boolean>(false);
  const [authChecking, setAuthChecking] = useState<boolean>(true);

  // Data state
  const [profiles, setProfiles] = useState<Profile[]>(DEMO_PROFILES);
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [comments, setComments] = useState<TaskComment[]>([]);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loadingData, setLoadingData] = useState<boolean>(false);

  // UI & Filter state
  const [viewMode, setViewMode] = useState<'list' | 'kanban' | 'deleted' | 'employees'>('list');
  const [isNotifOpen, setIsNotifOpen] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedPriority, setSelectedPriority] = useState<string>('all');
  const [selectedDateFilter, setSelectedDateFilter] = useState<string>('all');
  const [customDate, setCustomDate] = useState<string>('');

  // Modals & Drawers
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<TaskItem | null>(null);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [isAddEmployeeModalOpen, setIsAddEmployeeModalOpen] = useState(false);
  const [editingProfile, setEditingProfile] = useState<Profile | null>(null);
  const [taskPendingDelete, setTaskPendingDelete] = useState<TaskItem | null>(null);
  const [taskPendingPermanentDelete, setTaskPendingPermanentDelete] =
    useState<TaskItem | null>(null);
  const [deletingTask, setDeletingTask] = useState(false);

  const isSuperAdmin = currentUser?.role === 'superadmin';
  const isManager =
    currentUser?.role === 'manager' ||
    currentUser?.role === 'admin' ||
    currentUser?.role === 'superadmin';

  // Load Demo data helper
  const loadDemoDataFromStorage = useCallback(() => {
    try {
      const savedProfiles = localStorage.getItem(DEMO_PROFILES_STORAGE_KEY);
      const parsedProfiles: Profile[] = savedProfiles
        ? JSON.parse(savedProfiles)
        : DEMO_PROFILES;
      setProfiles(parsedProfiles);

      const savedTasks = localStorage.getItem(DEMO_TASKS_STORAGE_KEY);
      const parsedTasks: TaskItem[] = savedTasks
        ? JSON.parse(savedTasks)
        : INITIAL_DEMO_TASKS;
      setTasks(parsedTasks);

      const savedComments = localStorage.getItem(DEMO_COMMENTS_STORAGE_KEY);
      const parsedComments: TaskComment[] = savedComments
        ? JSON.parse(savedComments)
        : INITIAL_DEMO_COMMENTS;
      setComments(parsedComments);
    } catch {
      setProfiles(DEMO_PROFILES);
      setTasks(INITIAL_DEMO_TASKS);
      setComments(INITIAL_DEMO_COMMENTS);
    }
  }, []);

  // Fetch live data from Supabase
  const fetchSupabaseData = useCallback(async (activeProfile: Profile) => {
    const supabase = getSupabaseClient();
    if (!supabase) return;
    setLoadingData(true);
    try {
      const [
        { data: profData },
        { data: taskData },
        { data: cmtData },
        { data: notifData },
      ] = await Promise.all([
        supabase.from('profiles').select('*').order('full_name'),
        supabase
          .from('tasks')
          .select('*')
          .order('task_date', { ascending: false })
          .order('created_at', { ascending: false }),
        supabase
          .from('task_comments')
          .select('*')
          .order('created_at', { ascending: true }),
        supabase
          .from('notifications')
          .select('*')
          .eq('recipient_id', activeProfile.id)
          .order('created_at', { ascending: false })
          .limit(50),
      ]);

      if (profData && profData.length > 0) {
        setProfiles(profData as Profile[]);
      } else {
        setProfiles([activeProfile]);
      }
      if (taskData) setTasks(taskData as TaskItem[]);
      if (cmtData) setComments(cmtData as TaskComment[]);
      if (notifData) setNotifications(notifData as AppNotification[]);
    } finally {
      setLoadingData(false);
    }
  }, []);

  // Initialize session on mount or config change
  useEffect(() => {
    let mounted = true;
    const initAuth = async () => {
      setAuthChecking(true);
      const cfg = getSupabaseConfig();
      setSupabaseConfig(cfg);

      // Check if user was in a Demo session
      const savedDemoUser = localStorage.getItem(DEMO_ACTIVE_USER_KEY);
      if (savedDemoUser && !cfg.isConfigured) {
        try {
          const parsedUser = JSON.parse(savedDemoUser) as Profile;
          loadDemoDataFromStorage();
          if (mounted) {
            setCurrentUser(parsedUser);
            setIsDemoSession(true);
            setAuthChecking(false);
          }
          return;
        } catch {
          localStorage.removeItem(DEMO_ACTIVE_USER_KEY);
        }
      }

      const supabase = getSupabaseClient();
      if (!supabase) {
        loadDemoDataFromStorage();
        if (mounted) setAuthChecking(false);
        return;
      }

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (session?.user && mounted) {
        const { data: prof } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single();

        const resolvedProfile: Profile = prof || {
          id: session.user.id,
          email: session.user.email || '',
          full_name:
            session.user.user_metadata?.full_name ||
            session.user.email?.split('@')[0] ||
            'User',
          role: (session.user.user_metadata?.role as UserRole) || 'employee',
          department: session.user.user_metadata?.department || 'General',
          created_at: new Date().toISOString(),
        };

        setIsDemoSession(false);
        setCurrentUser(resolvedProfile);
        await fetchSupabaseData(resolvedProfile);
      } else {
        loadDemoDataFromStorage();
      }
      if (mounted) setAuthChecking(false);
    };

    initAuth();
    return () => {
      mounted = false;
    };
  }, [fetchSupabaseData, loadDemoDataFromStorage]);

  // Reset manager-only filters/views when switching to an employee account
  useEffect(() => {
    if (currentUser?.role === 'employee') {
      setSelectedEmployeeId(currentUser.id);
      if (viewMode === 'employees') {
        setViewMode('list');
      }
    } else {
      setSelectedEmployeeId('all');
    }
  }, [currentUser?.id, currentUser?.role, viewMode]);

  // Quick-login card handler (uses real Supabase Auth when connected)
  const handleDemoLogin = async (profile: Profile) => {
    const supabase = getSupabaseClient();
    if (supabase) {
      const err = await handleSupabaseSignIn(profile.email, 'Password123!');
      if (!err) return;
    }
    loadDemoDataFromStorage();
    setIsDemoSession(true);
    setCurrentUser(profile);
    localStorage.setItem(DEMO_ACTIVE_USER_KEY, JSON.stringify(profile));
  };

  // Supabase Sign In / Fallback Demo Sign In
  const handleSupabaseSignIn = async (
    email: string,
    password: string
  ): Promise<string | null> => {
    const supabase = getSupabaseClient();
    if (!supabase) {
      // Check if email matches a demo profile
      const found = profiles.find(
        (p) => p.email.toLowerCase() === email.trim().toLowerCase()
      );
      if (found) {
        handleDemoLogin(found);
        return null;
      }
      return 'Supabase is not connected yet. Click one of the Instant Demo Login cards below, or click "Connect Supabase DB" in the top right.';
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) return error.message;
    if (data.user) {
      const { data: prof } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', data.user.id)
        .single();

      const resolvedProfile: Profile = prof || {
        id: data.user.id,
        email: data.user.email || email,
        full_name:
          data.user.user_metadata?.full_name || email.split('@')[0] || 'User',
        role: (data.user.user_metadata?.role as UserRole) || 'employee',
        department: data.user.user_metadata?.department || 'General',
        created_at: new Date().toISOString(),
      };
      setIsDemoSession(false);
      setCurrentUser(resolvedProfile);
      await fetchSupabaseData(resolvedProfile);
    }
    return null;
  };

  // Manager / Admin: Create New Employee Account without logging out
  const handleCreateEmployee = async (params: {
    email: string;
    password: string;
    fullName: string;
    role: UserRole;
    department: string;
  }): Promise<string | null> => {
    if (!currentUser || !isManager) {
      return 'Only managers or admins can add employee accounts.';
    }

    const supabase = getSupabaseClient();
    if (!supabase || isDemoSession) {
      const newProfile: Profile = {
        id: `emp-${Date.now()}`,
        email: params.email.trim(),
        full_name: params.fullName.trim(),
        role: params.role,
        department: params.department.trim() || 'General',
        created_at: new Date().toISOString(),
      };
      const updatedProfiles = [...profiles, newProfile];
      setProfiles(updatedProfiles);
      localStorage.setItem(
        DEMO_PROFILES_STORAGE_KEY,
        JSON.stringify(updatedProfiles)
      );
      return null;
    }

    const { error } = await supabase.rpc('create_employee_account', {
      p_email: params.email.trim(),
      p_password: params.password,
      p_full_name: params.fullName.trim(),
      p_department: params.department.trim() || 'General',
      p_role: params.role,
    });

    if (error) return error.message;
    await fetchSupabaseData(currentUser);
    return null;
  };

  // Self-Edit (any user) OR Superadmin (all users) OR Manager/Admin (employees only): Update User Account
  const handleUpdateEmployee = async (params: {
    userId: string;
    email: string;
    fullName: string;
    department: string;
    role: UserRole;
    newPassword?: string;
  }): Promise<string | null> => {
    if (!currentUser) {
      return 'Authentication required.';
    }

    const isSelf = params.userId === currentUser.id;
    if (!isSelf && !isManager) {
      return 'You can only edit your own profile.';
    }

    const enforcedRole: UserRole = isSelf
      ? currentUser.role
      : isSuperAdmin
      ? params.role
      : 'employee';

    const supabase = getSupabaseClient();
    if (!supabase || isDemoSession) {
      const updatedProfiles = profiles.map((p) =>
        p.id === params.userId
          ? {
              ...p,
              email: params.email.trim(),
              full_name: params.fullName.trim(),
              department: params.department.trim() || 'General',
              role: enforcedRole,
            }
          : p
      );
      setProfiles(updatedProfiles);
      localStorage.setItem(
        DEMO_PROFILES_STORAGE_KEY,
        JSON.stringify(updatedProfiles)
      );
      if (isSelf) {
        const updatedSelf: Profile = {
          ...currentUser,
          email: params.email.trim(),
          full_name: params.fullName.trim(),
          department: params.department.trim() || 'General',
          role: enforcedRole,
        };
        setCurrentUser(updatedSelf);
        localStorage.setItem(DEMO_ACTIVE_USER_KEY, JSON.stringify(updatedSelf));
      }
      return null;
    }

    const { error } = await supabase.rpc('update_user_account', {
      p_user_id: params.userId,
      p_full_name: params.fullName.trim(),
      p_email: params.email.trim(),
      p_department: params.department.trim() || 'General',
      p_role: enforcedRole,
      p_new_password: params.newPassword || null,
    });

    if (error) return error.message;

    const updatedCurrentUser: Profile = isSelf
      ? {
          ...currentUser,
          email: params.email.trim(),
          full_name: params.fullName.trim(),
          department: params.department.trim() || 'General',
          role: enforcedRole,
        }
      : currentUser;

    if (isSelf) {
      setCurrentUser(updatedCurrentUser);
    }

    await fetchSupabaseData(updatedCurrentUser);
    return null;
  };

  const handleLogout = async () => {
    localStorage.removeItem(DEMO_ACTIVE_USER_KEY);
    const supabase = getSupabaseClient();
    if (supabase && !isDemoSession) {
      await supabase.auth.signOut();
    }
    setCurrentUser(null);
    setSelectedTaskId(null);
  };

  // Helper to insert activity notifications for target recipient(s)
  const createActivityNotifications = async (params: {
    recipientIds: string[];
    taskId?: string | null;
    type: NotificationType;
    title: string;
    message: string;
  }) => {
    if (!currentUser) return;
    const uniqueRecipients = Array.from(new Set(params.recipientIds)).filter(
      (id) => Boolean(id) && id !== currentUser.id
    );
    if (uniqueRecipients.length === 0) return;

    const supabase = getSupabaseClient();
    if (supabase && !isDemoSession) {
      const rows = uniqueRecipients.map((recipientId) => ({
        recipient_id: recipientId,
        actor_id: currentUser.id,
        actor_name: `${currentUser.full_name} (${currentUser.role.toUpperCase()})`,
        task_id: params.taskId || null,
        type: params.type,
        title: params.title,
        message: params.message,
      }));
      await supabase.from('notifications').insert(rows);
    }
  };

  const handleMarkNotificationRead = async (notifId: string) => {
    if (!currentUser) return;
    setNotifications((prev) =>
      prev.map((n) => (n.id === notifId ? { ...n, is_read: true } : n))
    );
    const supabase = getSupabaseClient();
    if (supabase && !isDemoSession) {
      await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', notifId);
    }
  };

  const handleMarkAllNotificationsRead = async () => {
    if (!currentUser) return;
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    const supabase = getSupabaseClient();
    if (supabase && !isDemoSession) {
      await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('recipient_id', currentUser.id)
        .eq('is_read', false);
    }
  };

  const getManagerRecipientIds = () =>
    profiles
      .filter(
        (p) =>
          p.role === 'manager' ||
          p.role === 'admin' ||
          p.role === 'superadmin'
      )
      .map((p) => p.id);

  // CRUD Operations for Tasks
  const handleSaveTask = async (taskData: {
    id?: string;
    employee_id: string;
    title: string;
    description: string;
    category: string;
    status: TaskStatus;
    priority: TaskPriority;
    task_date: string;
    due_date: string | null;
    hours_spent: number;
    manager_feedback?: string | null;
  }) => {
    if (!currentUser) return;

    // Enforce employee isolation: employees can only save tasks for themselves
    const enforcedEmployeeId = isManager ? taskData.employee_id : currentUser.id;

    const supabase = getSupabaseClient();
    if (supabase && !isDemoSession) {
      if (taskData.id) {
        const { error } = await supabase
          .from('tasks')
          .update({
            employee_id: enforcedEmployeeId,
            title: taskData.title,
            description: taskData.description,
            category: taskData.category,
            status: taskData.status,
            priority: taskData.priority,
            task_date: taskData.task_date,
            due_date: taskData.due_date,
            hours_spent: taskData.hours_spent,
            manager_feedback: taskData.manager_feedback,
          })
          .eq('id', taskData.id);
        if (error) {
          alert(`Failed to update task: ${error.message}`);
          return;
        }
        await createActivityNotifications({
          recipientIds: [enforcedEmployeeId, ...getManagerRecipientIds()],
          taskId: taskData.id,
          type: 'activity',
          title: 'Task Updated',
          message: `${currentUser.full_name} updated task "${taskData.title}".`,
        });
      } else {
        const { data: insertedTask, error } = await supabase
          .from('tasks')
          .insert({
            employee_id: enforcedEmployeeId,
            created_by: currentUser.id,
            title: taskData.title,
            description: taskData.description,
            category: taskData.category,
            status: taskData.status,
            priority: taskData.priority,
            task_date: taskData.task_date,
            due_date: taskData.due_date,
            hours_spent: taskData.hours_spent,
            manager_feedback: taskData.manager_feedback,
          })
          .select('id')
          .single();
        if (error) {
          alert(`Failed to log task: ${error.message}`);
          return;
        }
        if (enforcedEmployeeId !== currentUser.id) {
          await createActivityNotifications({
            recipientIds: [enforcedEmployeeId],
            taskId: insertedTask?.id,
            type: 'task_assigned',
            title: 'New Task Assigned to You',
            message: `${currentUser.full_name} assigned you "${taskData.title}" (${PRIORITY_CONFIG[taskData.priority].label} priority).`,
          });
        } else {
          await createActivityNotifications({
            recipientIds: getManagerRecipientIds(),
            taskId: insertedTask?.id,
            type: 'task_logged',
            title: 'New Task Logged',
            message: `${currentUser.full_name} logged "${taskData.title}" (${taskData.hours_spent}h).`,
          });
        }
      }
      await fetchSupabaseData(currentUser);
      return;
    }

    // Demo Mode persistence
    const nowIso = new Date().toISOString();
    let updated: TaskItem[];
    if (taskData.id) {
      updated = tasks.map((t) =>
        t.id === taskData.id
          ? {
              ...t,
              employee_id: enforcedEmployeeId,
              title: taskData.title,
              description: taskData.description,
              category: taskData.category,
              status: taskData.status,
              priority: taskData.priority,
              task_date: taskData.task_date,
              due_date: taskData.due_date,
              hours_spent: taskData.hours_spent,
              manager_feedback: taskData.manager_feedback,
              updated_at: nowIso,
            }
          : t
      );
    } else {
      const newTask: TaskItem = {
        id: `tsk-${Date.now()}`,
        employee_id: enforcedEmployeeId,
        created_by: currentUser.id,
        title: taskData.title,
        description: taskData.description,
        category: taskData.category,
        status: taskData.status,
        priority: taskData.priority,
        task_date: taskData.task_date,
        due_date: taskData.due_date,
        hours_spent: taskData.hours_spent,
        manager_feedback: taskData.manager_feedback || null,
        created_at: nowIso,
        updated_at: nowIso,
      };
      updated = [newTask, ...tasks];
    }
    setTasks(updated);
    localStorage.setItem(DEMO_TASKS_STORAGE_KEY, JSON.stringify(updated));
  };

  const handleStatusChange = async (taskId: string, status: TaskStatus) => {
    if (!currentUser) return;
    const targetTask = tasks.find((t) => t.id === taskId);
    const supabase = getSupabaseClient();
    if (supabase && !isDemoSession) {
      await supabase.from('tasks').update({ status }).eq('id', taskId);
      if (targetTask) {
        await createActivityNotifications({
          recipientIds: [targetTask.employee_id, ...getManagerRecipientIds()],
          taskId,
          type: 'status_changed',
          title: `Task Status: ${STATUS_CONFIG[status].label}`,
          message: `${currentUser.full_name} changed "${targetTask.title}" status to ${STATUS_CONFIG[status].label}.`,
        });
      }
      await fetchSupabaseData(currentUser);
      return;
    }
    const updated = tasks.map((t) =>
      t.id === taskId ? { ...t, status, updated_at: new Date().toISOString() } : t
    );
    setTasks(updated);
    localStorage.setItem(DEMO_TASKS_STORAGE_KEY, JSON.stringify(updated));
  };

  const handleUpdateFeedback = async (taskId: string, feedback: string) => {
    if (!currentUser || !isManager) return;
    const targetTask = tasks.find((t) => t.id === taskId);
    const supabase = getSupabaseClient();
    if (supabase && !isDemoSession) {
      await supabase
        .from('tasks')
        .update({ manager_feedback: feedback || null })
        .eq('id', taskId);
      if (targetTask && feedback) {
        await createActivityNotifications({
          recipientIds: [targetTask.employee_id, ...getManagerRecipientIds()],
          taskId,
          type: 'feedback_added',
          title: 'Manager Feedback Added',
          message: `${currentUser.full_name} added feedback on "${targetTask.title}": "${feedback}"`,
        });
      }
      await fetchSupabaseData(currentUser);
      return;
    }
    const updated = tasks.map((t) =>
      t.id === taskId
        ? {
            ...t,
            manager_feedback: feedback || null,
            updated_at: new Date().toISOString(),
          }
        : t
    );
    setTasks(updated);
    localStorage.setItem(DEMO_TASKS_STORAGE_KEY, JSON.stringify(updated));
  };

  // SOFT DELETE ONLY: Records who deleted the task and when without removing the row from the database
  const handleDeleteTask = async (taskId: string) => {
    if (!currentUser) return;
    const targetTask = tasks.find((t) => t.id === taskId);
    const deletedAtIso = new Date().toISOString();
    const deletedByName = `${currentUser.full_name} (${currentUser.role.toUpperCase()})`;

    const supabase = getSupabaseClient();
    if (supabase && !isDemoSession) {
      const { error } = await supabase
        .from('tasks')
        .update({
          is_deleted: true,
          deleted_at: deletedAtIso,
          deleted_by: currentUser.id,
          deleted_by_name: deletedByName,
        })
        .eq('id', taskId);
      if (error) {
        alert(`Failed to soft-delete task: ${error.message}`);
        return;
      }
      if (targetTask) {
        await createActivityNotifications({
          recipientIds: [targetTask.employee_id, ...getManagerRecipientIds()],
          taskId,
          type: 'task_deleted',
          title: 'Task Soft-Deleted',
          message: `${deletedByName} soft-deleted task "${targetTask.title}".`,
        });
      }
      await fetchSupabaseData(currentUser);
      return;
    }

    const updated = tasks.map((t) =>
      t.id === taskId
        ? {
            ...t,
            is_deleted: true,
            deleted_at: deletedAtIso,
            deleted_by: currentUser.id,
            deleted_by_name: deletedByName,
            updated_at: deletedAtIso,
          }
        : t
    );
    setTasks(updated);
    localStorage.setItem(DEMO_TASKS_STORAGE_KEY, JSON.stringify(updated));
  };

  // Restore a soft-deleted task back to active
  const handleRestoreTask = async (taskId: string) => {
    if (!currentUser) return;
    const targetTask = tasks.find((t) => t.id === taskId);
    const nowIso = new Date().toISOString();

    const supabase = getSupabaseClient();
    if (supabase && !isDemoSession) {
      const { error } = await supabase
        .from('tasks')
        .update({
          is_deleted: false,
          deleted_at: null,
          deleted_by: null,
          deleted_by_name: null,
        })
        .eq('id', taskId);
      if (error) {
        alert(`Failed to restore task: ${error.message}`);
        return;
      }
      if (targetTask) {
        await createActivityNotifications({
          recipientIds: [targetTask.employee_id, ...getManagerRecipientIds()],
          taskId,
          type: 'task_restored',
          title: 'Task Restored',
          message: `${currentUser.full_name} restored task "${targetTask.title}".`,
        });
      }
      await fetchSupabaseData(currentUser);
      return;
    }

    const updated = tasks.map((t) =>
      t.id === taskId
        ? {
            ...t,
            is_deleted: false,
            deleted_at: null,
            deleted_by: null,
            deleted_by_name: null,
            updated_at: nowIso,
          }
        : t
    );
    setTasks(updated);
    localStorage.setItem(DEMO_TASKS_STORAGE_KEY, JSON.stringify(updated));
  };

  // PERMANENT DELETE: Strictly restricted to Superadmin only
  const handlePermanentDeleteTask = async (taskId: string) => {
    if (!currentUser || currentUser.role !== 'superadmin') return;

    const supabase = getSupabaseClient();
    if (supabase && !isDemoSession) {
      const { error } = await supabase.from('tasks').delete().eq('id', taskId);
      if (error) {
        alert(`Failed to permanently delete task: ${error.message}`);
        return;
      }
      await fetchSupabaseData(currentUser);
      return;
    }

    const updated = tasks.filter((t) => t.id !== taskId);
    setTasks(updated);
    localStorage.setItem(DEMO_TASKS_STORAGE_KEY, JSON.stringify(updated));
  };

  const handleAddComment = async (taskId: string, content: string) => {
    if (!currentUser) return;
    const targetTask = tasks.find((t) => t.id === taskId);
    const supabase = getSupabaseClient();
    if (supabase && !isDemoSession) {
      await supabase.from('task_comments').insert({
        task_id: taskId,
        author_id: currentUser.id,
        author_name: currentUser.full_name,
        author_role: currentUser.role,
        content,
      });
      if (targetTask) {
        await createActivityNotifications({
          recipientIds: [targetTask.employee_id, ...getManagerRecipientIds()],
          taskId,
          type: 'comment_added',
          title: 'New Comment on Task',
          message: `${currentUser.full_name} commented on "${targetTask.title}": "${content}"`,
        });
      }
      await fetchSupabaseData(currentUser);
      return;
    }
    const newComment: TaskComment = {
      id: `cmt-${Date.now()}`,
      task_id: taskId,
      author_id: currentUser.id,
      author_name: currentUser.full_name,
      author_role: currentUser.role,
      content,
      created_at: new Date().toISOString(),
    };
    const updated = [...comments, newComment];
    setComments(updated);
    localStorage.setItem(DEMO_COMMENTS_STORAGE_KEY, JSON.stringify(updated));
  };

  const handleRoleUpdate = async (profileId: string, newRole: UserRole) => {
    if (!currentUser || !isManager) return;
    const supabase = getSupabaseClient();
    if (supabase && !isDemoSession) {
      await supabase.from('profiles').update({ role: newRole }).eq('id', profileId);
      await fetchSupabaseData(currentUser);
      return;
    }
    const updated = profiles.map((p) =>
      p.id === profileId ? { ...p, role: newRole } : p
    );
    setProfiles(updated);
    localStorage.setItem(DEMO_PROFILES_STORAGE_KEY, JSON.stringify(updated));
  };

  // Lookup map for profiles
  const profilesMap = useMemo(() => {
    const map: Record<string, Profile> = {};
    for (const p of profiles) {
      map[p.id] = p;
    }
    if (currentUser && !map[currentUser.id]) {
      map[currentUser.id] = currentUser;
    }
    return map;
  }, [profiles, currentUser]);

  // Visible User Accounts for Directory & Editing:
  // * Superadmin can view and edit all user accounts (except superadmin).
  // * Manager / Admin can ONLY view and edit Employee accounts (role === 'employee').
  const visibleManagedProfiles = useMemo(() => {
    if (!currentUser || !isManager) return [];
    if (isSuperAdmin) {
      return profiles.filter((p) => p.role !== 'superadmin');
    }
    return profiles.filter((p) => p.role === 'employee');
  }, [profiles, currentUser, isManager, isSuperAdmin]);

  // CORE REQUIREMENT:
  // Employee can ONLY view their own tasks.
  // Manager/Admin can view ALL employees' tasks.
  const accessibleTasks = useMemo(() => {
    if (!currentUser) return [];
    if (isManager) {
      return tasks;
    }
    return tasks.filter((t) => t.employee_id === currentUser.id);
  }, [tasks, currentUser, isManager]);

  const activeAccessibleTasks = useMemo(
    () => accessibleTasks.filter((t) => !t.is_deleted),
    [accessibleTasks]
  );

  const deletedAccessibleTasks = useMemo(
    () => accessibleTasks.filter((t) => Boolean(t.is_deleted)),
    [accessibleTasks]
  );

  // Helper to check if a task matches the currently selected date filter
  const matchesSelectedDate = useCallback(
    (taskDate: string) => {
      const today = new Date().toISOString().split('T')[0];
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const weekAgoStr = sevenDaysAgo.toISOString().split('T')[0];

      if (selectedDateFilter === 'today' && taskDate !== today) {
        return false;
      }
      if (selectedDateFilter === 'week' && taskDate < weekAgoStr) {
        return false;
      }
      if (
        selectedDateFilter === 'custom' &&
        customDate &&
        taskDate !== customDate
      ) {
        return false;
      }
      return true;
    },
    [selectedDateFilter, customDate]
  );

  // Filtered tasks based on UI controls
  const filteredTasks = useMemo(() => {
    const sourceList =
      viewMode === 'deleted' ? deletedAccessibleTasks : activeAccessibleTasks;

    return sourceList.filter((task) => {
      if (
        isManager &&
        selectedEmployeeId !== 'all' &&
        task.employee_id !== selectedEmployeeId
      ) {
        return false;
      }
      if (selectedStatus !== 'all' && task.status !== selectedStatus) {
        return false;
      }
      if (selectedPriority !== 'all' && task.priority !== selectedPriority) {
        return false;
      }
      if (!matchesSelectedDate(task.task_date)) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const empName =
          profilesMap[task.employee_id]?.full_name.toLowerCase() || '';
        const deletedBy = (task.deleted_by_name || '').toLowerCase();
        const matchTitle = task.title.toLowerCase().includes(q);
        const matchDesc = task.description.toLowerCase().includes(q);
        const matchCat = task.category.toLowerCase().includes(q);
        const matchEmp = empName.includes(q);
        const matchDel = deletedBy.includes(q);
        if (!matchTitle && !matchDesc && !matchCat && !matchEmp && !matchDel)
          return false;
      }
      return true;
    });
  }, [
    viewMode,
    activeAccessibleTasks,
    deletedAccessibleTasks,
    isManager,
    selectedEmployeeId,
    selectedStatus,
    selectedPriority,
    matchesSelectedDate,
    searchQuery,
    profilesMap,
  ]);

  // Summary KPIs based on active accessible tasks & selected date (and selected employee)
  const kpiStats = useMemo(() => {
    const kpiSourceTasks = activeAccessibleTasks.filter((t) => {
      if (
        isManager &&
        selectedEmployeeId !== 'all' &&
        t.employee_id !== selectedEmployeeId
      ) {
        return false;
      }
      return matchesSelectedDate(t.task_date);
    });

    const total = kpiSourceTasks.length;
    const completed = kpiSourceTasks.filter(
      (t) => t.status === 'completed'
    ).length;
    const inProgress = kpiSourceTasks.filter(
      (t) => t.status === 'in_progress' || t.status === 'review'
    ).length;
    const blocked = kpiSourceTasks.filter(
      (t) => t.status === 'blocked'
    ).length;
    const totalHours = kpiSourceTasks.reduce(
      (acc, t) => acc + (Number(t.hours_spent) || 0),
      0
    );
    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

    return {
      total,
      completed,
      inProgress,
      blocked,
      totalHours,
      completionRate,
    };
  }, [activeAccessibleTasks, isManager, selectedEmployeeId, matchesSelectedDate]);

  // CSV Export for Managers/Employees
  const handleExportCsv = () => {
    const headers = [
      'Task Date',
      'Employee Name',
      'Department',
      'Task Title',
      'Category',
      'Status',
      'Priority',
      'Hours Spent',
      'Due Date',
      'Manager Feedback',
    ];
    const rows = filteredTasks.map((t) => {
      const emp = profilesMap[t.employee_id];
      return [
        t.task_date,
        `"${(emp?.full_name || 'Employee').replace(/"/g, '""')}"`,
        `"${(emp?.department || 'General').replace(/"/g, '""')}"`,
        `"${t.title.replace(/"/g, '""')}"`,
        `"${t.category}"`,
        t.status,
        t.priority,
        t.hours_spent,
        t.due_date || '',
        `"${(t.manager_feedback || '').replace(/"/g, '""')}"`,
      ].join(',');
    });

    const csvContent = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `employee-tasks-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const activeTask = useMemo(
    () => accessibleTasks.find((t) => t.id === selectedTaskId) || null,
    [accessibleTasks, selectedTaskId]
  );

  if (authChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900 text-white">
        <div className="flex items-center gap-3">
          <RefreshCw className="w-5 h-5 animate-spin text-indigo-400" />
          <span className="text-sm font-medium">Loading workspace...</span>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return <AuthScreen onSupabaseSignIn={handleSupabaseSignIn} />;
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Top Navigation Header */}
      <header className="sticky top-0 z-30 bg-white border-b border-slate-200 shadow-2xs">
        <div className="w-full max-w-[1800px] mx-auto px-4 sm:px-6 lg:px-10 h-16 flex items-center justify-between gap-4">
          {/* Brand Logo & Role Badge */}
          <div className="flex items-center gap-3.5">
            <img
              src={logoImg}
              alt="Company Logo"
              className="h-10 sm:h-11 w-auto object-contain shrink-0"
            />
            <div>
              <div className="flex items-center gap-2">
                <span
                  className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wide ${
                    isSuperAdmin
                      ? 'bg-purple-100 text-purple-800 border border-purple-200'
                      : isManager
                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                      : 'bg-indigo-100 text-indigo-800 border border-indigo-200'
                  }`}
                >
                  {isSuperAdmin
                    ? 'Superadmin Portal'
                    : isManager
                    ? `${currentUser.role} Monitor`
                    : 'Employee Portal'}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 hidden sm:block mt-0.5">
                {isManager
                  ? 'Viewing all employees’ logged tasks & performance across the organization'
                  : 'Private workspace — You can only view and manage your own tasks'}
              </p>
            </div>
          </div>

          {/* Right Controls: User Profile, Notification Bell, Edit Own Profile & Logout */}
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="flex items-center gap-2.5">
              <div className="text-right hidden sm:block">
                <div className="text-xs font-bold text-slate-900">
                  {currentUser.full_name}
                </div>
                <div className="text-[11px] text-slate-500">
                  {currentUser.department}
                </div>
              </div>

              {/* Notification Bell Dropdown */}
              <div className="relative">
                {(() => {
                  const unreadCount = notifications.filter(
                    (n) => !n.is_read
                  ).length;
                  return (
                    <>
                      <button
                        type="button"
                        onClick={() => setIsNotifOpen((prev) => !prev)}
                        title="Notifications & Activity"
                        className="relative p-2 rounded-xl border border-slate-200 text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 hover:border-indigo-200 transition cursor-pointer"
                      >
                        <Bell className="w-4 h-4" />
                        {unreadCount > 0 && (
                          <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 rounded-full bg-rose-600 text-white text-[10px] font-bold flex items-center justify-center shadow-xs">
                            {unreadCount > 9 ? '9+' : unreadCount}
                          </span>
                        )}
                      </button>

                      {isNotifOpen && (
                        <>
                          <div
                            className="fixed inset-0 z-40"
                            onClick={() => setIsNotifOpen(false)}
                          />
                          <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-2xl border border-slate-200 shadow-2xl z-50 overflow-hidden">
                            <div className="px-4 py-3 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <Bell className="w-4 h-4 text-indigo-600" />
                                <span className="text-xs font-bold text-slate-900">
                                  Notifications & Activity
                                </span>
                                {unreadCount > 0 && (
                                  <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 text-[10px] font-bold">
                                    {unreadCount} new
                                  </span>
                                )}
                              </div>
                              {unreadCount > 0 && (
                                <button
                                  type="button"
                                  onClick={handleMarkAllNotificationsRead}
                                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 cursor-pointer"
                                >
                                  <CheckCheck className="w-3.5 h-3.5" />
                                  <span>Mark all read</span>
                                </button>
                              )}
                            </div>

                            <div className="max-h-96 overflow-y-auto divide-y divide-slate-100">
                              {notifications.length === 0 ? (
                                <div className="p-8 text-center space-y-2">
                                  <div className="w-10 h-10 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                                    <Bell className="w-5 h-5" />
                                  </div>
                                  <div className="text-xs font-bold text-slate-700">
                                    No notifications yet
                                  </div>
                                  <p className="text-[11px] text-slate-400">
                                    Assigned tasks, comments, status changes, and feedback will appear here.
                                  </p>
                                </div>
                              ) : (
                                notifications.map((notif) => {
                                  const badgeStyle =
                                    notif.type === 'task_assigned'
                                      ? 'bg-purple-100 text-purple-700'
                                      : notif.type === 'feedback_added'
                                      ? 'bg-emerald-100 text-emerald-700'
                                      : notif.type === 'comment_added'
                                      ? 'bg-indigo-100 text-indigo-700'
                                      : notif.type === 'task_deleted'
                                      ? 'bg-rose-100 text-rose-700'
                                      : 'bg-blue-100 text-blue-700';

                                  return (
                                    <div
                                      key={notif.id}
                                      onClick={() => {
                                        handleMarkNotificationRead(notif.id);
                                        setIsNotifOpen(false);
                                        if (notif.task_id) {
                                          const matchingTask = tasks.find(
                                            (t) => t.id === notif.task_id
                                          );
                                          if (matchingTask) {
                                            if (matchingTask.is_deleted) {
                                              setViewMode('deleted');
                                            }
                                            setSelectedTaskId(matchingTask.id);
                                          }
                                        }
                                      }}
                                      className={`p-3.5 hover:bg-slate-50 transition cursor-pointer flex items-start gap-3 ${
                                        !notif.is_read ? 'bg-indigo-50/40' : ''
                                      }`}
                                    >
                                      <div
                                        className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${badgeStyle}`}
                                      >
                                        {notif.type === 'task_assigned' ? (
                                          <UserCheck className="w-4 h-4" />
                                        ) : notif.type === 'comment_added' ? (
                                          <MessageSquare className="w-4 h-4" />
                                        ) : notif.type === 'feedback_added' ? (
                                          <CheckCircle2 className="w-4 h-4" />
                                        ) : notif.type === 'task_deleted' ? (
                                          <Trash2 className="w-4 h-4" />
                                        ) : (
                                          <Bell className="w-4 h-4" />
                                        )}
                                      </div>

                                      <div className="flex-1 min-w-0 space-y-0.5">
                                        <div className="flex items-center justify-between gap-2">
                                          <span className="text-xs font-bold text-slate-900 truncate">
                                            {notif.title}
                                          </span>
                                          {!notif.is_read && (
                                            <span className="w-2 h-2 rounded-full bg-indigo-600 shrink-0" />
                                          )}
                                        </div>
                                        <p className="text-xs text-slate-600 line-clamp-2 leading-snug">
                                          {notif.message}
                                        </p>
                                        <span className="text-[10px] text-slate-400 block pt-0.5">
                                          {new Date(
                                            notif.created_at
                                          ).toLocaleString([], {
                                            month: 'short',
                                            day: 'numeric',
                                            hour: '2-digit',
                                            minute: '2-digit',
                                          })}
                                        </span>
                                      </div>
                                    </div>
                                  );
                                })
                              )}
                            </div>
                          </div>
                        </>
                      )}
                    </>
                  );
                })()}
              </div>

              <button
                onClick={() => {
                  setEditingProfile(currentUser);
                  setIsAddEmployeeModalOpen(true);
                }}
                title="Edit My Profile & Password"
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:text-indigo-600 hover:bg-indigo-50 hover:border-indigo-200 transition cursor-pointer"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Edit Profile</span>
              </button>
              <button
                onClick={handleLogout}
                title="Sign Out"
                className="p-2 rounded-xl border border-slate-200 text-slate-600 hover:text-rose-600 hover:bg-rose-50 hover:border-rose-200 transition cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Container */}
      <main className="w-full max-w-[1800px] mx-auto px-4 sm:px-6 lg:px-10 py-6 space-y-6 flex-1">
        {/* Role Access Banner + Primary CTA */}
        <div
          className={`p-4 sm:p-5 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
            isManager
              ? 'bg-gradient-to-r from-emerald-900 to-teal-900 text-white border-emerald-800'
              : 'bg-gradient-to-r from-indigo-900 to-slate-900 text-white border-indigo-800'
          }`}
        >
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-emerald-300">
              <Shield className="w-4 h-4" />
              {isManager
                ? 'Manager / Admin Monitoring Mode (All Employees Visible)'
                : 'Employee Task Logger (Strict Personal Task Visibility)'}
            </div>
            <h1 className="text-xl sm:text-2xl font-bold">
              Welcome back, {currentUser.full_name}
            </h1>
            <p className="text-xs sm:text-sm text-slate-200">
              {isManager
                ? `Monitoring ${accessibleTasks.length} logged tasks across ${
                    profiles.filter((p) => p.role === 'employee').length
                  } employees.`
                : `You have ${accessibleTasks.length} logged tasks under your profile. Other employees' tasks are hidden.`}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <button
              onClick={handleExportCsv}
              className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs sm:text-sm font-medium border border-white/15 transition cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>Export CSV</span>
            </button>

            {isManager && (
              <button
                onClick={() => {
                  setEditingProfile(null);
                  setIsAddEmployeeModalOpen(true);
                }}
                className={`inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold shadow-md transition cursor-pointer ${
                  isSuperAdmin
                    ? 'bg-purple-400 hover:bg-purple-300 text-slate-950'
                    : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950'
                }`}
              >
                <UserPlus className="w-4 h-4" />
                <span>
                  {isSuperAdmin ? 'Setup Manager / Admin' : 'Add Employee'}
                </span>
              </button>
            )}

            <button
              onClick={() => {
                setEditingTask(null);
                setIsTaskModalOpen(true);
              }}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white text-slate-900 hover:bg-indigo-50 text-xs sm:text-sm font-bold shadow-md transition cursor-pointer"
            >
              <Plus className="w-4 h-4 text-indigo-600" />
              <span>{isManager ? 'Assign / Log Task' : 'Log New Task'}</span>
            </button>
          </div>
        </div>

        {/* KPI Summary Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-2xs flex items-center justify-between">
            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                {isManager ? 'Total Team Tasks' : 'My Logged Tasks'}
              </span>
              <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-1">
                {kpiStats.total}
              </div>
              <span className="text-xs text-slate-500 mt-1 block">
                {kpiStats.inProgress} active / in review
              </span>
            </div>
            <div className="w-11 h-11 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <LayoutList className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-2xs flex items-center justify-between">
            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Completed Tasks
              </span>
              <div className="text-2xl sm:text-3xl font-extrabold text-emerald-600 mt-1">
                {kpiStats.completed}
              </div>
              <span className="text-xs text-emerald-700 font-medium mt-1 block">
                {kpiStats.completionRate}% completion rate
              </span>
            </div>
            <div className="w-11 h-11 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-2xs flex items-center justify-between">
            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Hours Logged
              </span>
              <div className="text-2xl sm:text-3xl font-extrabold text-blue-600 mt-1">
                {kpiStats.totalHours.toFixed(1)}h
              </div>
              <span className="text-xs text-slate-500 mt-1 block">
                Cumulative logged time
              </span>
            </div>
            <div className="w-11 h-11 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Clock className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-2xs flex items-center justify-between">
            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Blocked / Attention
              </span>
              <div className="text-2xl sm:text-3xl font-extrabold text-rose-600 mt-1">
                {kpiStats.blocked}
              </div>
              <span className="text-xs text-slate-500 mt-1 block">
                Requires manager review
              </span>
            </div>
            <div className="w-11 h-11 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5" />
            </div>
          </div>
        </div>

        {/* View Tabs + Filter Bar */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs p-4 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
            {/* View Mode Switcher */}
            <div className="flex flex-wrap items-center gap-1.5 bg-slate-100 p-1 rounded-xl w-fit">
              <button
                onClick={() => setViewMode('list')}
                className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                  viewMode === 'list'
                    ? 'bg-white text-slate-900 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <LayoutList className="w-3.5 h-3.5" />
                Task Log List ({kpiStats.total})
              </button>
              <button
                onClick={() => setViewMode('kanban')}
                className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                  viewMode === 'kanban'
                    ? 'bg-white text-slate-900 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Kanban className="w-3.5 h-3.5" />
                Status Board
              </button>
              <button
                onClick={() => setViewMode('deleted')}
                className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                  viewMode === 'deleted'
                    ? 'bg-rose-600 text-white shadow-2xs'
                    : 'text-rose-700 hover:bg-rose-50'
                }`}
              >
                <Trash2 className="w-3.5 h-3.5" />
                Deleted Tasks (
                {
                  deletedAccessibleTasks.filter((t) =>
                    matchesSelectedDate(t.task_date)
                  ).length
                }
                )
              </button>
              {isManager && (
                <button
                  onClick={() => setViewMode('employees')}
                  className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                    viewMode === 'employees'
                      ? 'bg-white text-slate-900 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Users className="w-3.5 h-3.5" />
                  {isSuperAdmin ? 'Users Monitor' : 'Employees Monitor'} ({visibleManagedProfiles.length})
                </button>
              )}
            </div>

            {/* Active Employee Filter Pill for Manager */}
            {isManager && selectedEmployeeId !== 'all' && (
              <div className="flex items-center gap-2 text-xs bg-indigo-50 text-indigo-800 px-3 py-1.5 rounded-xl border border-indigo-200">
                <span>
                  Filtered Employee:{' '}
                  <strong>{profilesMap[selectedEmployeeId]?.full_name}</strong>
                </span>
                <button
                  onClick={() => setSelectedEmployeeId('all')}
                  className="text-indigo-600 hover:text-indigo-900 font-bold underline cursor-pointer"
                >
                  Show All
                </button>
              </div>
            )}
          </div>

          {/* Filter Controls */}
          {viewMode !== 'employees' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
              {/* Search */}
              <div className="relative lg:col-span-2">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-2.5" />
                <input
                  type="text"
                  placeholder={
                    isManager
                      ? 'Search task title, notes, category, or employee name...'
                      : 'Search your logged tasks...'
                  }
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* Employee Selector (Manager Only) */}
              {isManager && (
                <div>
                  <select
                    aria-label="Filter by Employee"
                    value={selectedEmployeeId}
                    onChange={(e) => setSelectedEmployeeId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs sm:text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="all">
                      {isSuperAdmin ? 'All Users' : 'All Employees'} ({visibleManagedProfiles.length})
                    </option>
                    {visibleManagedProfiles.map((emp) => (
                      <option key={emp.id} value={emp.id}>
                        {emp.full_name} ({emp.department})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Status Filter */}
              <div>
                <select
                  aria-label="Filter by Status"
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs sm:text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="all">All Statuses</option>
                  <option value="todo">To Do</option>
                  <option value="in_progress">In Progress</option>
                  <option value="review">For Review</option>
                  <option value="completed">Completed</option>
                  <option value="blocked">Blocked</option>
                </select>
              </div>

              {/* Priority & Date Filter */}
              <div className="flex gap-2">
                <select
                  aria-label="Filter by Priority"
                  value={selectedPriority}
                  onChange={(e) => setSelectedPriority(e.target.value)}
                  className="w-1/2 px-2.5 py-2 rounded-xl border border-slate-200 text-xs sm:text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="all">All Priorities</option>
                  <option value="urgent">Urgent</option>
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>

                <select
                  aria-label="Filter by Date"
                  value={selectedDateFilter}
                  onChange={(e) => setSelectedDateFilter(e.target.value)}
                  className="w-1/2 px-2.5 py-2 rounded-xl border border-slate-200 text-xs sm:text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="all">All Dates</option>
                  <option value="today">Today</option>
                  <option value="week">Last 7 Days</option>
                  <option value="custom">Pick Date...</option>
                </select>
              </div>
            </div>
          )}

          {selectedDateFilter === 'custom' && viewMode !== 'employees' && (
            <div className="flex items-center gap-2 pt-1">
              <Filter className="w-3.5 h-3.5 text-slate-400" />
              <span className="text-xs font-medium text-slate-600">
                Select Task Log Date:
              </span>
              <input
                type="date"
                value={customDate}
                onChange={(e) => setCustomDate(e.target.value)}
                className="px-3 py-1 rounded-lg border border-slate-300 text-xs"
              />
            </div>
          )}
        </div>

        {/* VIEW 1: TASK LIST VIEW & DELETED TASKS AUDIT VIEW */}
        {(viewMode === 'list' || viewMode === 'deleted') && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
            {viewMode === 'deleted' && (
              <div className="bg-rose-50/80 border-b border-rose-200 px-5 py-3 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-xs text-rose-800">
                  <Trash2 className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>
                    <strong>Soft-Deleted Task Logs (Audit Trail):</strong> Tasks shown here are soft-deleted and retained in the database with the name of the user who deleted them.
                  </span>
                </div>
              </div>
            )}

            {loadingData ? (
              <div className="p-12 text-center text-slate-500 text-sm">
                Loading tasks...
              </div>
            ) : filteredTasks.length === 0 ? (
              <div className="p-12 text-center space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                  {viewMode === 'deleted' ? (
                    <Trash2 className="w-6 h-6" />
                  ) : (
                    <LayoutList className="w-6 h-6" />
                  )}
                </div>
                <div className="text-base font-bold text-slate-800">
                  {viewMode === 'deleted'
                    ? 'No soft-deleted tasks found'
                    : 'No matching tasks found'}
                </div>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  {viewMode === 'deleted'
                    ? 'When an employee, manager, or admin deletes a task log, it is soft-deleted and appears here with the name of the person who deleted it.'
                    : isManager
                    ? 'Try clearing your employee or status filters, or assign a new task to an employee.'
                    : 'You haven’t logged any tasks matching this filter yet. Click "Log New Task" above to record your daily work.'}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50/80 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                      <th className="py-3.5 px-4">Task Details</th>
                      {isManager && <th className="py-3.5 px-4">Employee</th>}
                      <th className="py-3.5 px-4">Status</th>
                      <th className="py-3.5 px-4">Priority</th>
                      <th className="py-3.5 px-4">Date & Hours</th>
                      <th className="py-3.5 px-4">
                        {viewMode === 'deleted' ? 'Deleted By (Audit)' : 'Feedback / Activity'}
                      </th>
                      <th className="py-3.5 px-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 text-sm">
                    {filteredTasks.map((task) => {
                      const emp = profilesMap[task.employee_id];
                      const taskCommentsCount = comments.filter(
                        (c) => c.task_id === task.id
                      ).length;
                      const assignedByManager =
                        task.created_by !== task.employee_id;

                      return (
                        <tr
                          key={task.id}
                          onClick={() => setSelectedTaskId(task.id)}
                          className={`hover:bg-slate-50/90 transition cursor-pointer group ${
                            task.is_deleted ? 'bg-rose-50/20' : ''
                          }`}
                        >
                          <td className="py-4 px-5 max-w-2xl">
                            <div className="flex flex-wrap items-center gap-2 mb-1">
                              <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 text-[11px] font-medium">
                                {task.category}
                              </span>
                              {assignedByManager && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 border border-purple-200 text-[10px] font-semibold">
                                  <UserCheck className="w-3 h-3" /> Assigned by Manager
                                </span>
                              )}
                              {task.is_deleted && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-rose-100 text-rose-800 border border-rose-200 text-[10px] font-bold">
                                  <Trash2 className="w-3 h-3" /> Soft Deleted by {task.deleted_by_name || 'User'}
                                </span>
                              )}
                            </div>
                            <div
                              className={`font-bold transition line-clamp-1 ${
                                task.is_deleted
                                  ? 'line-through text-slate-500 group-hover:text-rose-700'
                                  : 'text-slate-900 group-hover:text-indigo-600'
                              }`}
                            >
                              {task.title}
                            </div>
                            {task.description && (
                              <p className="text-xs text-slate-500 line-clamp-1 mt-0.5">
                                {task.description}
                              </p>
                            )}
                          </td>

                          {isManager && (
                            <td className="py-4 px-4 whitespace-nowrap">
                              <div className="font-semibold text-slate-900 text-xs">
                                {emp?.full_name || 'Employee'}
                              </div>
                              <div className="text-[11px] text-slate-500">
                                {emp?.department || 'General'}
                              </div>
                            </td>
                          )}

                          <td
                            className="py-4 px-4 whitespace-nowrap"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <select
                              aria-label="Update Task Status"
                              disabled={Boolean(task.is_deleted)}
                              value={task.status}
                              onChange={(e) =>
                                handleStatusChange(
                                  task.id,
                                  e.target.value as TaskStatus
                                )
                              }
                              className={`px-2.5 py-1 rounded-full text-xs font-semibold border cursor-pointer focus:outline-none disabled:opacity-60 disabled:cursor-not-allowed ${
                                STATUS_CONFIG[task.status].badgeClass
                              }`}
                            >
                              <option value="todo">To Do</option>
                              <option value="in_progress">In Progress</option>
                              <option value="review">For Review</option>
                              <option value="completed">Completed</option>
                              <option value="blocked">Blocked</option>
                            </select>
                          </td>

                          <td className="py-4 px-4 whitespace-nowrap">
                            <span
                              className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${
                                PRIORITY_CONFIG[task.priority].badgeClass
                              }`}
                            >
                              {PRIORITY_CONFIG[task.priority].label}
                            </span>
                          </td>

                          <td className="py-4 px-4 whitespace-nowrap text-xs">
                            <div className="flex items-center gap-1 font-medium text-slate-800">
                              <Calendar className="w-3.5 h-3.5 text-slate-400" />
                              {task.task_date}
                            </div>
                            <div className="flex items-center gap-1 text-indigo-600 font-semibold mt-0.5">
                              <Clock className="w-3.5 h-3.5" />
                              {Number(task.hours_spent).toFixed(2)} hrs
                            </div>
                          </td>

                          <td className="py-4 px-4 max-w-md">
                            {task.is_deleted ? (
                              <div className="space-y-0.5">
                                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-rose-50 text-rose-700 border border-rose-200 text-xs font-bold">
                                  <Trash2 className="w-3 h-3 shrink-0" />
                                  <span>Deleted by: {task.deleted_by_name || 'Unknown User'}</span>
                                </div>
                                {task.deleted_at && (
                                  <div className="text-[11px] text-slate-500 pl-1">
                                    {new Date(task.deleted_at).toLocaleString()}
                                  </div>
                                )}
                              </div>
                            ) : (
                              <div className="flex items-center gap-2">
                                {task.manager_feedback ? (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-medium truncate max-w-[340px]">
                                    <CheckCircle2 className="w-3 h-3 shrink-0" />
                                    {task.manager_feedback}
                                  </span>
                                ) : (
                                  <span className="text-[11px] text-slate-400">
                                    No feedback
                                  </span>
                                )}

                                {taskCommentsCount > 0 && (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[11px] font-semibold">
                                    <MessageSquare className="w-3 h-3" />
                                    {taskCommentsCount}
                                  </span>
                                )}
                              </div>
                            )}
                          </td>

                          <td
                            className="py-4 px-4 text-right whitespace-nowrap"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <div className="inline-flex items-center justify-end gap-2">
                              {task.is_deleted ? (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => handleRestoreTask(task.id)}
                                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 text-xs font-semibold transition cursor-pointer"
                                    title="Restore soft-deleted task"
                                  >
                                    <RotateCcw className="w-3.5 h-3.5" />
                                    <span>Restore</span>
                                  </button>
                                  {isSuperAdmin && (
                                    <button
                                      type="button"
                                      onClick={() =>
                                        setTaskPendingPermanentDelete(task)
                                      }
                                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold shadow-2xs transition cursor-pointer"
                                      title="Delete Permanently (Superadmin Only)"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                      <span>Delete Permanently</span>
                                    </button>
                                  )}
                                </>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => setTaskPendingDelete(task)}
                                  className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-200 text-xs font-semibold transition cursor-pointer"
                                  title="Soft Delete Task"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                  <span>Delete</span>
                                </button>
                              )}

                              <button
                                type="button"
                                onClick={() => setSelectedTaskId(task.id)}
                                className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-800 cursor-pointer"
                              >
                                <span>Inspect</span>
                                <ChevronRight className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* VIEW 2: KANBAN BOARD VIEW */}
        {viewMode === 'kanban' && (
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {(Object.keys(STATUS_CONFIG) as TaskStatus[]).map((statusKey) => {
              const columnTasks = filteredTasks.filter(
                (t) => t.status === statusKey
              );
              const cfg = STATUS_CONFIG[statusKey];

              return (
                <div
                  key={statusKey}
                  className="bg-slate-100/80 rounded-2xl p-3 border border-slate-200/80 flex flex-col gap-3 min-h-[420px]"
                >
                  <div className="flex items-center justify-between px-1">
                    <div className="flex items-center gap-2">
                      <span className={`w-2.5 h-2.5 rounded-full ${cfg.dotClass}`} />
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
                        {cfg.label}
                      </span>
                    </div>
                    <span className="px-2 py-0.5 rounded-full bg-white text-slate-700 text-xs font-bold border border-slate-200">
                      {columnTasks.length}
                    </span>
                  </div>

                  <div className="space-y-2.5 flex-1">
                    {columnTasks.map((task) => {
                      const emp = profilesMap[task.employee_id];
                      return (
                        <div
                          key={task.id}
                          onClick={() => setSelectedTaskId(task.id)}
                          className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs hover:shadow-md hover:border-indigo-300 transition cursor-pointer space-y-2.5"
                        >
                          <div className="flex items-center justify-between gap-1">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${
                                PRIORITY_CONFIG[task.priority].badgeClass
                              }`}
                            >
                              {PRIORITY_CONFIG[task.priority].label}
                            </span>
                            <span className="text-[11px] text-slate-400 font-medium">
                              {task.task_date}
                            </span>
                          </div>

                          <h4 className="text-xs font-bold text-slate-900 leading-snug line-clamp-2">
                            {task.title}
                          </h4>

                          {isManager && (
                            <div className="flex items-center gap-1.5 pt-1 border-t border-slate-100">
                              <div className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 text-[10px] font-bold flex items-center justify-center">
                                {(emp?.full_name || 'E')[0]}
                              </div>
                              <span className="text-[11px] font-semibold text-slate-700 truncate">
                                {emp?.full_name || 'Employee'}
                              </span>
                            </div>
                          )}

                          <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
                            <span className="font-semibold text-indigo-600">
                              {Number(task.hours_spent).toFixed(1)}h logged
                            </span>
                            <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 text-[10px]">
                              {task.category}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* VIEW 3: MANAGER EMPLOYEE DIRECTORY & MONITORING */}
        {viewMode === 'employees' && isManager && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {visibleManagedProfiles.map((prof) => {
              const empTasks = tasks.filter(
                (t) =>
                  t.employee_id === prof.id &&
                  !t.is_deleted &&
                  matchesSelectedDate(t.task_date)
              );
              const completedCount = empTasks.filter(
                (t) => t.status === 'completed'
              ).length;
              const inProgressCount = empTasks.filter(
                (t) => t.status === 'in_progress' || t.status === 'review'
              ).length;
              const blockedCount = empTasks.filter(
                (t) => t.status === 'blocked'
              ).length;
              const hoursSum = empTasks.reduce(
                (acc, t) => acc + (Number(t.hours_spent) || 0),
                0
              );
              const rate =
                empTasks.length > 0
                  ? Math.round((completedCount / empTasks.length) * 100)
                  : 0;

              return (
                <div
                  key={prof.id}
                  className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs flex flex-col justify-between space-y-4"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-3">
                        <div className="w-11 h-11 rounded-2xl bg-indigo-600 text-white font-bold text-base flex items-center justify-center">
                          {prof.full_name
                            .split(' ')
                            .map((n) => n[0])
                            .join('')
                            .slice(0, 2)}
                        </div>
                        <div>
                          <h3 className="font-bold text-slate-900 text-sm">
                            {prof.full_name}
                          </h3>
                          <p className="text-xs text-slate-500">{prof.email}</p>
                          <span className="inline-block mt-1 px-2 py-0.5 rounded bg-slate-100 text-slate-600 text-[11px] font-medium">
                            {prof.department}
                          </span>
                        </div>
                      </div>

                      <span
                        className={`px-2.5 py-1 rounded-full border text-[11px] font-bold uppercase ${
                          prof.role === 'superadmin'
                            ? 'bg-purple-50 text-purple-700 border-purple-200'
                            : prof.role === 'manager' || prof.role === 'admin'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : 'bg-indigo-50 text-indigo-700 border-indigo-200'
                        }`}
                      >
                        {prof.role}
                      </span>
                    </div>

                    {/* Progress bar */}
                    <div className="space-y-1 pt-2">
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-500 font-medium">
                          Task Completion Rate
                        </span>
                        <span className="font-bold text-slate-800">{rate}%</span>
                      </div>
                      <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                        <div
                          className="h-full bg-emerald-500 rounded-full transition-all"
                          style={{ width: `${rate}%` }}
                        />
                      </div>
                    </div>

                    {/* Mini stats */}
                    <div className="grid grid-cols-4 gap-2 pt-2 text-center">
                      <div className="p-2 rounded-xl bg-slate-50 border border-slate-100">
                        <div className="text-sm font-bold text-slate-900">
                          {empTasks.length}
                        </div>
                        <div className="text-[10px] text-slate-500">Total</div>
                      </div>
                      <div className="p-2 rounded-xl bg-blue-50/60 border border-blue-100">
                        <div className="text-sm font-bold text-blue-700">
                          {inProgressCount}
                        </div>
                        <div className="text-[10px] text-blue-600">Active</div>
                      </div>
                      <div className="p-2 rounded-xl bg-rose-50/60 border border-rose-100">
                        <div className="text-sm font-bold text-rose-700">
                          {blockedCount}
                        </div>
                        <div className="text-[10px] text-rose-600">Blocked</div>
                      </div>
                      <div className="p-2 rounded-xl bg-indigo-50/60 border border-indigo-100">
                        <div className="text-sm font-bold text-indigo-700">
                          {hoursSum.toFixed(1)}h
                        </div>
                        <div className="text-[10px] text-indigo-600">Hours</div>
                      </div>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                    <button
                      onClick={() => {
                        setSelectedEmployeeId(prof.id);
                        setViewMode('list');
                      }}
                      className="flex-1 py-2 px-3 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-semibold transition cursor-pointer"
                    >
                      Inspect Tasks ({empTasks.length})
                    </button>
                    <button
                      onClick={() => {
                        setEditingProfile(prof);
                        setIsAddEmployeeModalOpen(true);
                      }}
                      className="inline-flex items-center gap-1.5 py-2 px-3 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold transition cursor-pointer"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>Edit Account</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Modals & Drawers */}
      <TaskFormModal
        isOpen={isTaskModalOpen}
        onClose={() => {
          setIsTaskModalOpen(false);
          setEditingTask(null);
        }}
        currentUser={currentUser}
        employees={visibleManagedProfiles}
        initialTask={editingTask}
        onSave={handleSaveTask}
      />

      <TaskDetailDrawer
        task={activeTask}
        onClose={() => setSelectedTaskId(null)}
        currentUser={currentUser}
        profilesMap={profilesMap}
        comments={comments}
        onStatusChange={handleStatusChange}
        onUpdateFeedback={handleUpdateFeedback}
        onAddComment={handleAddComment}
        onEditTask={(taskToEdit) => {
          setSelectedTaskId(null);
          setEditingTask(taskToEdit);
          setIsTaskModalOpen(true);
        }}
        onDeleteTask={async (taskId) => {
          const found = tasks.find((t) => t.id === taskId);
          if (found) {
            setTaskPendingDelete(found);
          }
        }}
        onRestoreTask={handleRestoreTask}
        onPermanentDeleteTask={(taskId) => {
          const found = tasks.find((t) => t.id === taskId);
          if (found) {
            setTaskPendingPermanentDelete(found);
          }
        }}
      />

      {/* Confirm Permanent Delete Modal Dialog (Superadmin Only) */}
      {taskPendingPermanentDelete && isSuperAdmin && (
        <div
          className="fixed inset-0 z-[75] flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4"
          onClick={() => {
            if (!deletingTask) setTaskPendingPermanentDelete(null);
          }}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl border border-rose-200 w-full max-w-md overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 space-y-4">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-2xl bg-rose-600 text-white flex items-center justify-center shrink-0">
                  <Trash2 className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-purple-100 text-purple-800 text-[10px] font-bold uppercase">
                    Superadmin Exclusive Action
                  </div>
                  <h3 className="text-base font-bold text-slate-900">
                    Delete Task Permanently
                  </h3>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Are you sure you want to <strong className="text-rose-700">permanently delete</strong> this task from the database? This action cannot be undone.
                  </p>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="px-2 py-0.5 rounded bg-slate-200/70 text-slate-700 text-[10px] font-semibold">
                    {taskPendingPermanentDelete.category}
                  </span>
                  <span className="text-[11px] text-slate-500 font-medium">
                    {taskPendingPermanentDelete.task_date} •{' '}
                    {Number(taskPendingPermanentDelete.hours_spent).toFixed(2)} hrs
                  </span>
                </div>
                <div className="text-sm font-bold text-slate-900 line-clamp-2">
                  {taskPendingPermanentDelete.title}
                </div>
                {taskPendingPermanentDelete.deleted_by_name && (
                  <div className="text-[11px] text-rose-600 font-medium pt-0.5">
                    Previously soft-deleted by: {taskPendingPermanentDelete.deleted_by_name}
                  </div>
                )}
              </div>
            </div>

            <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2.5">
              <button
                type="button"
                disabled={deletingTask}
                onClick={() => setTaskPendingPermanentDelete(null)}
                className="px-4 py-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold transition cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deletingTask}
                onClick={async () => {
                  setDeletingTask(true);
                  try {
                    await handlePermanentDeleteTask(taskPendingPermanentDelete.id);
                    if (selectedTaskId === taskPendingPermanentDelete.id) {
                      setSelectedTaskId(null);
                    }
                    setTaskPendingPermanentDelete(null);
                  } finally {
                    setDeletingTask(false);
                  }
                }}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold shadow-sm transition cursor-pointer disabled:opacity-60"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>
                  {deletingTask ? 'Deleting Permanently...' : 'Confirm Permanent Delete'}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Soft Delete Modal Dialog */}
      {taskPendingDelete && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4"
          onClick={() => {
            if (!deletingTask) setTaskPendingDelete(null);
          }}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 space-y-4">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                  <Trash2 className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-base font-bold text-slate-900">
                    Confirm Soft Delete Task
                  </h3>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Are you sure you want to soft-delete this task log? It will remain stored in the database under{' '}
                    <strong className="text-slate-700">Deleted Tasks</strong> for audit review.
                  </p>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="px-2 py-0.5 rounded bg-slate-200/70 text-slate-700 text-[10px] font-semibold">
                    {taskPendingDelete.category}
                  </span>
                  <span className="text-[11px] text-slate-500 font-medium">
                    {taskPendingDelete.task_date} • {Number(taskPendingDelete.hours_spent).toFixed(2)} hrs
                  </span>
                </div>
                <div className="text-sm font-bold text-slate-900 line-clamp-2">
                  {taskPendingDelete.title}
                </div>
              </div>

              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>
                  Deleted by will be recorded as:{' '}
                  <strong>
                    {currentUser.full_name} ({currentUser.role.toUpperCase()})
                  </strong>
                </span>
              </div>
            </div>

            <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2.5">
              <button
                type="button"
                disabled={deletingTask}
                onClick={() => setTaskPendingDelete(null)}
                className="px-4 py-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold transition cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deletingTask}
                onClick={async () => {
                  setDeletingTask(true);
                  try {
                    await handleDeleteTask(taskPendingDelete.id);
                    if (selectedTaskId === taskPendingDelete.id) {
                      setSelectedTaskId(null);
                    }
                    setTaskPendingDelete(null);
                  } finally {
                    setDeletingTask(false);
                  }
                }}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold shadow-sm transition cursor-pointer disabled:opacity-60"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{deletingTask ? 'Soft Deleting...' : 'Confirm Soft Delete'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      <AddEmployeeModal
        isOpen={isAddEmployeeModalOpen}
        onClose={() => {
          setIsAddEmployeeModalOpen(false);
          setEditingProfile(null);
        }}
        currentUserId={currentUser.id}
        currentUserRole={currentUser.role}
        editingProfile={editingProfile}
        onCreateEmployee={handleCreateEmployee}
        onUpdateEmployee={handleUpdateEmployee}
      />
    </div>
  );
}
export default App;

