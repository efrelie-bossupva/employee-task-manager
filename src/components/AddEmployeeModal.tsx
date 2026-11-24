import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  UserPlus,
  UserCheck,
  User,
  Mail,
  Lock,
  Building2,
  CheckCircle2,
  AlertCircle,
  Shield,
  FolderKanban,
} from 'lucide-react';
import { Profile, ProjectItem, UserRole, TASK_CATEGORIES } from '../types';
import { CustomSelect } from './CustomSelect';

interface AddEmployeeModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUserId: string;
  currentUserRole: UserRole;
  departments?: string[];
  projects?: ProjectItem[];
  initialAssignedProjectIds?: string[];
  editingProfile?: Profile | null;
  onCreateEmployee: (params: {
    email: string;
    password: string;
    fullName: string;
    department: string;
    role: UserRole;
    assignedProjectIds?: string[];
  }) => Promise<string | null>;
  onUpdateEmployee: (params: {
    userId: string;
    email: string;
    fullName: string;
    department: string;
    role: UserRole;
    newPassword?: string;
    assignedProjectIds?: string[];
  }) => Promise<string | null>;
}

export const AddEmployeeModal: React.FC<AddEmployeeModalProps> = ({
  isOpen,
  onClose,
  currentUserId,
  currentUserRole,
  departments = [],
  projects = [],
  initialAssignedProjectIds = [],
  editingProfile,
  onCreateEmployee,
  onUpdateEmployee,
}) => {
  const isSuperAdmin = currentUserRole === 'superadmin';
  const isManagerOrSuper =
    currentUserRole === 'manager' || currentUserRole === 'superadmin';
  const isEditing = Boolean(editingProfile);
  const isSelfEdit = Boolean(
    editingProfile && editingProfile.id === currentUserId
  );

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [department, setDepartment] = useState(
    departments[0] || (isSuperAdmin ? 'Operations' : 'Development')
  );
  const [role, setRole] = useState<UserRole>(
    isSuperAdmin ? 'manager' : 'employee'
  );
  const [selectedProjectIds, setSelectedProjectIds] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const departmentOptions = useMemo(() => {
    const base = departments.length > 0 ? departments : [...TASK_CATEGORIES];
    return Array.from(new Set<string>(base));
  }, [departments]);

  const activeProjects = useMemo(
    () => projects.filter((p) => p.status !== 'archived'),
    [projects]
  );

  useEffect(() => {
    if (isOpen) {
      if (editingProfile) {
        setFullName(editingProfile.full_name);
        setEmail(editingProfile.email);
        setDepartment(editingProfile.department || departments[0] || 'General');
        setRole(editingProfile.role);
        setPassword('');
        setSelectedProjectIds(initialAssignedProjectIds);
      } else {
        setFullName('');
        setEmail('');
        setPassword('');
        setRole(isSuperAdmin ? 'manager' : 'employee');
        setDepartment(
          departments[0] || (isSuperAdmin ? 'Operations' : 'Development')
        );
        setSelectedProjectIds([]);
      }
      setError(null);
      setSuccessMsg(null);
    }
  }, [
    isOpen,
    editingProfile,
    isSuperAdmin,
    departments,
    initialAssignedProjectIds,
  ]);

  const toggleProject = (projId: string) => {
    setSelectedProjectIds((prev) =>
      prev.includes(projId)
        ? prev.filter((id) => id !== projId)
        : [...prev, projId]
    );
  };

  if (!isOpen) return null;

  const canChangeRole =
    isSuperAdmin && !isSelfEdit && editingProfile?.role !== 'superadmin';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);
    setSubmitting(true);

    const assignedRole: UserRole = isEditing && editingProfile
      ? canChangeRole
        ? role
        : editingProfile.role
      : isSuperAdmin
      ? role
      : 'employee';

    try {
      if (isEditing && editingProfile) {
        const err = await onUpdateEmployee({
          userId: editingProfile.id,
          email: email.trim(),
          fullName: fullName.trim(),
          department: department.trim() || 'General',
          role: assignedRole,
          newPassword: password.trim() ? password.trim() : undefined,
          assignedProjectIds:
            isManagerOrSuper && !isSelfEdit ? selectedProjectIds : undefined,
        });

        if (err) {
          setError(err);
        } else {
          setSuccessMsg(
            isSelfEdit
              ? 'Your profile information has been updated successfully.'
              : `Account for ${fullName.trim()} (${email.trim()}) has been updated.`
          );
          setPassword('');
        }
      } else {
        const err = await onCreateEmployee({
          email: email.trim(),
          password,
          fullName: fullName.trim(),
          department: department.trim() || 'General',
          role: assignedRole,
          assignedProjectIds: isManagerOrSuper ? selectedProjectIds : undefined,
        });

        if (err) {
          setError(err);
        } else {
          setSuccessMsg(
            `${assignedRole.toUpperCase()} account created for ${fullName.trim()} (${email.trim()})! They can now sign in immediately.`
          );
          setFullName('');
          setEmail('');
          setPassword('');
          setSelectedProjectIds([]);
        }
      }
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
        className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg max-h-[92vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
          <div className="flex items-center gap-3">
            <div
              className={`w-9 h-9 rounded-xl text-white flex items-center justify-center shadow-xs ${
                isSelfEdit
                  ? 'bg-indigo-600'
                  : isSuperAdmin
                  ? 'bg-purple-600'
                  : 'bg-emerald-600'
              }`}
            >
              {isEditing ? (
                <UserCheck className="w-5 h-5" />
              ) : (
                <UserPlus className="w-5 h-5" />
              )}
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                {isSelfEdit
                  ? 'Edit My Profile & Password'
                  : isEditing
                  ? `Edit ${isSuperAdmin ? 'User' : 'Employee'} Account`
                  : isSuperAdmin
                  ? 'Add Manager / Employee Account'
                  : 'Add New Employee Account'}
              </h2>
              <p className="text-xs text-slate-500">
                {isSelfEdit
                  ? 'Update your personal details or change your password'
                  : isEditing
                  ? isSuperAdmin
                    ? 'Update profile details, role, or reset password'
                    : 'Update employee details or reset password'
                  : isSuperAdmin
                  ? 'Superadmin can provision Manager or Employee accounts'
                  : 'Managers can register Employee accounts'}
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
          {error && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{successMsg}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">
              Full Name *
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="text"
                required
                placeholder="e.g., Jordan Lee"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">
              Work Email *
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="email"
                required
                placeholder="jordan.lee@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">
              {isEditing ? (
                <>
                  New Password{' '}
                  <span className="font-normal normal-case tracking-normal text-slate-400">
                    (optional — leave blank to keep current)
                  </span>
                </>
              ) : (
                'Initial Password *'
              )}
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="password"
                required={!isEditing}
                minLength={6}
                placeholder={
                  isEditing
                    ? 'Leave blank to keep existing password'
                    : 'Minimum 6 characters'
                }
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">
                Account Role
              </label>
              {(!isEditing && isSuperAdmin) || canChangeRole ? (
                <CustomSelect
                  value={role}
                  onChange={(val) => setRole(val as UserRole)}
                  focusRingClass="focus:ring-purple-500 border-purple-500"
                  options={[
                    { value: 'manager', label: 'Manager' },
                    { value: 'employee', label: 'Employee' },
                  ]}
                />
              ) : (
                <div className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-between">
                  <span
                    className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase border ${
                      role === 'superadmin'
                        ? 'bg-purple-50 text-purple-700 border-purple-200'
                        : role === 'manager'
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : 'bg-indigo-50 text-indigo-700 border-indigo-200'
                    }`}
                  >
                    <Shield className="w-3 h-3" /> {role}
                  </span>
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">
                Department
              </label>
              {currentUserRole === 'manager' || currentUserRole === 'superadmin' ? (
                <CustomSelect
                  value={department}
                  onChange={setDepartment}
                  icon={<Building2 className="w-4 h-4" />}
                  placeholder={
                    department ? `${department} (not in list)` : 'Select department...'
                  }
                  options={departmentOptions.map((dept) => ({
                    value: dept,
                    label: dept,
                  }))}
                />
              ) : (
                <div className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 flex items-center gap-2.5 text-sm font-medium text-slate-700">
                  <Building2 className="w-4 h-4 text-slate-400 shrink-0" />
                  <span className="truncate">{department || 'General'}</span>
                </div>
              )}
            </div>
          </div>

          {isManagerOrSuper && !isSelfEdit && (
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700">
                  Assigned Projects{' '}
                  <span className="font-normal normal-case tracking-normal text-slate-400">
                    (select multiple)
                  </span>
                </label>
                {selectedProjectIds.length > 0 && (
                  <span className="text-[11px] font-semibold text-indigo-700">
                    {selectedProjectIds.length} selected
                  </span>
                )}
              </div>

              {activeProjects.length === 0 ? (
                <div className="p-3 rounded-xl border border-slate-200 bg-slate-50 text-xs text-slate-500">
                  No active projects yet. Create projects on the Projects page first.
                </div>
              ) : (
                <div className="max-h-40 overflow-y-auto p-2 rounded-xl border border-slate-200 bg-slate-50/70 grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                  {activeProjects.map((proj) => {
                    const checked = selectedProjectIds.includes(proj.id);
                    return (
                      <label
                        key={proj.id}
                        className={`flex items-center gap-2 px-2.5 py-2 rounded-lg border text-xs font-semibold transition cursor-pointer ${
                          checked
                            ? 'bg-indigo-50 border-indigo-300 text-indigo-800'
                            : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleProject(proj.id)}
                          className="w-3.5 h-3.5 rounded accent-[#8c4356] cursor-pointer shrink-0"
                        />
                        <FolderKanban className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                        <span className="truncate">{proj.name}</span>
                      </label>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-100 text-sm font-medium transition cursor-pointer"
            >
              Close
            </button>
            <button
              type="submit"
              disabled={submitting}
              className={`px-5 py-2.5 rounded-xl disabled:opacity-60 text-white text-sm font-semibold shadow-sm transition cursor-pointer ${
                isSelfEdit
                  ? 'bg-indigo-600 hover:bg-indigo-700'
                  : isSuperAdmin
                  ? 'bg-purple-600 hover:bg-purple-700'
                  : 'bg-emerald-600 hover:bg-emerald-700'
              }`}
            >
              {submitting
                ? isEditing
                  ? 'Saving Changes...'
                  : 'Creating Account...'
                : isEditing
                ? 'Save Changes'
                : isSuperAdmin
                ? `Create ${role.charAt(0).toUpperCase() + role.slice(1)}`
                : 'Create Employee'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
