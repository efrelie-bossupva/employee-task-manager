import React, { useState } from 'react';
import {
  X,
  Building2,
  FolderKanban,
  Plus,
  Trash2,
  AlertCircle,
  CheckCircle2,
  FolderCog,
} from 'lucide-react';
import { DepartmentItem, ProjectItem, ProjectStatus } from '../types';

interface SetupDirectoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  departments: DepartmentItem[];
  projects: ProjectItem[];
  onAddDepartment: (name: string) => Promise<string | null>;
  onDeleteDepartment: (id: string) => Promise<string | null>;
  onAddProject: (params: {
    name: string;
    description: string;
    status: ProjectStatus;
  }) => Promise<string | null>;
  onUpdateProjectStatus: (
    id: string,
    status: ProjectStatus
  ) => Promise<string | null>;
  onDeleteProject: (id: string) => Promise<string | null>;
}

const PROJECT_STATUS_STYLES: Record<
  ProjectStatus,
  { label: string; badgeClass: string }
> = {
  active: {
    label: 'Active',
    badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  },
  completed: {
    label: 'Completed',
    badgeClass: 'bg-blue-50 text-blue-700 border-blue-200',
  },
  archived: {
    label: 'Archived',
    badgeClass: 'bg-slate-100 text-slate-600 border-slate-200',
  },
};

export const SetupDirectoryModal: React.FC<SetupDirectoryModalProps> = ({
  isOpen,
  onClose,
  departments,
  projects,
  onAddDepartment,
  onDeleteDepartment,
  onAddProject,
  onUpdateProjectStatus,
  onDeleteProject,
}) => {
  const [activeTab, setActiveTab] = useState<'departments' | 'projects'>(
    'departments'
  );
  const [deptName, setDeptName] = useState('');
  const [projName, setProjName] = useState('');
  const [projDesc, setProjDesc] = useState('');
  const [projStatus, setProjStatus] = useState<ProjectStatus>('active');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleCreateDepartment = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = deptName.trim();
    if (!cleaned) return;
    setError(null);
    setSuccessMsg(null);
    setSubmitting(true);
    try {
      const err = await onAddDepartment(cleaned);
      if (err) {
        setError(err);
      } else {
        setDeptName('');
        setSuccessMsg(`Department / Category "${cleaned}" added.`);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleRemoveDepartment = async (dept: DepartmentItem) => {
    setError(null);
    setSuccessMsg(null);
    const err = await onDeleteDepartment(dept.id);
    if (err) {
      setError(err);
    } else {
      setSuccessMsg(`Removed "${dept.name}".`);
    }
  };

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = projName.trim();
    if (!cleaned) return;
    setError(null);
    setSuccessMsg(null);
    setSubmitting(true);
    try {
      const err = await onAddProject({
        name: cleaned,
        description: projDesc.trim(),
        status: projStatus,
      });
      if (err) {
        setError(err);
      } else {
        setProjName('');
        setProjDesc('');
        setProjStatus('active');
        setSuccessMsg(`Project "${cleaned}" added and ready to assign.`);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleRemoveProject = async (proj: ProjectItem) => {
    setError(null);
    setSuccessMsg(null);
    const err = await onDeleteProject(proj.id);
    if (err) {
      setError(err);
    } else {
      setSuccessMsg(`Removed project "${proj.name}".`);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-xs">
              <FolderCog className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Setup Departments & Projects
              </h2>
              <p className="text-xs text-slate-500">
                Configure categories/departments and projects so they are easy to select when assigning tasks or employees
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="px-6 pt-4 border-b border-slate-200 bg-white flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setActiveTab('departments');
              setError(null);
              setSuccessMsg(null);
            }}
            className={`inline-flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition cursor-pointer ${
              activeTab === 'departments'
                ? 'border-indigo-600 text-indigo-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Building2 className="w-4 h-4" />
            <span>Departments / Categories ({departments.length})</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab('projects');
              setError(null);
              setSuccessMsg(null);
            }}
            className={`inline-flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition cursor-pointer ${
              activeTab === 'projects'
                ? 'border-indigo-600 text-indigo-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <FolderKanban className="w-4 h-4" />
            <span>Projects ({projects.length})</span>
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-5">
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

          {activeTab === 'departments' ? (
            <>
              <form
                onSubmit={handleCreateDepartment}
                className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3"
              >
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                  Add New Department / Category
                </label>
                <div className="flex flex-col sm:flex-row gap-2">
                  <div className="relative flex-1">
                    <Building2 className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                    <input
                      type="text"
                      required
                      placeholder="e.g., Finance & Accounting, Human Resources, QA Testing"
                      value={deptName}
                      onChange={(e) => setDeptName(e.target.value)}
                      className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={submitting || !deptName.trim()}
                    className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white text-sm font-semibold shadow-xs transition cursor-pointer shrink-0"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Add Department</span>
                  </button>
                </div>
              </form>

              <div className="space-y-2">
                <div className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Configured Departments / Categories
                </div>
                {departments.length === 0 ? (
                  <p className="text-xs text-slate-400 italic py-4 text-center">
                    No departments configured yet. Add one above.
                  </p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {departments.map((dept) => (
                      <div
                        key={dept.id}
                        className="flex items-center justify-between gap-2 px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white hover:border-indigo-200 transition"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <Building2 className="w-4 h-4 text-indigo-500 shrink-0" />
                          <span className="text-sm font-semibold text-slate-800 truncate">
                            {dept.name}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveDepartment(dept)}
                          title={`Remove ${dept.name}`}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer shrink-0"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          ) : (
            <>
              <form
                onSubmit={handleCreateProject}
                className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3"
              >
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                  Add New Project
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <div className="relative sm:col-span-2">
                    <FolderKanban className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                    <input
                      type="text"
                      required
                      placeholder="e.g., Mobile App v3, ERP Migration"
                      value={projName}
                      onChange={(e) => setProjName(e.target.value)}
                      className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <select
                    value={projStatus}
                    onChange={(e) =>
                      setProjStatus(e.target.value as ProjectStatus)
                    }
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="active">Active</option>
                    <option value="completed">Completed</option>
                    <option value="archived">Archived</option>
                  </select>
                </div>
                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="text"
                    placeholder="Optional short project description..."
                    value={projDesc}
                    onChange={(e) => setProjDesc(e.target.value)}
                    className="flex-1 px-3.5 py-2 rounded-xl border border-slate-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <button
                    type="submit"
                    disabled={submitting || !projName.trim()}
                    className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white text-sm font-semibold shadow-xs transition cursor-pointer shrink-0"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Add Project</span>
                  </button>
                </div>
              </form>

              <div className="space-y-2">
                <div className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Configured Projects
                </div>
                {projects.length === 0 ? (
                  <p className="text-xs text-slate-400 italic py-4 text-center">
                    No projects configured yet. Add one above so it appears in task assignment dropdowns.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {projects.map((proj) => (
                      <div
                        key={proj.id}
                        className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3.5 rounded-xl border border-slate-200 bg-white hover:border-indigo-200 transition"
                      >
                        <div className="min-w-0 space-y-0.5">
                          <div className="flex items-center gap-2">
                            <FolderKanban className="w-4 h-4 text-indigo-600 shrink-0" />
                            <span className="text-sm font-bold text-slate-900 truncate">
                              {proj.name}
                            </span>
                          </div>
                          {proj.description && (
                            <p className="text-xs text-slate-500 pl-6 line-clamp-1">
                              {proj.description}
                            </p>
                          )}
                        </div>

                        <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                          <select
                            aria-label={`Status for ${proj.name}`}
                            value={proj.status}
                            onChange={(e) =>
                              onUpdateProjectStatus(
                                proj.id,
                                e.target.value as ProjectStatus
                              )
                            }
                            className={`px-2.5 py-1 rounded-full text-xs font-semibold border cursor-pointer focus:outline-none ${
                              PROJECT_STATUS_STYLES[proj.status].badgeClass
                            }`}
                          >
                            <option value="active">Active</option>
                            <option value="completed">Completed</option>
                            <option value="archived">Archived</option>
                          </select>
                          <button
                            type="button"
                            onClick={() => handleRemoveProject(proj)}
                            title={`Remove ${proj.name}`}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-slate-200 bg-slate-50 flex items-center justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold transition cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
