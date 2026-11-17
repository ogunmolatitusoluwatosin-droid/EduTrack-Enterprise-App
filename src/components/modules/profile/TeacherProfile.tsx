import React, { useState } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { useToast } from '../../../context/ToastContext';
import { db } from '../../../db/storage';
import { PageHeader } from '../../layout/PageHeader';
import { StatusBadge } from '../../common/Badge';
import {
  User,
  Mail,
  Phone,
  MapPin,
  Calendar,
  BookOpen,
  Award,
  ShieldCheck,
  Building2,
  KeyRound,
  Lock,
  Eye,
  EyeOff,
  CheckCircle2,
} from 'lucide-react';

export const TeacherProfile: React.FC = () => {
  const { staff, user, role, changePassword, isTeacher, isSuperAdmin, isSchoolAdmin, isStaff } = useAuth();
  const toast = useToast();

  // Active staff record associated with this user if available
  const activeStaff = staff || (user?.staff_id ? db.getStaffById(user.staff_id) : undefined);

  const assignedClasses = activeStaff ? db.getClassesForTeacher(activeStaff.id) : [];
  const classSubjects = activeStaff ? db.getClassSubjects().filter((cs) => cs.teacher_id === activeStaff.id) : [];

  // Change Password state
  const [currentPass, setCurrentPass] = useState('');
  const [newPass, setNewPass] = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [showCurrentPass, setShowCurrentPass] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [isUpdatingPass, setIsUpdatingPass] = useState(false);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!newPass || newPass.length < 6) {
      toast.error('Password Length', 'New password must be at least 6 characters.');
      return;
    }
    if (newPass !== confirmPass) {
      toast.error('Mismatch', 'New passwords do not match.');
      return;
    }

    setIsUpdatingPass(true);
    const res = await changePassword(newPass, currentPass);
    setIsUpdatingPass(false);

    if (res.success) {
      toast.success(
        'Password Changed Successfully',
        'Your institutional login password was updated. Use this new password for subsequent logins.'
      );
      setCurrentPass('');
      setNewPass('');
      setConfirmPass('');
    } else {
      toast.error('Failed', res.error || 'Could not update password.');
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <PageHeader
        title={isTeacher ? 'Teacher Profile & Security' : 'My Profile & Security'}
        subtitle="Manage your institutional profile, verified access level, and account password."
      />

      {/* Top Bio Card */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-5">
        <div className="flex items-center gap-4">
          {activeStaff?.profile_photo_url || user?.avatar_url ? (
            <img
              src={activeStaff?.profile_photo_url || user?.avatar_url}
              alt={user?.full_name}
              referrerPolicy="no-referrer"
              className="w-16 h-16 rounded-2xl object-cover border border-slate-200"
            />
          ) : (
            <div className="w-16 h-16 rounded-2xl bg-blue-600 text-white font-extrabold text-2xl flex items-center justify-center">
              {user?.full_name?.charAt(0) || 'U'}
            </div>
          )}
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-slate-900">{user?.full_name}</h2>
              <StatusBadge status={role?.name || user?.role || 'active'} />
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Institutional Email: <span className="font-mono font-semibold text-slate-700">{user?.email}</span>
              {activeStaff?.staff_code && (
                <> • Staff ID: <span className="font-mono font-bold text-slate-700">{activeStaff.staff_code}</span></>
              )}
            </p>
          </div>
        </div>
      </div>

      {/* Info Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 text-xs">
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-3">
          <div className="text-[11px] font-bold uppercase text-slate-400">Account & Privileges</div>
          <div className="flex items-center gap-2 text-slate-700">
            <Mail className="w-4 h-4 text-slate-400" />
            <span>{user?.email}</span>
          </div>
          <div className="flex items-center gap-2 text-slate-700">
            <ShieldCheck className="w-4 h-4 text-slate-400" />
            <span className="capitalize">{role?.label || user?.role?.replace(/_/g, ' ')}</span>
          </div>
          {activeStaff && (
            <>
              <div className="flex items-center gap-2 text-slate-700">
                <Phone className="w-4 h-4 text-slate-400" />
                <span>{activeStaff.phone}</span>
              </div>
              <div className="flex items-start gap-2 text-slate-700">
                <MapPin className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                <span>{activeStaff.address}</span>
              </div>
            </>
          )}
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-3">
          <div className="text-[11px] font-bold uppercase text-slate-400">Institutional Details</div>
          <div className="flex justify-between py-1 border-b border-slate-100">
            <span className="text-slate-500">Access Scope:</span>
            <span className="font-semibold text-slate-800 capitalize">{role?.description || 'Institutional access'}</span>
          </div>
          {activeStaff ? (
            <>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Department:</span>
                <span className="font-semibold text-slate-800">{activeStaff.department}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Employment Type:</span>
                <span className="font-semibold text-slate-800 capitalize">{activeStaff.employment_type ? activeStaff.employment_type.replace(/_/g, ' ') : ''}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-500">Qualification:</span>
                <span className="font-semibold text-slate-800">{activeStaff.qualification}</span>
              </div>
            </>
          ) : (
            <>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Account Status:</span>
                <span className="font-semibold text-emerald-600">Active</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-500">System Role:</span>
                <span className="font-semibold text-slate-800 capitalize">{user?.role}</span>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Teaching Load (If teacher with assigned subjects) */}
      {classSubjects.length > 0 && (
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-blue-600" />
            <span>Teaching Load & Subjects ({classSubjects.length})</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {classSubjects.map((cs) => {
              const cls = db.getClassById(cs.class_id);
              const sub = db.getSubjectById(cs.subject_id);
              return (
                <div key={cs.id} className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 text-xs flex items-center justify-between">
                  <div>
                    <div className="font-bold text-slate-900">{sub?.name || 'Subject'}</div>
                    <div className="text-slate-500 mt-0.5">{cls?.name} ({cls?.level})</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Security & Password Management */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <KeyRound className="w-4 h-4 text-amber-600" />
            <span>Change Login Password</span>
          </h3>
          <span className="text-[11px] text-slate-400">Takes effect on next login</span>
        </div>

        <form onSubmit={handleChangePassword} className="space-y-4 max-w-md">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Current Password (Optional)
            </label>
            <div className="relative">
              <input
                type={showCurrentPass ? 'text' : 'password'}
                value={currentPass}
                onChange={(e) => setCurrentPass(e.target.value)}
                placeholder="Enter current password if known"
                className="w-full px-3 py-2 pr-10 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
              <button
                type="button"
                onClick={() => setShowCurrentPass(!showCurrentPass)}
                className="absolute right-3 top-2 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                {showCurrentPass ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              New Password * (Min. 6 characters)
            </label>
            <div className="relative">
              <input
                type={showPass ? 'text' : 'password'}
                required
                minLength={6}
                value={newPass}
                onChange={(e) => setNewPass(e.target.value)}
                placeholder="Enter new password"
                className="w-full px-3 py-2 pr-10 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-mono"
              />
              <button
                type="button"
                onClick={() => setShowPass(!showPass)}
                className="absolute right-3 top-2 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                {showPass ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Confirm New Password *
            </label>
            <input
              type={showPass ? 'text' : 'password'}
              required
              minLength={6}
              value={confirmPass}
              onChange={(e) => setConfirmPass(e.target.value)}
              placeholder="Re-enter new password"
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-mono"
            />
          </div>

          <button
            type="submit"
            disabled={isUpdatingPass}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl shadow-xs transition disabled:opacity-60 cursor-pointer flex items-center gap-1.5"
          >
            <KeyRound className="w-3.5 h-3.5" />
            <span>{isUpdatingPass ? 'Updating...' : 'Save New Password'}</span>
          </button>
        </form>
      </div>
    </div>
  );
};
