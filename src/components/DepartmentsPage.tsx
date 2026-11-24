import React, { useState, useMemo } from 'react';
import {
  Building2,
  Plus,
  Search,
  Edit3,
  Trash2,
  Check,
  X,
  AlertCircle,
  CheckCircle2,
  Users,
  ClipboardList,
} from 'lucide-react';
import { DepartmentItem, Profile, TaskItem } from '../types';

interface DepartmentsPageProps {
  departments: DepartmentItem[];
  profiles: Profile[];
  tasks: TaskItem[];
  onAddDepartment: (name: string) => Promise<string | null>;
  onUpdateDepartment: (
    id: string,
    oldName: string,
    newName: string
  ) => Promise<string | null>;
  onDeleteDepartment: (id: string) => Promise<string | null>;
}

export const DepartmentsPage: React.FC<DepartmentsPageProps> = ({
  departments,
  profiles,
  tasks,
  onAddDepartment,
  onUpdateDepartment,
  onDeleteDepartment,
}) => {
  const [newName, setNewName] = useState('');
  const [search, setSearch] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [pendingDelete, setPendingDelete] = useState<DepartmentItem | null>(
    null
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const filteredDepartments = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return departments;
    return departments.filter((d) => d.name.toLowerCase().includes(q));
  }, [departments, search]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = newName.trim();
    if (!cleaned) return;
    setError(null);
    setSuccessMsg(null);
    setSubmitting(true);
    try {
      const err = await onAddDepartment(cleaned);
      if (err) {
        setError(err);
      } else {
        setNewName('');
        setSuccessMsg(`Department "${cleaned}" has been added.`);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleStartEdit = (dept: DepartmentItem) => {
    setError(null);
    setSuccessMsg(null);
    setEditingId(dept.id);
    setEditingName(dept.name);
  };

  const handleSaveEdit = async (dept: DepartmentItem) => {
    const cleaned = editingName.trim();
    if (!cleaned) {
      setError('Department name cannot be empty.');
      return;
    }
    if (cleaned === dept.name) {
      setEditingId(null);
      return;
    }
    setError(null);
    setSuccessMsg(null);
    setSubmitting(true);
    try {
      const err = await onUpdateDepartment(dept.id, dept.name, cleaned);
      if (err) {
        setError(err);
      } else {
        setEditingId(null);
        setSuccessMsg(`Renamed "${dept.name}" to "${cleaned}".`);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!pendingDelete) return;
    setError(null);
    setSuccessMsg(null);
    setSubmitting(true);
    try {
      const target = pendingDelete;
      const err = await onDeleteDepartment(target.id);
      if (err) {
        setError(err);
      } else {
        setSuccessMsg(`Department "${target.name}" was deleted.`);
        setPendingDelete(null);
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Header & Add Form */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-xs">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Departments & Categories Management
              </h2>
              <p className="text-xs text-slate-500">
                Add, view, rename, or delete departments/categories used across employee profiles and task assignments
              </p>
            </div>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search departments..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {successMsg && (
          <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{successMsg}</span>
          </div>
        )}

        <form
          onSubmit={handleAdd}
          className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row gap-2.5"
        >
          <div className="relative flex-1">
            <Building2 className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              required
              placeholder="Enter new department / category name (e.g., Finance, QA Testing, HR)..."
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <button
            type="submit"
            disabled={submitting || !newName.trim()}
            className="inline-flex items-center justify-center gap-1.5 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white text-sm font-semibold shadow-xs transition cursor-pointer shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Add Department</span>
          </button>
        </form>
      </div>

      {/* Departments Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        {filteredDepartments.length === 0 ? (
          <div className="p-12 text-center space-y-2">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
              <Building2 className="w-6 h-6" />
            </div>
            <div className="text-sm font-bold text-slate-800">
              No departments found
            </div>
            <p className="text-xs text-slate-500">
              {search
                ? 'Try clearing your search query.'
                : 'Add your first department above to make it available in dropdowns.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/80 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  <th className="py-3.5 px-5">Department / Category</th>
                  <th className="py-3.5 px-4">Employees</th>
                  <th className="py-3.5 px-4">Active Tasks</th>
                  <th className="py-3.5 px-4">Created</th>
                  <th className="py-3.5 px-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-sm">
                {filteredDepartments.map((dept) => {
                  const isEditing = editingId === dept.id;
                  const empCount = profiles.filter(
                    (p) =>
                      p.department.trim().toLowerCase() ===
                      dept.name.trim().toLowerCase()
                  ).length;
                  const taskCount = tasks.filter(
                    (t) =>
                      !t.is_deleted &&
                      t.category.trim().toLowerCase() ===
                        dept.name.trim().toLowerCase()
                  ).length;

                  return (
                    <tr key={dept.id} className="hover:bg-slate-50/80 transition">
                      <td className="py-3.5 px-5">
                        {isEditing ? (
                          <div className="flex items-center gap-2 max-w-md">
                            <input
                              type="text"
                              value={editingName}
                              onChange={(e) => setEditingName(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  handleSaveEdit(dept);
                                } else if (e.key === 'Escape') {
                                  setEditingId(null);
                                }
                              }}
                              autoFocus
                              className="flex-1 px-3 py-1.5 rounded-lg border border-indigo-400 bg-white text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            />
                            <button
                              type="button"
                              disabled={submitting}
                              onClick={() => handleSaveEdit(dept)}
                              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold cursor-pointer"
                            >
                              <Check className="w-3.5 h-3.5" />
                              Save
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingId(null)}
                              className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-100 cursor-pointer"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                              <Building2 className="w-4 h-4" />
                            </div>
                            <span className="font-bold text-slate-900">
                              {dept.name}
                            </span>
                          </div>
                        )}
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 text-xs font-semibold">
                          <Users className="w-3.5 h-3.5 text-slate-500" />
                          {empCount}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-700 text-xs font-semibold">
                          <ClipboardList className="w-3.5 h-3.5" />
                          {taskCount}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap text-xs text-slate-500">
                        {new Date(dept.created_at).toLocaleDateString([], {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                        })}
                      </td>

                      <td className="py-3.5 px-5 text-right whitespace-nowrap">
                        <div className="inline-flex items-center justify-end gap-1.5">
                          {!isEditing && (
                            <button
                              type="button"
                              onClick={() => handleStartEdit(dept)}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 text-slate-700 hover:text-indigo-700 hover:bg-indigo-50 hover:border-indigo-200 text-xs font-semibold transition cursor-pointer"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                              <span>Edit</span>
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => setPendingDelete(dept)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-200 text-xs font-semibold transition cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Delete</span>
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

      {/* Delete Confirmation Modal */}
      {pendingDelete && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4"
          onClick={() => !submitting && setPendingDelete(null)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 space-y-3">
              <div className="flex items-start gap-3.5">
                <div className="w-11 h-11 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                  <Trash2 className="w-5 h-5" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-base font-bold text-slate-900">
                    Delete Department
                  </h3>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Are you sure you want to remove{' '}
                    <strong className="text-slate-900">
                      "{pendingDelete.name}"
                    </strong>{' '}
                    from the departments list? Existing tasks and employee records will keep their saved label.
                  </p>
                </div>
              </div>
            </div>
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2">
              <button
                type="button"
                disabled={submitting}
                onClick={() => setPendingDelete(null)}
                className="px-4 py-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={handleConfirmDelete}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold cursor-pointer disabled:opacity-60"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{submitting ? 'Deleting...' : 'Delete Department'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
