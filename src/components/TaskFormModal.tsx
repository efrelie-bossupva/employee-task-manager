import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  ClipboardList,
  UserCheck,
  FolderKanban,
  Play,
  Pause,
  Timer,
  Clock,
} from 'lucide-react';
import {
  Profile,
  TaskItem,
  TaskPriority,
  TaskStatus,
  TASK_CATEGORIES,
} from '../types';
import { CustomSelect } from './CustomSelect';
import {
  formatTimerDuration,
  getTaskElapsedSeconds,
  secondsToHours,
} from '../lib/timerUtils';

interface TaskFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: Profile;
  employees: Profile[];
  departments?: string[];
  existingProjects?: string[];
  initialTask?: TaskItem | null;
  nowMs?: number;
  onToggleTimer?: (taskId: string) => Promise<void>;
  onSave: (taskData: {
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
  }) => Promise<void>;
}

export const TaskFormModal: React.FC<TaskFormModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  employees,
  departments = [],
  existingProjects = [],
  initialTask,
  nowMs = Date.now(),
  onToggleTimer,
  onSave,
}) => {
  const isManager =
    currentUser.role === 'manager' || currentUser.role === 'superadmin';
  const today = new Date().toISOString().split('T')[0];

  const [employeeId, setEmployeeId] = useState(currentUser.id);
  const [projectName, setProjectName] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<string>(TASK_CATEGORIES[0]);
  const [status, setStatus] = useState<TaskStatus>('in_progress');
  const [priority, setPriority] = useState<TaskPriority>('medium');
  const [taskDate, setTaskDate] = useState(today);
  const [dueDate, setDueDate] = useState('');
  const [completedDate, setCompletedDate] = useState('');
  const [hoursSpent, setHoursSpent] = useState('0');
  const [manualOverride, setManualOverride] = useState(false);
  const [managerFeedback, setManagerFeedback] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const departmentOptions = useMemo(() => {
    const base = departments.length > 0 ? departments : [...TASK_CATEGORIES];
    return Array.from(new Set<string>(base));
  }, [departments]);

  const projectOptions = useMemo(() => {
    const set = new Set<string>(existingProjects);
    if (projectName && !set.has(projectName)) set.add(projectName);
    return Array.from(set);
  }, [existingProjects, projectName]);

  useEffect(() => {
    if (!isOpen) return;
    setManualOverride(false);
    if (initialTask) {
      setEmployeeId(initialTask.employee_id);
      setProjectName(initialTask.project_name || '');
      setTitle(initialTask.title);
      setDescription(initialTask.description);
      setCategory(initialTask.category || departmentOptions[0] || TASK_CATEGORIES[0]);
      setStatus(initialTask.status);
      setPriority(initialTask.priority);
      setTaskDate(initialTask.task_date);
      setDueDate(initialTask.due_date || '');
      setCompletedDate(initialTask.completed_date || '');
      setHoursSpent(String(initialTask.hours_spent ?? 0));
      setManagerFeedback(initialTask.manager_feedback || '');
    } else {
      const defaultEmp =
        isManager && employees.length > 0
          ? employees.find((e) => e.role === 'employee')?.id || currentUser.id
          : currentUser.id;
      setEmployeeId(defaultEmp);
      setProjectName('');
      setTitle('');
      setDescription('');
      const defaultEmpProfile = employees.find((e) => e.id === defaultEmp);
      setCategory(
        isManager
          ? defaultEmpProfile?.department || departments[0] || TASK_CATEGORIES[0]
          : currentUser.department || 'General'
      );
      setStatus(isManager ? 'todo' : 'in_progress');
      setPriority('medium');
      setTaskDate(today);
      setDueDate(today);
      setCompletedDate('');
      setHoursSpent('0');
      setManagerFeedback('');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialTask?.id, isOpen]);

  if (!isOpen) return null;

  const liveElapsedSeconds = initialTask
    ? getTaskElapsedSeconds(initialTask, nowMs)
    : 0;
  const liveAutoHours = initialTask ? secondsToHours(liveElapsedSeconds) : 0;
  const canToggleExistingTimer =
    Boolean(initialTask) &&
    initialTask?.status === 'in_progress' &&
    status === 'in_progress' &&
    !initialTask?.is_deleted &&
    Boolean(onToggleTimer);

  const handleStatusSelectChange = (nextStatus: TaskStatus) => {
    setStatus(nextStatus);
    if (nextStatus === 'completed' && !completedDate) {
      setCompletedDate(today);
    } else if (nextStatus !== 'completed') {
      setCompletedDate('');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    setSubmitting(true);
    try {
      await onSave({
        id: initialTask?.id,
        employee_id: isManager ? employeeId : currentUser.id,
        title: title.trim(),
        description: description.trim(),
        project_name: projectName.trim() || null,
        category: isManager ? category : currentUser.department || 'General',
        status,
        priority,
        task_date: taskDate,
        due_date: dueDate ? dueDate : null,
        completed_date: completedDate ? completedDate : null,
        hours_spent:
          isManager && manualOverride
            ? Math.max(0, parseFloat(hoursSpent) || 0)
            : liveAutoHours,
        manual_hours_override: isManager && manualOverride,
        manager_feedback: isManager
          ? managerFeedback.trim() || null
          : initialTask?.manager_feedback || null,
      });
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center">
              <ClipboardList className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                {initialTask
                  ? 'Update Task Record'
                  : isManager
                  ? 'Assign or Log Employee Task'
                  : 'Log Daily Task'}
              </h2>
              <p className="text-xs text-slate-500">
                {isManager
                  ? 'Managers can assign tasks to any employee and provide feedback'
                  : `Logging task under your account (${currentUser.full_name})`}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4 flex-1">
          {isManager ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">
                  Assigned Employee
                </label>
                <CustomSelect
                  value={employeeId}
                  onChange={(nextEmpId) => {
                    setEmployeeId(nextEmpId);
                    if (!initialTask) {
                      const emp = employees.find((e) => e.id === nextEmpId);
                      if (emp?.department) {
                        setCategory(emp.department);
                      }
                    }
                  }}
                  placeholder="Select employee..."
                  options={employees.map((emp) => ({
                    value: emp.id,
                    label: emp.full_name,
                    sublabel: `${emp.department} • ${emp.role}`,
                  }))}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">
                  Assigned Project
                </label>
                <CustomSelect
                  value={projectName}
                  onChange={setProjectName}
                  icon={<FolderKanban className="w-4 h-4" />}
                  placeholder="— No Project Assigned —"
                  options={[
                    { value: '', label: '— No Project Assigned —' },
                    ...projectOptions.map((proj) => ({
                      value: proj,
                      label: proj,
                    })),
                  ]}
                />
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="p-3 rounded-xl bg-indigo-50/70 border border-indigo-100 flex items-center gap-2.5 text-xs text-indigo-900">
                <UserCheck className="w-4 h-4 text-indigo-600 shrink-0" />
                <span>
                  Employee Task Owner: <strong>{currentUser.full_name}</strong> ({currentUser.department})
                </span>
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">
                  Project
                </label>
                <CustomSelect
                  value={projectName}
                  onChange={setProjectName}
                  icon={<FolderKanban className="w-4 h-4" />}
                  placeholder="— No Project Assigned —"
                  options={[
                    { value: '', label: '— No Project Assigned —' },
                    ...projectOptions.map((proj) => ({
                      value: proj,
                      label: proj,
                    })),
                  ]}
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">
              Task Title *
            </label>
            <input
              type="text"
              required
              placeholder="e.g., Completed Q3 financial reconciliation report"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">
              Work Description / Progress Notes
            </label>
            <textarea
              rows={3}
              placeholder="Describe what was accomplished, deliverables links, or any blockers..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">
                Department
              </label>
              {isManager ? (
                <CustomSelect
                  value={category}
                  onChange={setCategory}
                  placeholder={
                    category ? `${category} (not in list)` : 'Select department...'
                  }
                  options={departmentOptions.map((cat) => ({
                    value: cat,
                    label: cat,
                  }))}
                />
              ) : (
                <div className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm font-medium text-slate-700 truncate">
                  {currentUser.department || 'General'}
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">
                Status
              </label>
              <CustomSelect
                value={status}
                onChange={(val) => handleStatusSelectChange(val as TaskStatus)}
                options={[
                  { value: 'todo', label: 'To Do' },
                  { value: 'in_progress', label: 'In Progress' },
                  { value: 'review', label: 'For Review' },
                  { value: 'completed', label: 'Completed' },
                  { value: 'blocked', label: 'Blocked' },
                ]}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">
                Priority
              </label>
              <CustomSelect
                value={priority}
                onChange={(val) => setPriority(val as TaskPriority)}
                options={[
                  { value: 'low', label: 'Low' },
                  { value: 'medium', label: 'Medium' },
                  { value: 'high', label: 'High' },
                  { value: 'urgent', label: 'Urgent' },
                ]}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">
                Task Log Date
              </label>
              <input
                type="date"
                required
                value={taskDate}
                onChange={(e) => setTaskDate(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">
                Due Date
              </label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-emerald-700 mb-1.5">
                Date Completed
              </label>
              <input
                type="date"
                value={completedDate}
                onChange={(e) => {
                  const val = e.target.value;
                  setCompletedDate(val);
                  if (val && status !== 'completed') {
                    setStatus('completed');
                  }
                }}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                  <Timer className="w-3.5 h-3.5 text-indigo-600" />
                  Hours Logged (Auto)
                </label>
                {isManager && (
                  <button
                    type="button"
                    onClick={() => {
                      if (!manualOverride) {
                        setHoursSpent(liveAutoHours.toFixed(2));
                      }
                      setManualOverride((prev) => !prev);
                    }}
                    className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 underline cursor-pointer"
                  >
                    {manualOverride ? 'Use Auto Timer' : 'Manual Override'}
                  </button>
                )}
              </div>

              {isManager && manualOverride ? (
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  max="999.99"
                  value={hoursSpent}
                  onChange={(e) => setHoursSpent(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-indigo-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              ) : (
                <div className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-between gap-2 min-h-[42px]">
                  <div className="flex items-center gap-2 min-w-0">
                    <Clock className="w-4 h-4 text-indigo-600 shrink-0" />
                    <span className="text-sm font-bold text-slate-900">
                      {liveAutoHours.toFixed(2)} hrs
                    </span>
                    {initialTask && (
                      <span
                        className={`px-1.5 py-0.5 rounded font-mono text-[11px] font-semibold border ${
                          initialTask.is_timer_running && status === 'in_progress'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : 'bg-white text-slate-600 border-slate-200'
                        }`}
                      >
                        {formatTimerDuration(liveElapsedSeconds)}
                      </span>
                    )}
                  </div>

                  {canToggleExistingTimer && initialTask && onToggleTimer && (
                    <button
                      type="button"
                      onClick={() => onToggleTimer(initialTask.id)}
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition cursor-pointer shrink-0 ${
                        initialTask.is_timer_running
                          ? 'bg-white text-amber-700 border-amber-300 hover:bg-amber-50'
                          : 'bg-emerald-600 text-white border-emerald-600 hover:bg-emerald-700'
                      }`}
                    >
                      {initialTask.is_timer_running ? (
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
                  )}
                </div>
              )}

              <p className="text-[11px] text-slate-500 mt-1">
                {status === 'in_progress'
                  ? initialTask
                    ? initialTask.is_timer_running
                      ? 'Timer running — pause anytime or move to For Review to log hours.'
                      : 'Timer paused — click Continue to resume counting.'
                    : 'Timer will start counting automatically once saved as In Progress.'
                  : status === 'review'
                  ? 'Moving to For Review stops the timer and logs the accumulated hours.'
                  : status === 'completed'
                  ? 'Stops timer, logs final hours, and marks task as completed.'
                  : 'Timer starts automatically when status is set to In Progress.'}
              </p>
            </div>
          </div>

          {isManager && (
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-emerald-700 mb-1.5">
                Manager Review / Feedback (Visible to Employee)
              </label>
              <textarea
                rows={2}
                placeholder="Add guidance, review notes, or approval feedback..."
                value={managerFeedback}
                onChange={(e) => setManagerFeedback(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl border border-emerald-200 bg-emerald-50/40 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          )}

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-100 text-sm font-medium transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white text-sm font-semibold shadow-sm transition cursor-pointer"
            >
              {submitting
                ? 'Saving...'
                : initialTask
                ? 'Save Changes'
                : isManager
                ? 'Save & Assign Task'
                : 'Log Task'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

