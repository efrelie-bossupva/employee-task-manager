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
  LayoutGrid,
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
  FolderKanban,
  Building2,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  X,
  Play,
  Pause,
  Timer,
} from 'lucide-react';
import {
  AppNotification,
  DepartmentItem,
  NotificationType,
  Profile,
  ProjectItem,
  ProjectMember,
  ProjectStatus,
  TaskComment,
  TaskItem,
  TaskPriority,
  TaskStatus,
  UserRole,
  STATUS_CONFIG,
  PRIORITY_CONFIG,
  TASK_CATEGORIES,
} from './types';
import { getSupabaseClient, getSupabaseConfig } from './lib/supabase';
import {
  computePauseTimerState,
  computeResumeTimerState,
  computeTimerStateForStatusChange,
  formatTimerDuration,
  getTaskBaseSeconds,
  getTaskElapsedSeconds,
  secondsToHours,
} from './lib/timerUtils';
import {
  DEMO_PROFILES,
  INITIAL_DEMO_COMMENTS,
  INITIAL_DEMO_DEPARTMENTS,
  INITIAL_DEMO_PROJECTS,
  INITIAL_DEMO_TASKS,
} from './lib/mockData';
import { AuthScreen } from './components/AuthScreen';
import { TaskFormModal } from './components/TaskFormModal';
import { TaskDetailDrawer } from './components/TaskDetailDrawer';
import { AddEmployeeModal } from './components/AddEmployeeModal';
import { DepartmentsPage } from './components/DepartmentsPage';
import { ProjectsPage } from './components/ProjectsPage';
import { FloatingTimerWidget } from './components/FloatingTimerWidget';
import logoImg from './img/logo.png';

const DEMO_TASKS_STORAGE_KEY = 'etm_demo_tasks_v1';
const DEMO_COMMENTS_STORAGE_KEY = 'etm_demo_comments_v1';
const DEMO_PROFILES_STORAGE_KEY = 'etm_demo_profiles_v1';
const DEMO_DEPARTMENTS_STORAGE_KEY = 'etm_demo_departments_v1';
const DEMO_PROJECTS_STORAGE_KEY = 'etm_demo_projects_v1';
const DEMO_PROJECT_MEMBERS_STORAGE_KEY = 'etm_demo_project_members_v1';
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
  const [departments, setDepartments] = useState<DepartmentItem[]>(
    INITIAL_DEMO_DEPARTMENTS
  );
  const [projects, setProjects] = useState<ProjectItem[]>(INITIAL_DEMO_PROJECTS);
  const [projectMembers, setProjectMembers] = useState<ProjectMember[]>([]);
  const [loadingData, setLoadingData] = useState<boolean>(false);

  // UI & Filter state
  const [viewMode, setViewMode] = useState<
    'list' | 'kanban' | 'deleted' | 'employees' | 'departments' | 'projects'
  >('kanban');
  const [isNotifOpen, setIsNotifOpen] = useState<boolean>(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [employeeSearchQuery, setEmployeeSearchQuery] = useState('');
  const [employeeViewLayout, setEmployeeViewLayout] = useState<'grid' | 'list'>('grid');
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('all');
  const [selectedProject, setSelectedProject] = useState<string>('all');
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
  const [nowMs, setNowMs] = useState<number>(() => Date.now());
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const [dragOverStatus, setDragOverStatus] = useState<TaskStatus | null>(null);
  const [pipWindow, setPipWindow] = useState<Window | null>(null);
  const [focusedTimerTaskId, setFocusedTimerTaskId] = useState<string | null>(null);

  const openFloatingTimerPip = useCallback(async () => {
    if (pipWindow && !pipWindow.closed) {
      pipWindow.focus();
      return;
    }
    try {
      if (window.documentPictureInPicture) {
        const win = await window.documentPictureInPicture.requestWindow({
          width: 340,
          height: 176,
        });
        win.addEventListener('pagehide', () => {
          setPipWindow(null);
        });
        setPipWindow(win);
        return;
      }
      // Fallback for browsers without Document PiP (Firefox / Safari)
      const popup = window.open(
        '',
        'etm_floating_timer',
        'popup=yes,width=340,height=176,resizable=yes'
      );
      if (popup) {
        popup.addEventListener('beforeunload', () => {
          setPipWindow(null);
        });
        setPipWindow(popup);
      }
    } catch {
      // Ignore if browser requires a direct click gesture; user can click "Float on Desktop"
    }
  }, [pipWindow]);

  const closeFloatingTimerPip = useCallback(() => {
    if (pipWindow && !pipWindow.closed) {
      pipWindow.close();
    }
    setPipWindow(null);
  }, [pipWindow]);

  const isSuperAdmin = currentUser?.role === 'superadmin';
  const isManager =
    currentUser?.role === 'manager' || currentUser?.role === 'superadmin';

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

      const savedDepts = localStorage.getItem(DEMO_DEPARTMENTS_STORAGE_KEY);
      const parsedDepts: DepartmentItem[] = savedDepts
        ? JSON.parse(savedDepts)
        : INITIAL_DEMO_DEPARTMENTS;
      setDepartments(parsedDepts);

      const savedProjects = localStorage.getItem(DEMO_PROJECTS_STORAGE_KEY);
      const parsedProjects: ProjectItem[] = savedProjects
        ? JSON.parse(savedProjects)
        : INITIAL_DEMO_PROJECTS;
      setProjects(parsedProjects);

      const savedMembers = localStorage.getItem(DEMO_PROJECT_MEMBERS_STORAGE_KEY);
      const parsedMembers: ProjectMember[] = savedMembers
        ? JSON.parse(savedMembers)
        : [];
      setProjectMembers(parsedMembers);
    } catch {
      setProfiles(DEMO_PROFILES);
      setTasks(INITIAL_DEMO_TASKS);
      setComments(INITIAL_DEMO_COMMENTS);
      setDepartments(INITIAL_DEMO_DEPARTMENTS);
      setProjects(INITIAL_DEMO_PROJECTS);
      setProjectMembers([]);
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
        { data: deptData },
        { data: projData },
        { data: memberData },
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
        supabase.from('departments').select('*').order('name'),
        supabase.from('projects').select('*').order('name'),
        supabase.from('project_members').select('*'),
      ]);

      if (profData && profData.length > 0) {
        setProfiles(profData as Profile[]);
      } else {
        setProfiles([activeProfile]);
      }
      if (taskData) setTasks(taskData as TaskItem[]);
      if (cmtData) setComments(cmtData as TaskComment[]);
      if (notifData) setNotifications(notifData as AppNotification[]);
      if (deptData) setDepartments(deptData as DepartmentItem[]);
      if (projData) setProjects(projData as ProjectItem[]);
      if (memberData) setProjectMembers(memberData as ProjectMember[]);
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

  // Reset employee filter only when the signed-in user or role changes
  useEffect(() => {
    if (currentUser?.role === 'employee') {
      setSelectedEmployeeId(currentUser.id);
    } else {
      setSelectedEmployeeId('all');
    }
  }, [currentUser?.id, currentUser?.role]);

  // Redirect employees away from manager-only pages
  useEffect(() => {
    if (
      currentUser?.role === 'employee' &&
      (viewMode === 'employees' ||
        viewMode === 'departments' ||
        viewMode === 'projects')
    ) {
      setViewMode('list');
    }
  }, [currentUser?.role, viewMode]);

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

  // Manager / Superadmin: Create New Employee Account without logging out
  const handleCreateEmployee = async (params: {
    email: string;
    password: string;
    fullName: string;
    role: UserRole;
    department: string;
    assignedProjectIds?: string[];
  }): Promise<string | null> => {
    if (!currentUser || !isManager) {
      return 'Only managers or superadmins can add employee accounts.';
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
      if (params.assignedProjectIds && params.assignedProjectIds.length > 0) {
        const nowIso = new Date().toISOString();
        const addedMembers: ProjectMember[] = params.assignedProjectIds.map(
          (projectId) => ({
            id: `pm-${Date.now()}-${projectId}`,
            project_id: projectId,
            employee_id: newProfile.id,
            assigned_by: currentUser.id,
            created_at: nowIso,
          })
        );
        const updatedMembers = [...projectMembers, ...addedMembers];
        setProjectMembers(updatedMembers);
        localStorage.setItem(
          DEMO_PROJECT_MEMBERS_STORAGE_KEY,
          JSON.stringify(updatedMembers)
        );
      }
      return null;
    }

    const { data: newUserId, error } = await supabase.rpc(
      'create_employee_account',
      {
        p_email: params.email.trim(),
        p_password: params.password,
        p_full_name: params.fullName.trim(),
        p_department: params.department.trim() || 'General',
        p_role: params.role,
      }
    );

    if (error) return error.message;
    if (
      newUserId &&
      params.assignedProjectIds &&
      params.assignedProjectIds.length > 0
    ) {
      await supabase.from('project_members').insert(
        params.assignedProjectIds.map((projectId) => ({
          project_id: projectId,
          employee_id: newUserId,
          assigned_by: currentUser.id,
        }))
      );
    }
    await fetchSupabaseData(currentUser);
    return null;
  };

  // Self-Edit (any user) OR Superadmin (all users) OR Manager (employees only): Update User Account
  const handleUpdateEmployee = async (params: {
    userId: string;
    email: string;
    fullName: string;
    department: string;
    role: UserRole;
    newPassword?: string;
    assignedProjectIds?: string[];
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

    const cleanDepartment = isManager
      ? params.department.trim() || 'General'
      : currentUser.department || 'General';
    const previousDepartment = profiles.find(
      (p) => p.id === params.userId
    )?.department;

    const supabase = getSupabaseClient();
    if (!supabase || isDemoSession) {
      const updatedProfiles = profiles.map((p) =>
        p.id === params.userId
          ? {
              ...p,
              email: params.email.trim(),
              full_name: params.fullName.trim(),
              department: cleanDepartment,
              role: enforcedRole,
            }
          : p
      );
      setProfiles(updatedProfiles);
      localStorage.setItem(
        DEMO_PROFILES_STORAGE_KEY,
        JSON.stringify(updatedProfiles)
      );
      if (previousDepartment && previousDepartment !== cleanDepartment) {
        const updatedTasks = tasks.map((t) =>
          t.employee_id === params.userId
            ? { ...t, category: cleanDepartment }
            : t
        );
        setTasks(updatedTasks);
        localStorage.setItem(
          DEMO_TASKS_STORAGE_KEY,
          JSON.stringify(updatedTasks)
        );
      }
      if (isManager && !isSelf && params.assignedProjectIds) {
        const nowIso = new Date().toISOString();
        const kept = projectMembers.filter(
          (m) => m.employee_id !== params.userId
        );
        const added: ProjectMember[] = params.assignedProjectIds.map(
          (projectId) => ({
            id: `pm-${Date.now()}-${projectId}`,
            project_id: projectId,
            employee_id: params.userId,
            assigned_by: currentUser.id,
            created_at: nowIso,
          })
        );
        const updatedMembers = [...kept, ...added];
        setProjectMembers(updatedMembers);
        localStorage.setItem(
          DEMO_PROJECT_MEMBERS_STORAGE_KEY,
          JSON.stringify(updatedMembers)
        );
      }
      if (isSelf) {
        const updatedSelf: Profile = {
          ...currentUser,
          email: params.email.trim(),
          full_name: params.fullName.trim(),
          department: cleanDepartment,
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
      p_department: cleanDepartment,
      p_role: enforcedRole,
      p_new_password: params.newPassword || null,
    });

    if (error) return error.message;

    if (previousDepartment && previousDepartment !== cleanDepartment) {
      await supabase
        .from('tasks')
        .update({ category: cleanDepartment })
        .eq('employee_id', params.userId);
    }

    if (isManager && !isSelf && params.assignedProjectIds) {
      const currentForEmp = projectMembers.filter(
        (m) => m.employee_id === params.userId
      );
      const currentSet = new Set(currentForEmp.map((m) => m.project_id));
      const desiredSet = new Set(params.assignedProjectIds);
      const toAdd = params.assignedProjectIds.filter(
        (pid) => !currentSet.has(pid)
      );
      const toRemove = currentForEmp
        .filter((m) => !desiredSet.has(m.project_id))
        .map((m) => m.project_id);

      if (toAdd.length > 0) {
        await supabase.from('project_members').insert(
          toAdd.map((projectId) => ({
            project_id: projectId,
            employee_id: params.userId,
            assigned_by: currentUser.id,
          }))
        );
        const addedNames = toAdd
          .map((pid) => projects.find((p) => p.id === pid)?.name)
          .filter(Boolean)
          .join(', ');
        if (addedNames) {
          await createActivityNotifications({
            recipientIds: [params.userId],
            type: 'activity',
            title: 'Assigned to Project',
            message: `${currentUser.full_name} assigned you to: ${addedNames}.`,
          });
        }
      }

      if (toRemove.length > 0) {
        await supabase
          .from('project_members')
          .delete()
          .eq('employee_id', params.userId)
          .in('project_id', toRemove);
      }
    }

    const updatedCurrentUser: Profile = isSelf
      ? {
          ...currentUser,
          email: params.email.trim(),
          full_name: params.fullName.trim(),
          department: cleanDepartment,
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
    closeFloatingTimerPip();
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
      .filter((p) => p.role === 'manager' || p.role === 'superadmin')
      .map((p) => p.id);

  // CRUD Operations for Tasks
  const handleSaveTask = async (taskData: {
    id?: string;
    employee_id: string;
    title: string;
    description: string;
    project_name: string | null;
    category: string;
    status: TaskStatus;
    priority: TaskPriority;
    task_date: string;
    due_date: string | null;
    completed_date: string | null;
    hours_spent: number;
    manual_hours_override?: boolean;
    manager_feedback?: string | null;
  }) => {
    if (!currentUser) return;

    // Enforce employee isolation: employees can only save tasks for themselves and their own department
    const enforcedEmployeeId = isManager ? taskData.employee_id : currentUser.id;
    const enforcedCategory = isManager
      ? taskData.category
      : currentUser.department || 'General';
    const normalizedCompletedDate =
      taskData.completed_date ||
      (taskData.status === 'completed'
        ? new Date().toISOString().split('T')[0]
        : null);

    const nowIso = new Date().toISOString();
    const existingTask = taskData.id
      ? tasks.find((t) => t.id === taskData.id) || null
      : null;

    // Auto-open floating desktop timer synchronously within user gesture when starting In Progress
    if (
      taskData.status === 'in_progress' &&
      (!existingTask || existingTask.status !== 'in_progress')
    ) {
      if (taskData.id) setFocusedTimerTaskId(taskData.id);
      if (!pipWindow || pipWindow.closed) {
        void openFloatingTimerPip();
      }
    }

    // Compute automated timer fields
    let timerFields =
      existingTask && existingTask.status === taskData.status
        ? {
            timer_started_at: existingTask.timer_started_at ?? null,
            timer_accumulated_seconds: getTaskBaseSeconds(existingTask),
            is_timer_running: Boolean(existingTask.is_timer_running),
            hours_spent: existingTask.hours_spent,
          }
        : computeTimerStateForStatusChange(existingTask, taskData.status, nowIso);

    if (isManager && taskData.manual_hours_override) {
      const overriddenSeconds = Math.max(
        0,
        Math.round((Number(taskData.hours_spent) || 0) * 3600)
      );
      timerFields = {
        ...timerFields,
        timer_accumulated_seconds: overriddenSeconds,
        timer_started_at: timerFields.is_timer_running ? nowIso : null,
        hours_spent: Math.max(0, Number(taskData.hours_spent) || 0),
      };
    }

    const supabase = getSupabaseClient();
    if (supabase && !isDemoSession) {
      if (taskData.id) {
        const { error } = await supabase
          .from('tasks')
          .update({
            employee_id: enforcedEmployeeId,
            title: taskData.title,
            description: taskData.description,
            project_name: taskData.project_name,
            category: enforcedCategory,
            status: taskData.status,
            priority: taskData.priority,
            task_date: taskData.task_date,
            due_date: taskData.due_date,
            completed_date: normalizedCompletedDate,
            hours_spent: timerFields.hours_spent,
            timer_started_at: timerFields.timer_started_at,
            timer_accumulated_seconds: timerFields.timer_accumulated_seconds,
            is_timer_running: timerFields.is_timer_running,
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
          message: `${currentUser.full_name} updated task "${taskData.title}"${
            taskData.project_name ? ` (Project: ${taskData.project_name})` : ''
          }.`,
        });
      } else {
        const { data: insertedTask, error } = await supabase
          .from('tasks')
          .insert({
            employee_id: enforcedEmployeeId,
            created_by: currentUser.id,
            title: taskData.title,
            description: taskData.description,
            project_name: taskData.project_name,
            category: enforcedCategory,
            status: taskData.status,
            priority: taskData.priority,
            task_date: taskData.task_date,
            due_date: taskData.due_date,
            completed_date: normalizedCompletedDate,
            hours_spent: timerFields.hours_spent,
            timer_started_at: timerFields.timer_started_at,
            timer_accumulated_seconds: timerFields.timer_accumulated_seconds,
            is_timer_running: timerFields.is_timer_running,
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
            message: `${currentUser.full_name} assigned you "${taskData.title}"${
              taskData.project_name ? ` on project "${taskData.project_name}"` : ''
            } (${PRIORITY_CONFIG[taskData.priority].label} priority).`,
          });
        } else {
          await createActivityNotifications({
            recipientIds: getManagerRecipientIds(),
            taskId: insertedTask?.id,
            type: 'task_logged',
            title: 'New Task Logged',
            message: `${currentUser.full_name} logged "${taskData.title}"${
              taskData.project_name ? ` (${taskData.project_name})` : ''
            } (${timerFields.hours_spent}h).`,
          });
        }
      }
      await fetchSupabaseData(currentUser);
      return;
    }

    // Demo Mode persistence
    let updated: TaskItem[];
    if (taskData.id) {
      updated = tasks.map((t) =>
        t.id === taskData.id
          ? {
              ...t,
              employee_id: enforcedEmployeeId,
              title: taskData.title,
              description: taskData.description,
              project_name: taskData.project_name,
              category: enforcedCategory,
              status: taskData.status,
              priority: taskData.priority,
              task_date: taskData.task_date,
              due_date: taskData.due_date,
              completed_date: normalizedCompletedDate,
              hours_spent: timerFields.hours_spent,
              timer_started_at: timerFields.timer_started_at,
              timer_accumulated_seconds: timerFields.timer_accumulated_seconds,
              is_timer_running: timerFields.is_timer_running,
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
        project_name: taskData.project_name,
        category: enforcedCategory,
        status: taskData.status,
        priority: taskData.priority,
        task_date: taskData.task_date,
        due_date: taskData.due_date,
        completed_date: normalizedCompletedDate,
        hours_spent: timerFields.hours_spent,
        timer_started_at: timerFields.timer_started_at,
        timer_accumulated_seconds: timerFields.timer_accumulated_seconds,
        is_timer_running: timerFields.is_timer_running,
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
    const targetTask = tasks.find((t) => t.id === taskId) || null;
    const nowIso = new Date().toISOString();

    // Auto-open floating desktop timer synchronously within user gesture when starting In Progress
    if (
      status === 'in_progress' &&
      targetTask &&
      targetTask.status !== 'in_progress'
    ) {
      setFocusedTimerTaskId(taskId);
      if (!pipWindow || pipWindow.closed) {
        void openFloatingTimerPip();
      }
    }
    const todayStr = nowIso.split('T')[0];
    const nextCompletedDate =
      status === 'completed'
        ? targetTask?.completed_date || todayStr
        : null;
    const timerFields = computeTimerStateForStatusChange(
      targetTask,
      status,
      nowIso
    );

    // Optimistic update so drag-and-drop & status changes feel instantaneous
    const optimisticUpdated = tasks.map((t) =>
      t.id === taskId
        ? {
            ...t,
            status,
            completed_date: nextCompletedDate,
            hours_spent: timerFields.hours_spent,
            timer_started_at: timerFields.timer_started_at,
            timer_accumulated_seconds: timerFields.timer_accumulated_seconds,
            is_timer_running: timerFields.is_timer_running,
            updated_at: nowIso,
          }
        : t
    );
    setTasks(optimisticUpdated);
    setNowMs(Date.now());

    const supabase = getSupabaseClient();
    if (supabase && !isDemoSession) {
      await supabase
        .from('tasks')
        .update({
          status,
          completed_date: nextCompletedDate,
          hours_spent: timerFields.hours_spent,
          timer_started_at: timerFields.timer_started_at,
          timer_accumulated_seconds: timerFields.timer_accumulated_seconds,
          is_timer_running: timerFields.is_timer_running,
        })
        .eq('id', taskId);
      if (targetTask) {
        const hoursNote =
          status === 'review' || status === 'completed'
            ? ` (${timerFields.hours_spent.toFixed(2)}h logged)`
            : '';
        await createActivityNotifications({
          recipientIds: [targetTask.employee_id, ...getManagerRecipientIds()],
          taskId,
          type: 'status_changed',
          title: `Task Status: ${STATUS_CONFIG[status].label}`,
          message: `${currentUser.full_name} changed "${targetTask.title}" status to ${STATUS_CONFIG[status].label}${hoursNote}.`,
        });
      }
      await fetchSupabaseData(currentUser);
      return;
    }
    localStorage.setItem(
      DEMO_TASKS_STORAGE_KEY,
      JSON.stringify(optimisticUpdated)
    );
  };

  const handleToggleTaskTimer = async (taskId: string) => {
    if (!currentUser) return;
    const targetTask = tasks.find((t) => t.id === taskId);
    if (!targetTask || targetTask.is_deleted || targetTask.status !== 'in_progress') {
      return;
    }

    const isResuming = !targetTask.is_timer_running;
    if (isResuming) {
      setFocusedTimerTaskId(taskId);
      if (!pipWindow || pipWindow.closed) {
        void openFloatingTimerPip();
      }
    }

    const nowIso = new Date().toISOString();
    const timerFields = targetTask.is_timer_running
      ? computePauseTimerState(targetTask, nowIso)
      : computeResumeTimerState(targetTask, nowIso);

    // Optimistic update for responsive timer controls
    const updated = tasks.map((t) =>
      t.id === taskId
        ? {
            ...t,
            hours_spent: timerFields.hours_spent,
            timer_started_at: timerFields.timer_started_at,
            timer_accumulated_seconds: timerFields.timer_accumulated_seconds,
            is_timer_running: timerFields.is_timer_running,
            updated_at: nowIso,
          }
        : t
    );
    setTasks(updated);
    setNowMs(Date.now());

    const supabase = getSupabaseClient();
    if (supabase && !isDemoSession) {
      const { error } = await supabase
        .from('tasks')
        .update({
          hours_spent: timerFields.hours_spent,
          timer_started_at: timerFields.timer_started_at,
          timer_accumulated_seconds: timerFields.timer_accumulated_seconds,
          is_timer_running: timerFields.is_timer_running,
        })
        .eq('id', taskId);
      if (error) {
        alert(`Failed to update task timer: ${error.message}`);
        await fetchSupabaseData(currentUser);
      }
      return;
    }

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
    const stoppedTimer =
      targetTask && targetTask.is_timer_running
        ? computePauseTimerState(targetTask, deletedAtIso)
        : null;

    const supabase = getSupabaseClient();
    if (supabase && !isDemoSession) {
      const { error } = await supabase
        .from('tasks')
        .update({
          is_deleted: true,
          deleted_at: deletedAtIso,
          deleted_by: currentUser.id,
          deleted_by_name: deletedByName,
          ...(stoppedTimer
            ? {
                hours_spent: stoppedTimer.hours_spent,
                timer_started_at: stoppedTimer.timer_started_at,
                timer_accumulated_seconds: stoppedTimer.timer_accumulated_seconds,
                is_timer_running: stoppedTimer.is_timer_running,
              }
            : {}),
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
            ...(stoppedTimer
              ? {
                  hours_spent: stoppedTimer.hours_spent,
                  timer_started_at: stoppedTimer.timer_started_at,
                  timer_accumulated_seconds: stoppedTimer.timer_accumulated_seconds,
                  is_timer_running: stoppedTimer.is_timer_running,
                }
              : {}),
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

  // Manager / Admin / Superadmin: Setup Departments & Projects
  const handleAddDepartment = async (name: string): Promise<string | null> => {
    if (!currentUser || !isManager) {
      return 'Only managers, admins, or superadmins can add departments.';
    }
    const cleaned = name.trim();
    if (!cleaned) return 'Department name cannot be empty.';
    if (
      departments.some((d) => d.name.toLowerCase() === cleaned.toLowerCase())
    ) {
      return `"${cleaned}" already exists.`;
    }

    const supabase = getSupabaseClient();
    if (supabase && !isDemoSession) {
      const { error } = await supabase.from('departments').insert({
        name: cleaned,
        created_by: currentUser.id,
      });
      if (error) return error.message;
      await fetchSupabaseData(currentUser);
      return null;
    }

    const newDept: DepartmentItem = {
      id: `dept-${Date.now()}`,
      name: cleaned,
      created_by: currentUser.id,
      created_at: new Date().toISOString(),
    };
    const updated = [...departments, newDept].sort((a, b) =>
      a.name.localeCompare(b.name)
    );
    setDepartments(updated);
    localStorage.setItem(DEMO_DEPARTMENTS_STORAGE_KEY, JSON.stringify(updated));
    return null;
  };

  const handleDeleteDepartment = async (id: string): Promise<string | null> => {
    if (!currentUser || !isManager) {
      return 'Only managers, admins, or superadmins can remove departments.';
    }
    const supabase = getSupabaseClient();
    if (supabase && !isDemoSession) {
      const { error } = await supabase.from('departments').delete().eq('id', id);
      if (error) return error.message;
      await fetchSupabaseData(currentUser);
      return null;
    }
    const updated = departments.filter((d) => d.id !== id);
    setDepartments(updated);
    localStorage.setItem(DEMO_DEPARTMENTS_STORAGE_KEY, JSON.stringify(updated));
    return null;
  };

  const handleUpdateDepartment = async (
    id: string,
    oldName: string,
    newName: string
  ): Promise<string | null> => {
    if (!currentUser || !isManager) {
      return 'Only managers, admins, or superadmins can edit departments.';
    }
    const cleaned = newName.trim();
    if (!cleaned) return 'Department name cannot be empty.';
    if (
      departments.some(
        (d) => d.id !== id && d.name.toLowerCase() === cleaned.toLowerCase()
      )
    ) {
      return `Department "${cleaned}" already exists.`;
    }

    const supabase = getSupabaseClient();
    if (supabase && !isDemoSession) {
      const { error } = await supabase
        .from('departments')
        .update({ name: cleaned })
        .eq('id', id);
      if (error) return error.message;
      // Sync existing tasks & profiles that used the old department name (case-insensitive)
      if (oldName !== cleaned) {
        await Promise.all([
          supabase
            .from('tasks')
            .update({ category: cleaned })
            .ilike('category', oldName),
          supabase
            .from('profiles')
            .update({ department: cleaned })
            .ilike('department', oldName),
        ]);
      }
      await fetchSupabaseData(currentUser);
      return null;
    }

    const updatedDepts = departments
      .map((d) => (d.id === id ? { ...d, name: cleaned } : d))
      .sort((a, b) => a.name.localeCompare(b.name));
    setDepartments(updatedDepts);
    localStorage.setItem(
      DEMO_DEPARTMENTS_STORAGE_KEY,
      JSON.stringify(updatedDepts)
    );
    if (oldName !== cleaned) {
      const updatedTasks = tasks.map((t) =>
        t.category === oldName ? { ...t, category: cleaned } : t
      );
      setTasks(updatedTasks);
      localStorage.setItem(DEMO_TASKS_STORAGE_KEY, JSON.stringify(updatedTasks));
      const updatedProfiles = profiles.map((p) =>
        p.department === oldName ? { ...p, department: cleaned } : p
      );
      setProfiles(updatedProfiles);
      localStorage.setItem(
        DEMO_PROFILES_STORAGE_KEY,
        JSON.stringify(updatedProfiles)
      );
    }
    return null;
  };

  const handleAddProject = async (params: {
    name: string;
    description?: string;
    status?: ProjectStatus;
  }): Promise<string | null> => {
    if (!currentUser || !isManager) {
      return 'Only managers, admins, or superadmins can add projects.';
    }
    const cleaned = params.name.trim();
    if (!cleaned) return 'Project name cannot be empty.';
    if (projects.some((p) => p.name.toLowerCase() === cleaned.toLowerCase())) {
      return `Project "${cleaned}" already exists.`;
    }

    const supabase = getSupabaseClient();
    if (supabase && !isDemoSession) {
      const { error } = await supabase.from('projects').insert({
        name: cleaned,
        description: params.description?.trim() || '',
        status: params.status || 'active',
        created_by: currentUser.id,
      });
      if (error) return error.message;
      await fetchSupabaseData(currentUser);
      return null;
    }

    const newProject: ProjectItem = {
      id: `proj-${Date.now()}`,
      name: cleaned,
      description: params.description?.trim() || '',
      status: params.status || 'active',
      created_by: currentUser.id,
      created_at: new Date().toISOString(),
    };
    const updated = [...projects, newProject].sort((a, b) =>
      a.name.localeCompare(b.name)
    );
    setProjects(updated);
    localStorage.setItem(DEMO_PROJECTS_STORAGE_KEY, JSON.stringify(updated));
    return null;
  };

  const handleUpdateProjectStatus = async (
    id: string,
    status: ProjectStatus
  ): Promise<string | null> => {
    if (!currentUser || !isManager) {
      return 'Only managers, admins, or superadmins can update projects.';
    }
    const supabase = getSupabaseClient();
    if (supabase && !isDemoSession) {
      const { error } = await supabase
        .from('projects')
        .update({ status })
        .eq('id', id);
      if (error) return error.message;
      await fetchSupabaseData(currentUser);
      return null;
    }
    const updated = projects.map((p) => (p.id === id ? { ...p, status } : p));
    setProjects(updated);
    localStorage.setItem(DEMO_PROJECTS_STORAGE_KEY, JSON.stringify(updated));
    return null;
  };

  const handleUpdateProject = async (params: {
    id: string;
    oldName: string;
    name: string;
    description: string;
    status: ProjectStatus;
  }): Promise<string | null> => {
    if (!currentUser || !isManager) {
      return 'Only managers, admins, or superadmins can edit projects.';
    }
    const cleaned = params.name.trim();
    if (!cleaned) return 'Project name cannot be empty.';
    if (
      projects.some(
        (p) =>
          p.id !== params.id && p.name.toLowerCase() === cleaned.toLowerCase()
      )
    ) {
      return `Project "${cleaned}" already exists.`;
    }

    const supabase = getSupabaseClient();
    if (supabase && !isDemoSession) {
      const { error } = await supabase
        .from('projects')
        .update({
          name: cleaned,
          description: params.description.trim(),
          status: params.status,
        })
        .eq('id', params.id);
      if (error) return error.message;
      if (params.oldName !== cleaned) {
        await supabase
          .from('tasks')
          .update({ project_name: cleaned })
          .eq('project_name', params.oldName);
      }
      await fetchSupabaseData(currentUser);
      return null;
    }

    const updatedProjects = projects
      .map((p) =>
        p.id === params.id
          ? {
              ...p,
              name: cleaned,
              description: params.description.trim(),
              status: params.status,
            }
          : p
      )
      .sort((a, b) => a.name.localeCompare(b.name));
    setProjects(updatedProjects);
    localStorage.setItem(
      DEMO_PROJECTS_STORAGE_KEY,
      JSON.stringify(updatedProjects)
    );
    if (params.oldName !== cleaned) {
      const updatedTasks = tasks.map((t) =>
        t.project_name === params.oldName ? { ...t, project_name: cleaned } : t
      );
      setTasks(updatedTasks);
      localStorage.setItem(DEMO_TASKS_STORAGE_KEY, JSON.stringify(updatedTasks));
    }
    return null;
  };

  const handleDeleteProject = async (id: string): Promise<string | null> => {
    if (!currentUser || !isManager) {
      return 'Only managers, admins, or superadmins can remove projects.';
    }
    const supabase = getSupabaseClient();
    if (supabase && !isDemoSession) {
      const { error } = await supabase.from('projects').delete().eq('id', id);
      if (error) return error.message;
      await fetchSupabaseData(currentUser);
      return null;
    }
    const updated = projects.filter((p) => p.id !== id);
    setProjects(updated);
    localStorage.setItem(DEMO_PROJECTS_STORAGE_KEY, JSON.stringify(updated));
    return null;
  };

  const handleSetProjectMembers = async (
    projectId: string,
    employeeIds: string[]
  ): Promise<string | null> => {
    if (!currentUser || !isManager) {
      return 'Only managers or superadmins can assign employees to projects.';
    }
    const targetProject = projects.find((p) => p.id === projectId);
    const desiredSet = new Set(employeeIds);
    const currentForProject = projectMembers.filter(
      (m) => m.project_id === projectId
    );
    const currentSet = new Set(currentForProject.map((m) => m.employee_id));

    const toAdd = employeeIds.filter((id) => !currentSet.has(id));
    const toRemove = currentForProject
      .filter((m) => !desiredSet.has(m.employee_id))
      .map((m) => m.employee_id);

    const supabase = getSupabaseClient();
    if (supabase && !isDemoSession) {
      if (toAdd.length > 0) {
        const { error: insertErr } = await supabase
          .from('project_members')
          .insert(
            toAdd.map((empId) => ({
              project_id: projectId,
              employee_id: empId,
              assigned_by: currentUser.id,
            }))
          );
        if (insertErr) return insertErr.message;
      }

      if (toRemove.length > 0) {
        const { error: delErr } = await supabase
          .from('project_members')
          .delete()
          .eq('project_id', projectId)
          .in('employee_id', toRemove);
        if (delErr) return delErr.message;
      }

      if (toAdd.length > 0 && targetProject) {
        await createActivityNotifications({
          recipientIds: toAdd,
          type: 'activity',
          title: 'Assigned to Project',
          message: `${currentUser.full_name} assigned you to project "${targetProject.name}".`,
        });
      }

      await fetchSupabaseData(currentUser);
      return null;
    }

    const nowIso = new Date().toISOString();
    const kept = projectMembers.filter(
      (m) => !(m.project_id === projectId && !desiredSet.has(m.employee_id))
    );
    const added: ProjectMember[] = toAdd.map((empId) => ({
      id: `pm-${Date.now()}-${empId}`,
      project_id: projectId,
      employee_id: empId,
      assigned_by: currentUser.id,
      created_at: nowIso,
    }));
    const updatedMembers = [...kept, ...added];
    setProjectMembers(updatedMembers);
    localStorage.setItem(
      DEMO_PROJECT_MEMBERS_STORAGE_KEY,
      JSON.stringify(updatedMembers)
    );
    return null;
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

  // Tick every second only while at least one active task timer is running
  const hasRunningTimer = useMemo(
    () =>
      activeAccessibleTasks.some(
        (t) =>
          t.status === 'in_progress' &&
          Boolean(t.is_timer_running) &&
          Boolean(t.timer_started_at)
      ),
    [activeAccessibleTasks]
  );

  useEffect(() => {
    if (!hasRunningTimer) return;
    setNowMs(Date.now());
    const intervalId = window.setInterval(() => {
      setNowMs(Date.now());
    }, 1000);
    return () => window.clearInterval(intervalId);
  }, [hasRunningTimer]);

  const myInProgressTasks = useMemo(
    () =>
      activeAccessibleTasks.filter(
        (t) =>
          t.status === 'in_progress' &&
          (!currentUser ||
            t.employee_id === currentUser.id ||
            t.id === focusedTimerTaskId)
      ),
    [activeAccessibleTasks, currentUser, focusedTimerTaskId]
  );

  // Keep browser tab title updated with live running timer
  useEffect(() => {
    const runningTask = myInProgressTasks.find(
      (t) => t.is_timer_running && t.timer_started_at
    );
    if (runningTask) {
      const elapsed = formatTimerDuration(
        getTaskElapsedSeconds(runningTask, nowMs)
      );
      document.title = `⏱ ${elapsed} • ${runningTask.title}`;
    } else {
      document.title = 'Employee Task Manager';
    }
    return () => {
      document.title = 'Employee Task Manager';
    };
  }, [myInProgressTasks, nowMs]);

  const deletedAccessibleTasks = useMemo(
    () => accessibleTasks.filter((t) => Boolean(t.is_deleted)),
    [accessibleTasks]
  );

  const availableDepartments = useMemo(() => {
    const deptSet = new Set<string>(
      departments.length > 0
        ? departments.map((d) => d.name.trim()).filter(Boolean)
        : [...TASK_CATEGORIES]
    );
    return Array.from(deptSet).sort((a, b) => a.localeCompare(b));
  }, [departments]);

  const availableProjects = useMemo(() => {
    const projectSet = new Set<string>();
    if (isManager) {
      for (const p of projects) {
        if (p.status !== 'archived' && p.name.trim()) {
          projectSet.add(p.name.trim());
        }
      }
      for (const t of accessibleTasks) {
        const trimmed = t.project_name?.trim();
        if (trimmed) projectSet.add(trimmed);
      }
    } else {
      // Employees only see projects assigned to them (via project_members or their active tasks)
      const assignedProjectIds = new Set(
        projectMembers
          .filter((m) => m.employee_id === currentUser?.id)
          .map((m) => m.project_id)
      );
      for (const p of projects) {
        if (
          p.status !== 'archived' &&
          assignedProjectIds.has(p.id) &&
          p.name.trim()
        ) {
          projectSet.add(p.name.trim());
        }
      }
      for (const t of activeAccessibleTasks) {
        const trimmed = t.project_name?.trim();
        if (trimmed) projectSet.add(trimmed);
      }
    }
    return Array.from(projectSet).sort((a, b) => a.localeCompare(b));
  }, [isManager, projects, projectMembers, currentUser?.id, accessibleTasks, activeAccessibleTasks]);

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
      if (
        selectedProject !== 'all' &&
        (selectedProject === '__unassigned__'
          ? Boolean(task.project_name?.trim())
          : (task.project_name?.trim() || '') !== selectedProject)
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
        const matchProject = (task.project_name || '').toLowerCase().includes(q);
        const matchCat = task.category.toLowerCase().includes(q);
        const matchEmp = empName.includes(q);
        const matchDel = deletedBy.includes(q);
        if (
          !matchTitle &&
          !matchDesc &&
          !matchProject &&
          !matchCat &&
          !matchEmp &&
          !matchDel
        )
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
    selectedProject,
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
      (acc, t) =>
        acc +
        (t.is_timer_running && t.timer_started_at
          ? secondsToHours(getTaskElapsedSeconds(t, nowMs))
          : Number(t.hours_spent) || 0),
      0
    );
    const runningTimersCount = kpiSourceTasks.filter(
      (t) => t.status === 'in_progress' && t.is_timer_running && t.timer_started_at
    ).length;
    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

    return {
      total,
      completed,
      inProgress,
      blocked,
      totalHours,
      runningTimersCount,
      completionRate,
    };
  }, [activeAccessibleTasks, isManager, selectedEmployeeId, matchesSelectedDate, nowMs]);

  // CSV Export for Managers/Employees
  const handleExportCsv = () => {
    const headers = [
      'Task Date',
      'Employee Name',
      'Department',
      'Project',
      'Task Title',
      'Category',
      'Status',
      'Priority',
      'Hours Spent',
      'Due Date',
      'Date Completed',
      'Manager Feedback',
    ];
    const rows = filteredTasks.map((t) => {
      const emp = profilesMap[t.employee_id];
      return [
        t.task_date,
        `"${(emp?.full_name || 'Employee').replace(/"/g, '""')}"`,
        `"${(emp?.department || 'General').replace(/"/g, '""')}"`,
        `"${(t.project_name || '').replace(/"/g, '""')}"`,
        `"${t.title.replace(/"/g, '""')}"`,
        `"${t.category}"`,
        t.status,
        t.priority,
        t.hours_spent,
        t.due_date || '',
        t.completed_date || '',
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

  const liveEditingTask = useMemo(
    () =>
      editingTask
        ? tasks.find((t) => t.id === editingTask.id) || editingTask
        : null,
    [tasks, editingTask]
  );

  if (authChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#2f121b] text-white">
        <div className="flex items-center gap-3">
          <RefreshCw className="w-5 h-5 animate-spin text-[#f5a65b]" />
          <span className="text-sm font-medium">Loading workspace...</span>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return <AuthScreen onSupabaseSignIn={handleSupabaseSignIn} />;
  }

  return (
    <div className="min-h-screen bg-[#faf7f5] flex flex-col">
      {/* Top Navigation Header */}
      <header className="sticky top-0 z-30 bg-white border-b border-slate-200 shadow-2xs">
        <div className="w-full px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          {/* Brand Logo & Role Badge */}
          <div className="flex items-center gap-3 shrink-0">
            {isManager && (
              <button
                type="button"
                onClick={() => setIsMobileSidebarOpen(true)}
                title="Open Menu"
                className="lg:hidden p-2 rounded-xl border border-slate-200 text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 transition cursor-pointer"
              >
                <Menu className="w-5 h-5" />
              </button>
            )}
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
                  ? 'Organization task monitoring & management'
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

      {/* Body Wrapper: Left Side Panel Menu + Main Content */}
      <div className="flex flex-1 min-h-0">
        {/* Desktop Left Side Panel Menu (Managers / Admins / Superadmins) */}
        {isManager && (
          <aside
            aria-label="Sidebar Navigation"
            className={`hidden lg:flex flex-col shrink-0 bg-white border-r border-slate-200 sticky top-16 h-[calc(100vh-4rem)] transition-all duration-200 ${
              isSidebarCollapsed ? 'w-[74px]' : 'w-64'
            }`}
          >
            <div className="p-3 flex-1 overflow-y-auto space-y-1">
              {!isSidebarCollapsed && (
                <div className="px-3 pt-2 pb-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Navigation Menu
                </div>
              )}

              <button
                type="button"
                onClick={() => setViewMode('list')}
                title="Tasks"
                className={`w-full flex items-center ${
                  isSidebarCollapsed ? 'justify-center px-2' : 'px-3'
                } py-2.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
                  viewMode === 'list' ||
                  viewMode === 'kanban' ||
                  viewMode === 'deleted'
                    ? 'bg-indigo-50 text-indigo-700 border border-indigo-200/70 shadow-2xs'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 border border-transparent'
                }`}
              >
                <span className="flex items-center gap-2.5 min-w-0">
                  <LayoutList className="w-4 h-4 shrink-0" />
                  {!isSidebarCollapsed && <span className="truncate">Tasks</span>}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setViewMode('employees')}
                title={isSuperAdmin ? 'Users Monitor' : 'Employees Monitor'}
                className={`w-full flex items-center ${
                  isSidebarCollapsed ? 'justify-center px-2' : 'px-3'
                } py-2.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
                  viewMode === 'employees'
                    ? 'bg-indigo-50 text-indigo-700 border border-indigo-200/70 shadow-2xs'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 border border-transparent'
                }`}
              >
                <span className="flex items-center gap-2.5 min-w-0">
                  <Users className="w-4 h-4 shrink-0" />
                  {!isSidebarCollapsed && (
                    <span className="truncate">
                      {isSuperAdmin ? 'Users Monitor' : 'Employees Monitor'}
                    </span>
                  )}
                </span>
              </button>

              {!isSidebarCollapsed && (
                <div className="px-3 pt-4 pb-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Organization
                </div>
              )}

              <button
                type="button"
                onClick={() => setViewMode('departments')}
                title="Departments"
                className={`w-full flex items-center ${
                  isSidebarCollapsed ? 'justify-center px-2' : 'px-3'
                } py-2.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
                  viewMode === 'departments'
                    ? 'bg-indigo-50 text-indigo-700 border border-indigo-200/70 shadow-2xs'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 border border-transparent'
                }`}
              >
                <span className="flex items-center gap-2.5 min-w-0">
                  <Building2 className="w-4 h-4 shrink-0" />
                  {!isSidebarCollapsed && <span className="truncate">Departments</span>}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setViewMode('projects')}
                title="Projects"
                className={`w-full flex items-center ${
                  isSidebarCollapsed ? 'justify-center px-2' : 'px-3'
                } py-2.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
                  viewMode === 'projects'
                    ? 'bg-indigo-50 text-indigo-700 border border-indigo-200/70 shadow-2xs'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 border border-transparent'
                }`}
              >
                <span className="flex items-center gap-2.5 min-w-0">
                  <FolderKanban className="w-4 h-4 shrink-0" />
                  {!isSidebarCollapsed && <span className="truncate">Projects</span>}
                </span>
              </button>
            </div>

            {/* Collapse / Expand Sidebar Toggle */}
            <div className="p-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsSidebarCollapsed((prev) => !prev)}
                className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition cursor-pointer"
                title={isSidebarCollapsed ? 'Expand Menu' : 'Collapse Menu'}
              >
                {isSidebarCollapsed ? (
                  <PanelLeftOpen className="w-4 h-4" />
                ) : (
                  <>
                    <PanelLeftClose className="w-4 h-4" />
                    <span>Collapse Menu</span>
                  </>
                )}
              </button>
            </div>
          </aside>
        )}

        {/* Mobile Slide-Over Left Side Panel Menu */}
        {isManager && isMobileSidebarOpen && (
          <div className="fixed inset-0 z-50 lg:hidden flex">
            <div
              className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs"
              onClick={() => setIsMobileSidebarOpen(false)}
            />
            <aside className="relative z-10 w-72 max-w-[85vw] bg-white h-full shadow-2xl border-r border-slate-200 flex flex-col">
              <div className="px-4 h-16 border-b border-slate-200 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <img
                    src={logoImg}
                    alt="Company Logo"
                    className="h-9 w-auto object-contain"
                  />
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
                    Menu
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setIsMobileSidebarOpen(false)}
                  className="p-2 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-3 flex-1 overflow-y-auto space-y-1">
                <div className="px-3 pt-2 pb-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Navigation Menu
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setViewMode('list');
                    setIsMobileSidebarOpen(false);
                  }}
                  className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
                    viewMode === 'list' ||
                    viewMode === 'kanban' ||
                    viewMode === 'deleted'
                      ? 'bg-indigo-50 text-indigo-700 border border-indigo-200/70'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <LayoutList className="w-4 h-4" />
                  <span>Tasks</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setViewMode('employees');
                    setIsMobileSidebarOpen(false);
                  }}
                  className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
                    viewMode === 'employees'
                      ? 'bg-indigo-50 text-indigo-700 border border-indigo-200/70'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <Users className="w-4 h-4" />
                  <span>
                    {isSuperAdmin ? 'Users Monitor' : 'Employees Monitor'}
                  </span>
                </button>

                <div className="px-3 pt-4 pb-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Organization
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setViewMode('departments');
                    setIsMobileSidebarOpen(false);
                  }}
                  className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
                    viewMode === 'departments'
                      ? 'bg-indigo-50 text-indigo-700 border border-indigo-200/70'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <Building2 className="w-4 h-4" />
                  <span>Departments</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setViewMode('projects');
                    setIsMobileSidebarOpen(false);
                  }}
                  className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
                    viewMode === 'projects'
                      ? 'bg-indigo-50 text-indigo-700 border border-indigo-200/70'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <FolderKanban className="w-4 h-4" />
                  <span>Projects</span>
                </button>
              </div>
            </aside>
          </div>
        )}

      {/* Main Content Container */}
      <main className="flex-1 min-w-0 w-full max-w-[1650px] mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Tasks Dashboard Header, KPIs & Filter Bar (only on Task views) */}
        {(viewMode === 'list' ||
          viewMode === 'kanban' ||
          viewMode === 'deleted') && (
          <>
        {/* Role Access Banner + Primary CTA */}
        <div
          className={`p-4 sm:p-5 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm ${
            isManager
              ? 'bg-gradient-to-r from-[#5e2938] via-[#8c4356] to-[#c85a47] text-white border-[#753446]'
              : 'bg-gradient-to-r from-[#491f2c] via-[#753446] to-[#a84a56] text-white border-[#5e2938]'
          }`}
        >
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-[#fcd7ad]">
              <Shield className="w-4 h-4" />
              {isManager
                ? 'Manager Monitoring Mode (All Employees Visible)'
                : 'Employee Task Logger (Strict Personal Task Visibility)'}
            </div>
            <h1 className="text-xl sm:text-2xl font-bold">
              Welcome back, {currentUser.full_name}
            </h1>
            <p className="text-xs sm:text-sm text-[#fae5e0]">
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
                {kpiStats.runningTimersCount > 0 ? (
                  <span className="inline-flex items-center gap-1.5 text-emerald-700 font-semibold">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    {kpiStats.runningTimersCount} timer
                    {kpiStats.runningTimersCount > 1 ? 's' : ''} running
                  </span>
                ) : (
                  'Cumulative logged time'
                )}
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
              {/* Search */}
              <div className="relative lg:col-span-2">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-2.5" />
                <input
                  type="text"
                  placeholder={
                    isManager
                      ? 'Search task title, project, category, or employee...'
                      : 'Search your logged tasks or projects...'
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

              {/* Project Filter */}
              <div>
                <select
                  aria-label="Filter by Project"
                  value={selectedProject}
                  onChange={(e) => setSelectedProject(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs sm:text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="all">All Projects ({availableProjects.length})</option>
                  {availableProjects.map((proj) => (
                    <option key={proj} value={proj}>
                      {proj}
                    </option>
                  ))}
                  <option value="__unassigned__">No Project Assigned</option>
                </select>
              </div>

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

          {selectedDateFilter === 'custom' && (
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
          </>
        )}

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
                              {task.project_name && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-200 text-[11px] font-semibold">
                                  <FolderKanban className="w-3 h-3" />
                                  {task.project_name}
                                </span>
                              )}
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

                          <td
                            className="py-4 px-4 whitespace-nowrap text-xs"
                            onClick={(e) => {
                              if (
                                (e.target as HTMLElement).closest('button')
                              ) {
                                e.stopPropagation();
                              }
                            }}
                          >
                            <div className="flex items-center gap-1 font-medium text-slate-800">
                              <Calendar className="w-3.5 h-3.5 text-slate-400" />
                              {task.task_date}
                            </div>
                            {task.completed_date && (
                              <div className="flex items-center gap-1 text-emerald-700 font-semibold mt-0.5">
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                Done: {task.completed_date}
                              </div>
                            )}
                            {task.status === 'in_progress' && !task.is_deleted ? (
                              <div className="mt-1 flex items-center gap-1.5 flex-wrap">
                                <span
                                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-mono font-bold text-[11px] border ${
                                    task.is_timer_running
                                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                      : 'bg-amber-50 text-amber-700 border-amber-200'
                                  }`}
                                >
                                  <span
                                    className={`w-1.5 h-1.5 rounded-full ${
                                      task.is_timer_running
                                        ? 'bg-emerald-500 animate-pulse'
                                        : 'bg-amber-500'
                                    }`}
                                  />
                                  {formatTimerDuration(
                                    getTaskElapsedSeconds(task, nowMs)
                                  )}
                                </span>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleToggleTaskTimer(task.id);
                                  }}
                                  title={
                                    task.is_timer_running
                                      ? 'Pause Timer'
                                      : 'Continue Timer'
                                  }
                                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold border transition cursor-pointer ${
                                    task.is_timer_running
                                      ? 'bg-white text-amber-700 border-amber-300 hover:bg-amber-50'
                                      : 'bg-emerald-600 text-white border-emerald-600 hover:bg-emerald-700'
                                  }`}
                                >
                                  {task.is_timer_running ? (
                                    <>
                                      <Pause className="w-3 h-3" />
                                      <span>Pause</span>
                                    </>
                                  ) : (
                                    <>
                                      <Play className="w-3 h-3" />
                                      <span>Continue</span>
                                    </>
                                  )}
                                </button>
                              </div>
                            ) : (
                              <div className="flex items-center gap-1.5 mt-0.5">
                                <span className="inline-flex items-center gap-1 text-indigo-600 font-semibold">
                                  <Clock className="w-3.5 h-3.5" />
                                  {Number(task.hours_spent).toFixed(2)} hrs
                                </span>
                                {task.status === 'review' && !task.is_deleted && (
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleStatusChange(task.id, 'completed');
                                    }}
                                    title="Approve & Mark Completed"
                                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 text-[10px] font-semibold transition cursor-pointer"
                                  >
                                    <CheckCircle2 className="w-3 h-3" />
                                    <span>Complete</span>
                                  </button>
                                )}
                              </div>
                            )}
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
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.dataTransfer.dropEffect = 'move';
                    if (dragOverStatus !== statusKey) {
                      setDragOverStatus(statusKey);
                    }
                  }}
                  onDragLeave={(e) => {
                    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                      setDragOverStatus((prev) =>
                        prev === statusKey ? null : prev
                      );
                    }
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    const droppedId =
                      e.dataTransfer.getData('text/plain') || draggedTaskId;
                    setDraggedTaskId(null);
                    setDragOverStatus(null);
                    if (!droppedId) return;
                    const droppedTask = tasks.find((t) => t.id === droppedId);
                    if (droppedTask && droppedTask.status !== statusKey) {
                      handleStatusChange(droppedId, statusKey);
                    }
                  }}
                  className={`rounded-2xl p-3 border flex flex-col gap-3 min-h-[420px] transition-colors ${
                    dragOverStatus === statusKey
                      ? 'bg-indigo-50/70 border-indigo-400 ring-2 ring-indigo-300/70'
                      : 'bg-slate-100/80 border-slate-200/80'
                  }`}
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
                    {columnTasks.length === 0 && dragOverStatus === statusKey && (
                      <div className="h-24 rounded-xl border-2 border-dashed border-indigo-300 bg-white/60 flex items-center justify-center text-xs font-semibold text-indigo-600">
                        Drop to move to {cfg.label}
                      </div>
                    )}
                    {columnTasks.map((task) => {
                      const emp = profilesMap[task.employee_id];
                      const isDragging = draggedTaskId === task.id;
                      return (
                        <div
                          key={task.id}
                          draggable
                          onDragStart={(e) => {
                            e.dataTransfer.setData('text/plain', task.id);
                            e.dataTransfer.effectAllowed = 'move';
                            setDraggedTaskId(task.id);
                          }}
                          onDragEnd={() => {
                            setDraggedTaskId(null);
                            setDragOverStatus(null);
                          }}
                          onClick={() => setSelectedTaskId(task.id)}
                          className={`bg-white p-3.5 rounded-xl border shadow-2xs hover:shadow-md hover:border-indigo-300 transition cursor-grab active:cursor-grabbing space-y-2.5 select-none ${
                            isDragging
                              ? 'opacity-50 scale-[0.98] border-indigo-400 ring-2 ring-indigo-300'
                              : 'border-slate-200'
                          }`}
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

                          {task.project_name && (
                            <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200 text-[10px] font-semibold max-w-full truncate">
                              <FolderKanban className="w-3 h-3 shrink-0" />
                              <span className="truncate">{task.project_name}</span>
                            </div>
                          )}

                          {task.completed_date && (
                            <div className="flex items-center gap-1 text-[11px] font-semibold text-emerald-700">
                              <CheckCircle2 className="w-3 h-3 shrink-0" />
                              <span>Completed: {task.completed_date}</span>
                            </div>
                          )}

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

                          <div className="flex items-center justify-between gap-1 text-[11px] text-slate-500 pt-1">
                            {task.status === 'in_progress' ? (
                              <div className="flex items-center gap-1.5">
                                <span
                                  className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded font-mono font-bold text-[10px] border ${
                                    task.is_timer_running
                                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                      : 'bg-amber-50 text-amber-700 border-amber-200'
                                  }`}
                                >
                                  <Timer className="w-3 h-3" />
                                  {formatTimerDuration(
                                    getTaskElapsedSeconds(task, nowMs)
                                  )}
                                </span>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleToggleTaskTimer(task.id);
                                  }}
                                  title={
                                    task.is_timer_running
                                      ? 'Pause Timer'
                                      : 'Continue Timer'
                                  }
                                  className={`p-1 rounded border transition cursor-pointer ${
                                    task.is_timer_running
                                      ? 'bg-white text-amber-700 border-amber-300 hover:bg-amber-50'
                                      : 'bg-emerald-600 text-white border-emerald-600 hover:bg-emerald-700'
                                  }`}
                                >
                                  {task.is_timer_running ? (
                                    <Pause className="w-3 h-3" />
                                  ) : (
                                    <Play className="w-3 h-3" />
                                  )}
                                </button>
                              </div>
                            ) : (
                              <span className="font-semibold text-indigo-600">
                                {Number(task.hours_spent).toFixed(2)}h logged
                              </span>
                            )}
                            <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 text-[10px] truncate max-w-[110px]">
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
        {viewMode === 'employees' && isManager && (() => {
          const employeeRows = visibleManagedProfiles
            .map((prof) => {
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
              const assignedProjNames = projectMembers
                .filter((m) => m.employee_id === prof.id)
                .map((m) => projects.find((p) => p.id === m.project_id)?.name?.trim())
                .filter((p): p is string => Boolean(p));
              const empProjects = Array.from(
                new Set([
                  ...assignedProjNames,
                  ...empTasks
                    .map((t) => t.project_name?.trim())
                    .filter((p): p is string => Boolean(p)),
                ])
              );
              return {
                prof,
                empTasks,
                completedCount,
                inProgressCount,
                blockedCount,
                hoursSum,
                rate,
                empProjects,
              };
            })
            .filter(({ prof, empProjects }) => {
              const q = employeeSearchQuery.trim().toLowerCase();
              if (!q) return true;
              return (
                prof.full_name.toLowerCase().includes(q) ||
                prof.email.toLowerCase().includes(q) ||
                prof.department.toLowerCase().includes(q) ||
                prof.role.toLowerCase().includes(q) ||
                empProjects.some((p) => p.toLowerCase().includes(q))
              );
            });

          return (
          <div className="space-y-5">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs p-5 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-xs shrink-0">
                    <Users className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-slate-900">
                      {isSuperAdmin ? 'Users Monitor' : 'Employees Monitor'} ({employeeRows.length}
                      {employeeSearchQuery.trim()
                        ? ` of ${visibleManagedProfiles.length}`
                        : ''}
                      )
                    </h2>
                    <p className="text-xs text-slate-500">
                      Monitor completion rates, logged hours, assigned projects, and manage user accounts
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setEditingProfile(null);
                    setIsAddEmployeeModalOpen(true);
                  }}
                  className={`inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold shadow-xs transition cursor-pointer shrink-0 ${
                    isSuperAdmin
                      ? 'bg-purple-600 hover:bg-purple-700 text-white'
                      : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                  }`}
                >
                  <UserPlus className="w-4 h-4" />
                  <span>
                    {isSuperAdmin ? 'Add Manager / User' : 'Add Employee'}
                  </span>
                </button>
              </div>

              {/* Search & Card/List View Toggle */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-slate-100">
                <div className="relative flex-1 max-w-md">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-2.5" />
                  <input
                    type="text"
                    placeholder="Search by name, email, department, role, or project..."
                    value={employeeSearchQuery}
                    onChange={(e) => setEmployeeSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div className="inline-flex items-center gap-1 bg-slate-100 p-1 rounded-xl w-fit">
                  <button
                    type="button"
                    onClick={() => setEmployeeViewLayout('grid')}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                      employeeViewLayout === 'grid'
                        ? 'bg-white text-indigo-700 shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <LayoutGrid className="w-3.5 h-3.5" />
                    <span>Cards</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setEmployeeViewLayout('list')}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                      employeeViewLayout === 'list'
                        ? 'bg-white text-indigo-700 shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <LayoutList className="w-3.5 h-3.5" />
                    <span>List View</span>
                  </button>
                </div>
              </div>
            </div>

            {employeeRows.length === 0 ? (
              <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center space-y-2">
                <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                  <Users className="w-6 h-6" />
                </div>
                <div className="text-sm font-bold text-slate-800">
                  No matching users found
                </div>
                <p className="text-xs text-slate-500">
                  Try clearing or adjusting your search query.
                </p>
              </div>
            ) : employeeViewLayout === 'list' ? (
              <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50/80 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                        <th className="py-3.5 px-5">User</th>
                        <th className="py-3.5 px-4">Role & Department</th>
                        <th className="py-3.5 px-4">Projects</th>
                        <th className="py-3.5 px-4">Completion</th>
                        <th className="py-3.5 px-4">Tasks / Hours</th>
                        <th className="py-3.5 px-5 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 text-sm">
                      {employeeRows.map(
                        ({
                          prof,
                          empTasks,
                          inProgressCount,
                          blockedCount,
                          hoursSum,
                          rate,
                          empProjects,
                        }) => (
                          <tr
                            key={prof.id}
                            className="hover:bg-slate-50/80 transition"
                          >
                            <td className="py-3.5 px-5 whitespace-nowrap">
                              <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white font-bold text-xs flex items-center justify-center shrink-0">
                                  {prof.full_name
                                    .split(' ')
                                    .map((n) => n[0])
                                    .join('')
                                    .slice(0, 2)}
                                </div>
                                <div>
                                  <div className="font-bold text-slate-900 text-xs sm:text-sm">
                                    {prof.full_name}
                                  </div>
                                  <div className="text-xs text-slate-500">
                                    {prof.email}
                                  </div>
                                </div>
                              </div>
                            </td>

                            <td className="py-3.5 px-4 whitespace-nowrap">
                              <div className="flex flex-col items-start gap-1">
                                <span
                                  className={`px-2 py-0.5 rounded-full border text-[10px] font-bold uppercase ${
                                    prof.role === 'superadmin'
                                      ? 'bg-purple-50 text-purple-700 border-purple-200'
                                      : prof.role === 'manager'
                                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                      : 'bg-indigo-50 text-indigo-700 border-indigo-200'
                                  }`}
                                >
                                  {prof.role}
                                </span>
                                <span className="text-xs text-slate-600 font-medium">
                                  {prof.department}
                                </span>
                              </div>
                            </td>

                            <td className="py-3.5 px-4 max-w-xs">
                              {empProjects.length > 0 ? (
                                <div className="flex flex-wrap gap-1">
                                  {empProjects.map((proj) => (
                                    <span
                                      key={proj}
                                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-200 text-[10px] font-semibold"
                                    >
                                      <FolderKanban className="w-3 h-3" />
                                      {proj}
                                    </span>
                                  ))}
                                </div>
                              ) : (
                                <span className="text-xs text-slate-400">—</span>
                              )}
                            </td>

                            <td className="py-3.5 px-4 whitespace-nowrap">
                              <div className="w-32 space-y-1">
                                <div className="flex justify-between text-[11px]">
                                  <span className="text-slate-500">Rate</span>
                                  <span className="font-bold text-slate-800">
                                    {rate}%
                                  </span>
                                </div>
                                <div className="w-full h-1.5 rounded-full bg-slate-100 overflow-hidden">
                                  <div
                                    className="h-full bg-emerald-500 rounded-full"
                                    style={{ width: `${rate}%` }}
                                  />
                                </div>
                              </div>
                            </td>

                            <td className="py-3.5 px-4 whitespace-nowrap text-xs">
                              <div className="flex items-center gap-2 font-semibold">
                                <span className="text-slate-800">
                                  {empTasks.length} total
                                </span>
                                <span className="text-blue-600">
                                  {inProgressCount} active
                                </span>
                                {blockedCount > 0 && (
                                  <span className="text-rose-600">
                                    {blockedCount} blocked
                                  </span>
                                )}
                              </div>
                              <div className="text-indigo-600 font-semibold mt-0.5">
                                {hoursSum.toFixed(1)}h logged
                              </div>
                            </td>

                            <td className="py-3.5 px-5 text-right whitespace-nowrap">
                              <div className="inline-flex items-center justify-end gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSelectedEmployeeId(prof.id);
                                    setViewMode('list');
                                  }}
                                  className="px-3 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-semibold transition cursor-pointer"
                                >
                                  Tasks ({empTasks.length})
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingProfile(prof);
                                    setIsAddEmployeeModalOpen(true);
                                  }}
                                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold transition cursor-pointer"
                                >
                                  <Edit3 className="w-3.5 h-3.5" />
                                  <span>Edit</span>
                                </button>
                              </div>
                            </td>
                          </tr>
                        )
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {employeeRows.map(
              ({
                prof,
                empTasks,
                inProgressCount,
                blockedCount,
                hoursSum,
                rate,
                empProjects,
              }) => {
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
                            : prof.role === 'manager'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : 'bg-indigo-50 text-indigo-700 border-indigo-200'
                        }`}
                      >
                        {prof.role}
                      </span>
                    </div>

                    {empProjects.length > 0 && (
                      <div className="flex flex-wrap items-center gap-1.5 pt-1">
                        {empProjects.map((proj) => (
                          <span
                            key={proj}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-200 text-[10px] font-semibold"
                          >
                            <FolderKanban className="w-3 h-3" />
                            {proj}
                          </span>
                        ))}
                      </div>
                    )}

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
          </div>
          );
        })()}
        {/* VIEW 4: DEPARTMENTS MANAGEMENT PAGE */}
        {viewMode === 'departments' && isManager && (
          <DepartmentsPage
            departments={departments}
            profiles={profiles}
            tasks={tasks}
            onAddDepartment={handleAddDepartment}
            onUpdateDepartment={handleUpdateDepartment}
            onDeleteDepartment={handleDeleteDepartment}
          />
        )}

        {/* VIEW 5: PROJECTS MANAGEMENT PAGE */}
        {viewMode === 'projects' && isManager && (
          <ProjectsPage
            projects={projects}
            tasks={tasks}
            employees={visibleManagedProfiles}
            projectMembers={projectMembers}
            onAddProject={handleAddProject}
            onUpdateProject={handleUpdateProject}
            onDeleteProject={handleDeleteProject}
            onSetProjectMembers={handleSetProjectMembers}
            onInspectProjectTasks={(projName) => {
              setSelectedProject(projName);
              setViewMode('list');
            }}
          />
        )}
      </main>
      </div>

      {/* Modals & Drawers */}
      <TaskFormModal
        isOpen={isTaskModalOpen}
        onClose={() => {
          setIsTaskModalOpen(false);
          setEditingTask(null);
        }}
        currentUser={currentUser}
        employees={visibleManagedProfiles}
        departments={availableDepartments}
        existingProjects={availableProjects}
        initialTask={liveEditingTask}
        nowMs={nowMs}
        onToggleTimer={handleToggleTaskTimer}
        onSave={handleSaveTask}
      />

      <TaskDetailDrawer
        task={activeTask}
        onClose={() => setSelectedTaskId(null)}
        currentUser={currentUser}
        profilesMap={profilesMap}
        comments={comments}
        nowMs={nowMs}
        onToggleTimer={handleToggleTaskTimer}
        onFloatTimer={openFloatingTimerPip}
        isTimerFloating={Boolean(pipWindow && !pipWindow.closed)}
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
        departments={availableDepartments}
        projects={projects}
        initialAssignedProjectIds={
          editingProfile
            ? projectMembers
                .filter((m) => m.employee_id === editingProfile.id)
                .map((m) => m.project_id)
            : []
        }
        editingProfile={editingProfile}
        onCreateEmployee={handleCreateEmployee}
        onUpdateEmployee={handleUpdateEmployee}
      />

      {/* Document Picture-in-Picture Floating Desktop Timer + In-App Bar */}
      <FloatingTimerWidget
        inProgressTasks={myInProgressTasks}
        preferredTaskId={focusedTimerTaskId}
        nowMs={nowMs}
        pipWindow={pipWindow}
        onOpenPip={openFloatingTimerPip}
        onClosePip={closeFloatingTimerPip}
        onToggleTimer={handleToggleTaskTimer}
        onSendToReview={(taskId) => handleStatusChange(taskId, 'review')}
        onInspectTask={(taskId) => setSelectedTaskId(taskId)}
      />
    </div>
  );
}
export default App;

