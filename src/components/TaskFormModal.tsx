import React, { useState, useEffect } from 'react';
import { X, ClipboardList, UserCheck } from 'lucide-react';
import {
  Profile,
  TaskItem,
  TaskPriority,
  TaskStatus,
  TASK_CATEGORIES,
} from '../types';

interface TaskFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: Profile;
  employees: Profile[];
  initialTask?: TaskItem | null;
  onSave: (taskData: {
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
  }) => Promise<void>;
}

export const TaskFormModal: React.FC<TaskFormModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  employees,
  initialTask,
  onSave,
}) => {
  const isManager =
    currentUser.role === 'manager' ||
    currentUser.role === 'admin' ||
    currentUser.role === 'superadmin';
  const today = new Date().toISOString().split('T')[0];

  const [employeeId, setEmployeeId] = useState(currentUser.id);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<string>(TASK_CATEGORIES[0]);
  const [status, setStatus] = useState<TaskStatus>('in_progress');
  const [priority, setPriority] = useState<TaskPriority>('medium');
  const [taskDate, setTaskDate] = useState(today);
  const [dueDate, setDueDate] = useState('');
  const [hoursSpent, setHoursSpent] = useState('1.0');
  const [managerFeedback, setManagerFeedback] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (initialTask) {
      setEmployeeId(initialTask.employee_id);
      setTitle(initialTask.title);
      setDescription(initialTask.description);
      setCategory(initialTask.category || TASK_CATEGORIES[0]);
      setStatus(initialTask.status);
      setPriority(initialTask.priority);
      setTaskDate(initialTask.task_date);
      setDueDate(initialTask.due_date || '');
      setHoursSpent(String(initialTask.hours_spent ?? 0));
      setManagerFeedback(initialTask.manager_feedback || '');
    } else {
      const defaultEmp =
        isManager && employees.length > 0
          ? employees.find((e) => e.role === 'employee')?.id || currentUser.id
          : currentUser.id;
      setEmployeeId(defaultEmp);
      setTitle('');
      setDescription('');
      setCategory(TASK_CATEGORIES[0]);
      setStatus(isManager ? 'todo' : 'in_progress');
      setPriority('medium');
      setTaskDate(today);
      setDueDate(today);
      setHoursSpent(isManager ? '0' : '1.0');
      setManagerFeedback('');
    }
  }, [initialTask, isOpen, currentUser.id, isManager, employees, today]);

  if (!isOpen) return null;

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
        category,
        status,
        priority,
        task_date: taskDate,
        due_date: dueDate ? dueDate : null,
        hours_spent: Math.max(0, parseFloat(hoursSpent) || 0),
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-xl max-h-[92vh] flex flex-col overflow-hidden">
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
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">
                Assigned Employee
              </label>
              <select
                value={employeeId}
                onChange={(e) => setEmployeeId(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.full_name} ({emp.department} — {emp.role})
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div className="p-3 rounded-xl bg-indigo-50/70 border border-indigo-100 flex items-center gap-2.5 text-xs text-indigo-900">
              <UserCheck className="w-4 h-4 text-indigo-600 shrink-0" />
              <span>
                Employee Task Owner: <strong>{currentUser.full_name}</strong> ({currentUser.department})
              </span>
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

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">
                Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                {TASK_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">
                Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as TaskStatus)}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="todo">To Do</option>
                <option value="in_progress">In Progress</option>
                <option value="review">For Review</option>
                <option value="completed">Completed</option>
                <option value="blocked">Blocked</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">
                Priority
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as TaskPriority)}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
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
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">
                Hours Logged
              </label>
              <input
                type="number"
                step="0.25"
                min="0"
                max="100"
                value={hoursSpent}
                onChange={(e) => setHoursSpent(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
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

