import React, { useState, useEffect } from 'react';
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
} from 'lucide-react';
import { Profile, UserRole } from '../types';

interface AddEmployeeModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUserId: string;
  currentUserRole: UserRole;
  editingProfile?: Profile | null;
  onCreateEmployee: (params: {
    email: string;
    password: string;
    fullName: string;
    department: string;
    role: UserRole;
  }) => Promise<string | null>;
  onUpdateEmployee: (params: {
    userId: string;
    email: string;
    fullName: string;
    department: string;
    role: UserRole;
    newPassword?: string;
  }) => Promise<string | null>;
}

export const AddEmployeeModal: React.FC<AddEmployeeModalProps> = ({
  isOpen,
  onClose,
  currentUserId,
  currentUserRole,
  editingProfile,
  onCreateEmployee,
  onUpdateEmployee,
}) => {
  const isSuperAdmin = currentUserRole === 'superadmin';
  const isEditing = Boolean(editingProfile);
  const isSelfEdit = Boolean(
    editingProfile && editingProfile.id === currentUserId
  );

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [department, setDepartment] = useState(
    isSuperAdmin ? 'Operations & Management' : 'Development'
  );
  const [role, setRole] = useState<UserRole>(
    isSuperAdmin ? 'manager' : 'employee'
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      if (editingProfile) {
        setFullName(editingProfile.full_name);
        setEmail(editingProfile.email);
        setDepartment(editingProfile.department || 'General');
        setRole(editingProfile.role);
        setPassword('');
      } else {
        setFullName('');
        setEmail('');
        setPassword('');
        setRole(isSuperAdmin ? 'manager' : 'employee');
        setDepartment(isSuperAdmin ? 'Operations & Management' : 'Development');
      }
      setError(null);
      setSuccessMsg(null);
    }
  }, [isOpen, editingProfile, isSuperAdmin]);

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
        }
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden flex flex-col">
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
                  ? 'Setup Manager / Admin Account'
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
                  ? 'Superadmin can provision Manager, Admin, or Employee accounts'
                  : 'Managers & Admins can register Employee accounts'}
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
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
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
              {isEditing
                ? 'New Password (Optional — leave blank to keep current)'
                : 'Initial Password *'}
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

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">
                Account Role
              </label>
              {(!isEditing && isSuperAdmin) || canChangeRole ? (
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as UserRole)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="manager">Manager</option>
                  <option value="admin">Admin</option>
                  <option value="employee">Employee</option>
                </select>
              ) : (
                <div className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-between">
                  <span
                    className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase border ${
                      role === 'superadmin'
                        ? 'bg-purple-50 text-purple-700 border-purple-200'
                        : role === 'manager' || role === 'admin'
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
              <div className="relative">
                <Building2 className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="text"
                  required
                  placeholder="e.g., Operations"
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  className="w-full pl-10 pr-3 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>
          </div>

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
