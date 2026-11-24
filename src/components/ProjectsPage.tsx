import React, { useState, useMemo } from 'react';
import {
  FolderKanban,
  Plus,
  Search,
  Edit3,
  Trash2,
  Check,
  X,
  AlertCircle,
  CheckCircle2,
  Users,
  UserPlus,
  ClipboardList,
  ArrowRight,
} from 'lucide-react';
import {
  Profile,
  ProjectItem,
  ProjectMember,
  ProjectStatus,
  TaskItem,
} from '../types';

interface ProjectsPageProps {
  projects: ProjectItem[];
  tasks: TaskItem[];
  employees: Profile[];
  projectMembers: ProjectMember[];
  onAddProject: (params: {
    name: string;
    description: string;
    status: ProjectStatus;
  }) => Promise<string | null>;
  onUpdateProject: (params: {
    id: string;
    oldName: string;
    name: string;
    description: string;
    status: ProjectStatus;
  }) => Promise<string | null>;
  onDeleteProject: (id: string) => Promise<string | null>;
  onSetProjectMembers: (
    projectId: string,
    employeeIds: string[]
  ) => Promise<string | null>;
  onInspectProjectTasks: (projectName: string) => void;
}

const PROJECT_STATUS_STYLES: Record<
  ProjectStatus,
  { label: string; badgeClass: string; dotClass: string }
> = {
  active: {
    label: 'Active',
    badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    dotClass: 'bg-emerald-500',
  },
  completed: {
    label: 'Completed',
    badgeClass: 'bg-blue-50 text-blue-700 border-blue-200',
    dotClass: 'bg-blue-500',
  },
  archived: {
    label: 'Archived',
    badgeClass: 'bg-slate-100 text-slate-600 border-slate-200',
    dotClass: 'bg-slate-400',
  },
};

export const ProjectsPage: React.FC<ProjectsPageProps> = ({
  projects,
  tasks,
  employees,
  projectMembers,
  onAddProject,
  onUpdateProject,
  onDeleteProject,
  onSetProjectMembers,
  onInspectProjectTasks,
}) => {
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newStatus, setNewStatus] = useState<ProjectStatus>('active');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | ProjectStatus>('all');

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editStatus, setEditStatus] = useState<ProjectStatus>('active');

  // Assign Employees Modal state
  const [assigningProject, setAssigningProject] = useState<ProjectItem | null>(
    null
  );
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);
  const [memberSearch, setMemberSearch] = useState('');

  const [pendingDelete, setPendingDelete] = useState<ProjectItem | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const openAssignModal = (proj: ProjectItem) => {
    setError(null);
    setSuccessMsg(null);
    setAssigningProject(proj);
    setMemberSearch('');
    const currentIds = projectMembers
      .filter((m) => m.project_id === proj.id)
      .map((m) => m.employee_id);
    setSelectedMemberIds(currentIds);
  };

  const toggleMember = (empId: string) => {
    setSelectedMemberIds((prev) =>
      prev.includes(empId)
        ? prev.filter((id) => id !== empId)
        : [...prev, empId]
    );
  };

  const handleSaveMembers = async () => {
    if (!assigningProject) return;
    setError(null);
    setSuccessMsg(null);
    setSubmitting(true);
    try {
      const target = assigningProject;
      const err = await onSetProjectMembers(target.id, selectedMemberIds);
      if (err) {
        setError(err);
      } else {
        setAssigningProject(null);
        setSuccessMsg(
          `Updated assigned employees for "${target.name}" (${selectedMemberIds.length} assigned).`
        );
      }
    } finally {
      setSubmitting(false);
    }
  };

  const filteredProjects = useMemo(() => {
    const q = search.trim().toLowerCase();
    return projects.filter((p) => {
      if (statusFilter !== 'all' && p.status !== statusFilter) return false;
      if (q) {
        const matchName = p.name.toLowerCase().includes(q);
        const matchDesc = (p.description || '').toLowerCase().includes(q);
        if (!matchName && !matchDesc) return false;
      }
      return true;
    });
  }, [projects, search, statusFilter]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = newName.trim();
    if (!cleaned) return;
    setError(null);
    setSuccessMsg(null);
    setSubmitting(true);
    try {
      const err = await onAddProject({
        name: cleaned,
        description: newDesc.trim(),
        status: newStatus,
      });
      if (err) {
        setError(err);
      } else {
        setNewName('');
        setNewDesc('');
        setNewStatus('active');
        setSuccessMsg(`Project "${cleaned}" has been added.`);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleStartEdit = (proj: ProjectItem) => {
    setError(null);
    setSuccessMsg(null);
    setEditingId(proj.id);
    setEditName(proj.name);
    setEditDesc(proj.description || '');
    setEditStatus(proj.status);
  };

  const handleSaveEdit = async (proj: ProjectItem) => {
    const cleaned = editName.trim();
    if (!cleaned) {
      setError('Project name cannot be empty.');
      return;
    }
    setError(null);
    setSuccessMsg(null);
    setSubmitting(true);
    try {
      const err = await onUpdateProject({
        id: proj.id,
        oldName: proj.name,
        name: cleaned,
        description: editDesc.trim(),
        status: editStatus,
      });
      if (err) {
        setError(err);
      } else {
        setEditingId(null);
        setSuccessMsg(`Project "${cleaned}" has been updated.`);
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
      const err = await onDeleteProject(target.id);
      if (err) {
        setError(err);
      } else {
        setSuccessMsg(`Project "${target.name}" was deleted.`);
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
              <FolderKanban className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Projects Management
              </h2>
              <p className="text-xs text-slate-500">
                Add, view, edit, or delete projects so managers and employees can easily assign and track project work
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            <div className="relative sm:w-56">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search projects..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <select
              aria-label="Filter projects by status"
              value={statusFilter}
              onChange={(e) =>
                setStatusFilter(e.target.value as 'all' | ProjectStatus)
              }
              className="px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="all">All Statuses</option>
              <option value="active">Active</option>
              <option value="completed">Completed</option>
              <option value="archived">Archived</option>
            </select>
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
          className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2.5"
        >
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5">
            <div className="relative sm:col-span-2">
              <FolderKanban className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="text"
                required
                placeholder="Project name (e.g., Mobile App v3, ERP Migration)..."
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <select
              value={newStatus}
              onChange={(e) => setNewStatus(e.target.value as ProjectStatus)}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="active">Active</option>
              <option value="completed">Completed</option>
              <option value="archived">Archived</option>
            </select>

            <button
              type="submit"
              disabled={submitting || !newName.trim()}
              className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white text-sm font-semibold shadow-xs transition cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Add Project</span>
            </button>
          </div>

          <input
            type="text"
            placeholder="Optional project description or goals..."
            value={newDesc}
            onChange={(e) => setNewDesc(e.target.value)}
            className="w-full px-3.5 py-2 rounded-xl border border-slate-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </form>
      </div>

      {/* Projects Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        {filteredProjects.length === 0 ? (
          <div className="p-12 text-center space-y-2">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
              <FolderKanban className="w-6 h-6" />
            </div>
            <div className="text-sm font-bold text-slate-800">
              No projects found
            </div>
            <p className="text-xs text-slate-500">
              {search || statusFilter !== 'all'
                ? 'Try adjusting your search or status filter.'
                : 'Add your first project above so you can assign employees and tasks to it.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/80 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  <th className="py-3.5 px-5">Project Details</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4">Assigned Members</th>
                  <th className="py-3.5 px-4">Tasks</th>
                  <th className="py-3.5 px-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-sm">
                {filteredProjects.map((proj) => {
                  const isEditing = editingId === proj.id;
                  const projTasks = tasks.filter(
                    (t) =>
                      !t.is_deleted &&
                      (t.project_name || '').trim().toLowerCase() ===
                        proj.name.trim().toLowerCase()
                  );
                  const completedTasks = projTasks.filter(
                    (t) => t.status === 'completed'
                  ).length;
                  const assignedIds = projectMembers
                    .filter((m) => m.project_id === proj.id)
                    .map((m) => m.employee_id);
                  const assignedProfiles = employees.filter((e) =>
                    assignedIds.includes(e.id)
                  );
                  const statusCfg = PROJECT_STATUS_STYLES[proj.status];

                  return (
                    <tr key={proj.id} className="hover:bg-slate-50/80 transition">
                      <td className="py-3.5 px-5 max-w-md">
                        {isEditing ? (
                          <div className="space-y-2">
                            <input
                              type="text"
                              value={editName}
                              onChange={(e) => setEditName(e.target.value)}
                              autoFocus
                              placeholder="Project name"
                              className="w-full px-3 py-1.5 rounded-lg border border-indigo-400 bg-white text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            />
                            <input
                              type="text"
                              value={editDesc}
                              onChange={(e) => setEditDesc(e.target.value)}
                              placeholder="Short description (optional)"
                              className="w-full px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            />
                          </div>
                        ) : (
                          <div className="flex items-start gap-2.5">
                            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0 mt-0.5">
                              <FolderKanban className="w-4 h-4" />
                            </div>
                            <div className="min-w-0">
                              <div className="font-bold text-slate-900">
                                {proj.name}
                              </div>
                              <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">
                                {proj.description || 'No description added.'}
                              </p>
                            </div>
                          </div>
                        )}
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {isEditing ? (
                          <select
                            value={editStatus}
                            onChange={(e) =>
                              setEditStatus(e.target.value as ProjectStatus)
                            }
                            className="px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          >
                            <option value="active">Active</option>
                            <option value="completed">Completed</option>
                            <option value="archived">Archived</option>
                          </select>
                        ) : (
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${statusCfg.badgeClass}`}
                          >
                            <span
                              className={`w-2 h-2 rounded-full ${statusCfg.dotClass}`}
                            />
                            {statusCfg.label}
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 max-w-xs">
                        <div className="flex flex-wrap items-center gap-1.5">
                          {assignedProfiles.slice(0, 3).map((emp) => (
                            <span
                              key={emp.id}
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 text-[11px] font-semibold"
                            >
                              {emp.full_name}
                            </span>
                          ))}
                          {assignedProfiles.length > 3 && (
                            <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[11px] font-semibold">
                              +{assignedProfiles.length - 3} more
                            </span>
                          )}
                          <button
                            type="button"
                            onClick={() => openAssignModal(proj)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-indigo-200 bg-white hover:bg-indigo-50 text-indigo-700 text-[11px] font-semibold transition cursor-pointer"
                          >
                            <UserPlus className="w-3 h-3" />
                            <span>
                              {assignedProfiles.length > 0 ? 'Manage' : 'Assign'}
                            </span>
                          </button>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => onInspectProjectTasks(proj.name)}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-semibold transition cursor-pointer"
                          title={`View tasks in ${proj.name}`}
                        >
                          <ClipboardList className="w-3.5 h-3.5" />
                          <span>
                            {projTasks.length} ({completedTasks} done)
                          </span>
                          <ArrowRight className="w-3 h-3" />
                        </button>
                      </td>

                      <td className="py-3.5 px-5 text-right whitespace-nowrap">
                        <div className="inline-flex items-center justify-end gap-1.5">
                          {isEditing ? (
                            <>
                              <button
                                type="button"
                                disabled={submitting}
                                onClick={() => handleSaveEdit(proj)}
                                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold cursor-pointer"
                              >
                                <Check className="w-3.5 h-3.5" />
                                <span>Save</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => setEditingId(null)}
                                className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-100 cursor-pointer"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                type="button"
                                onClick={() => handleStartEdit(proj)}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 text-slate-700 hover:text-indigo-700 hover:bg-indigo-50 hover:border-indigo-200 text-xs font-semibold transition cursor-pointer"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                                <span>Edit</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => setPendingDelete(proj)}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-200 text-xs font-semibold transition cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                <span>Delete</span>
                              </button>
                            </>
                          )}
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

      {/* Assign Employees to Project Modal */}
      {assigningProject && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4"
          onClick={() => !submitting && setAssigningProject(null)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg max-h-[88vh] flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-xs">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Assign Employees to Project
                  </h3>
                  <p className="text-xs text-slate-500">
                    {assigningProject.name} • {selectedMemberIds.length} selected
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => !submitting && setAssigningProject(null)}
                className="p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-3 overflow-y-auto flex-1">
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    placeholder="Search employees by name, email, or department..."
                    value={memberSearch}
                    onChange={(e) => setMemberSearch(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <button
                  type="button"
                  onClick={() =>
                    setSelectedMemberIds(
                      selectedMemberIds.length === employees.length
                        ? []
                        : employees.map((e) => e.id)
                    )
                  }
                  className="px-3 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-xs font-semibold text-slate-700 transition cursor-pointer shrink-0"
                >
                  {selectedMemberIds.length === employees.length
                    ? 'Clear All'
                    : 'Select All'}
                </button>
              </div>

              <div className="space-y-1.5">
                {employees
                  .filter((emp) => {
                    const q = memberSearch.trim().toLowerCase();
                    if (!q) return true;
                    return (
                      emp.full_name.toLowerCase().includes(q) ||
                      emp.email.toLowerCase().includes(q) ||
                      emp.department.toLowerCase().includes(q)
                    );
                  })
                  .map((emp) => {
                    const checked = selectedMemberIds.includes(emp.id);
                    return (
                      <label
                        key={emp.id}
                        className={`flex items-center justify-between gap-3 p-3 rounded-xl border transition cursor-pointer ${
                          checked
                            ? 'bg-indigo-50/70 border-indigo-300'
                            : 'bg-white border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleMember(emp.id)}
                            className="w-4 h-4 rounded accent-[#8c4356] cursor-pointer shrink-0"
                          />
                          <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white text-xs font-bold flex items-center justify-center shrink-0">
                            {emp.full_name
                              .split(' ')
                              .map((n) => n[0])
                              .join('')
                              .slice(0, 2)}
                          </div>
                          <div className="min-w-0">
                            <div className="text-sm font-bold text-slate-900 truncate">
                              {emp.full_name}
                            </div>
                            <div className="text-xs text-slate-500 truncate">
                              {emp.department} • {emp.email}
                            </div>
                          </div>
                        </div>

                        <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[10px] font-bold uppercase shrink-0">
                          {emp.role}
                        </span>
                      </label>
                    );
                  })}
              </div>
            </div>

            <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2">
              <button
                type="button"
                disabled={submitting}
                onClick={() => setAssigningProject(null)}
                className="px-4 py-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={handleSaveMembers}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs cursor-pointer disabled:opacity-60"
              >
                <Check className="w-3.5 h-3.5" />
                <span>{submitting ? 'Saving...' : 'Save Assignments'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

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
                    Delete Project
                  </h3>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Are you sure you want to delete project{' '}
                    <strong className="text-slate-900">
                      "{pendingDelete.name}"
                    </strong>
                    ? Existing tasks will remain intact in the task log.
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
                <span>{submitting ? 'Deleting...' : 'Delete Project'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
