import React, { useState } from 'react';
import { db } from '../../../db/storage';
import { useAuth } from '../../../context/AuthContext';
import { useToast } from '../../../context/ToastContext';
import { User, UserRole } from '../../../types';
import { PageHeader } from '../../layout/PageHeader';
import { Modal } from '../../common/Modal';
import { StatusBadge } from '../../common/Badge';
import {
  ShieldAlert,
  Plus,
  Edit,
  KeyRound,
  ShieldCheck,
  UserCheck,
  UserX,
  Search,
} from 'lucide-react';

export const UserManagement: React.FC = () => {
  const { user, isSuperAdmin, isSchoolAdmin } = useAuth();
  const toast = useToast();

  const [refreshKey, setRefreshKey] = useState(0);
  const reload = () => setRefreshKey((p) => p + 1);

  const allUsers = db.getUsers();
  const roles = db.getRoles();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRole, setSelectedRole] = useState<string>('ALL');

  // Modal states
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [userToEdit, setUserToEdit] = useState<User | null>(null);
  const [userToResetPassword, setUserToResetPassword] = useState<User | null>(null);
  const [adminNewPassword, setAdminNewPassword] = useState('');

  // Form states
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>('teacher');
  const [isActive, setIsActive] = useState(true);

  const filteredUsers = allUsers.filter((u) => {
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      if (!u.full_name.toLowerCase().includes(q) && !u.email.toLowerCase().includes(q)) return false;
    }
    if (selectedRole !== 'ALL' && u.role !== selectedRole) return false;
    return true;
  });

  const openCreateUserModal = (target?: User) => {
    if (target) {
      setUserToEdit(target);
      setFullName(target.full_name);
      setEmail(target.email);
      setPassword('');
      setRole(target.role);
      setIsActive(target.is_active);
    } else {
      setUserToEdit(null);
      setFullName('');
      setEmail('');
      setPassword('');
      setRole('teacher');
      setIsActive(true);
    }
    setIsCreateModalOpen(true);
  };

  const handleSaveUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || !email.trim()) {
      toast.error('Error', 'Name and email are required.');
      return;
    }

    if (!userToEdit && (!password.trim() || password.trim().length < 6)) {
      toast.error('Invalid Password', 'Initial password must be at least 6 characters long.');
      return;
    }

    try {
      const actor = user ? { id: user.id, name: user.full_name } : undefined;
      const targetRole = roles.find((r) => r.name === role);
      const roleId = targetRole ? targetRole.id : `role_${role}`;

      if (userToEdit) {
        db.updateUser(
          userToEdit.id,
          {
            full_name: fullName.trim(),
            email: email.trim().toLowerCase(),
            role_id: roleId,
            role,
            is_active: isActive,
          },
          actor
        );
        toast.success('User Updated', `${fullName}'s permissions saved.`);
      } else {
        db.createUser(
          {
            email: email.trim().toLowerCase(),
            full_name: fullName.trim(),
            password: password.trim(),
            role_id: roleId,
            role,
            is_active: isActive,
          },
          actor
        );
        toast.success('User Provisioned', `New user account created for ${fullName}.`);
      }

      setIsCreateModalOpen(false);
      reload();
    } catch (err: any) {
      toast.error('Failed', err.message);
    }
  };

  const handleToggleStatus = (targetUser: User) => {
    try {
      const actor = user ? { id: user.id, name: user.full_name } : undefined;
      db.updateUser(
        targetUser.id,
        {
          is_active: !targetUser.is_active,
        },
        actor
      );
      toast.info(
        'Account Status Changed',
        `${targetUser.full_name} is now ${!targetUser.is_active ? 'Active' : 'Deactivated'}.`
      );
      reload();
    } catch (err: any) {
      toast.error('Failed', err.message);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="System User & Role Management"
        subtitle="Manage administrative accounts, assign RBAC access roles, and control active credentials."
        actions={
          (isSuperAdmin || isSchoolAdmin) && (
            <button
              onClick={() => openCreateUserModal()}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-semibold rounded-xl shadow-xs transition"
            >
              <Plus className="w-4 h-4" />
              <span>Create User</span>
            </button>
          )
        }
      />

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search user name or email..."
              className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none"
            />
          </div>

          <div>
            <select
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none capitalize"
            >
              <option value="ALL">All Roles ({allUsers.length})</option>
              <option value="super_admin">Super Administrator</option>
              <option value="school_admin">School Administrator</option>
              <option value="teacher">Teacher</option>
              <option value="staff">Staff / Bursar</option>
            </select>
          </div>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-200 text-[10px]">
              <tr>
                <th className="px-4 py-3">User Profile</th>
                <th className="px-4 py-3">Email Address</th>
                <th className="px-4 py-3">Access Role</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Last Active</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredUsers.map((u) => (
                <tr key={u.id} className="hover:bg-slate-50/50 transition">
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-slate-100 text-slate-700 font-bold text-xs flex items-center justify-center border border-slate-200">
                        {u.full_name[0]}
                      </div>
                      <div className="font-bold text-slate-900">{u.full_name}</div>
                    </div>
                  </td>
                  <td className="px-4 py-3.5 font-mono text-slate-600">{u.email}</td>
                  <td className="px-4 py-3.5">
                    <span className="capitalize px-2 py-0.5 text-[10px] font-bold bg-purple-50 text-purple-700 rounded-md border border-purple-200">
                      {u.role ? u.role.replace(/_/g, ' ') : ''}
                    </span>
                  </td>
                  <td className="px-4 py-3.5">
                    <StatusBadge status={u.is_active ? 'active' : 'suspended'} />
                  </td>
                  <td className="px-4 py-3.5 text-slate-400 font-mono">
                    {u.last_login_at ? new Date(u.last_login_at).toLocaleDateString() : 'Never'}
                  </td>
                  <td className="px-4 py-3.5 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        onClick={() => openCreateUserModal(u)}
                        className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                        title="Edit User"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => {
                          setUserToResetPassword(u);
                          setAdminNewPassword('');
                        }}
                        className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition"
                        title="Reset User Password"
                      >
                        <KeyRound className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleToggleStatus(u)}
                        className={`p-1.5 rounded-lg transition ${
                          u.is_active
                            ? 'text-slate-400 hover:text-rose-600 hover:bg-rose-50'
                            : 'text-slate-400 hover:text-emerald-600 hover:bg-emerald-50'
                        }`}
                        title={u.is_active ? 'Deactivate Account' : 'Activate Account'}
                      >
                        {u.is_active ? <UserX className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* User Form Modal */}
      {isCreateModalOpen && (
        <Modal
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          title={userToEdit ? 'Edit System Account' : 'Create User Account'}
          subtitle="Configure login email, credentials, and RBAC security role"
          maxWidth="md"
        >
          <form onSubmit={handleSaveUser} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Full Name *</label>
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Full name"
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Email Address *</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@institution.edu"
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none"
              />
            </div>

            {!userToEdit && (
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Initial Password *</label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Minimum 6 characters"
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none"
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Access Role *</label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as UserRole)}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none capitalize"
              >
                <option value="teacher">Teacher (Class Rosters, Attendance, Assessments)</option>
                <option value="staff">Bursar / Staff (Student & Staff Records)</option>
                <option value="school_admin">School Administrator (Full Academic & User Operations)</option>
                {isSuperAdmin && (
                  <option value="super_admin">Super Administrator (Full System & Config Control)</option>
                )}
              </select>
            </div>

            <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer pt-1">
              <input
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="rounded text-blue-600"
              />
              <span>Account is active and authorized to log in</span>
            </label>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs"
              >
                {userToEdit ? 'Save Changes' : 'Provision User'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Admin Password Reset Modal */}
      {userToResetPassword && (
        <Modal
          isOpen={!!userToResetPassword}
          onClose={() => setUserToResetPassword(null)}
          title="Reset Account Password"
          subtitle={`Set a new institutional login password for ${userToResetPassword.full_name}`}
          maxWidth="sm"
        >
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!adminNewPassword || adminNewPassword.length < 6) {
                toast.error('Invalid Password', 'Password must be at least 6 characters.');
                return;
              }
              const actor = user ? { id: user.id, name: user.full_name } : undefined;
              const res = db.resetUserPassword(userToResetPassword.email, adminNewPassword, actor);
              if (res.success) {
                toast.success(
                  'Password Reset Successfully',
                  `New password set for ${userToResetPassword.full_name} (${userToResetPassword.email}).`
                );
                setUserToResetPassword(null);
                setAdminNewPassword('');
                reload();
              } else {
                toast.error('Failed', res.error || 'Could not reset password.');
              }
            }}
            className="space-y-4"
          >
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-600 space-y-1">
              <div className="flex justify-between">
                <span className="text-slate-500">Account:</span>
                <span className="font-semibold text-slate-900">{userToResetPassword.full_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Email:</span>
                <span className="font-mono text-slate-700">{userToResetPassword.email}</span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">New Password *</label>
              <input
                type="text"
                required
                minLength={6}
                value={adminNewPassword}
                onChange={(e) => setAdminNewPassword(e.target.value)}
                placeholder="Enter new password (min. 6 characters)"
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-mono"
              />
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setUserToResetPassword(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-xs font-semibold text-white bg-amber-600 hover:bg-amber-700 rounded-xl shadow-xs"
              >
                Update Password
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};
