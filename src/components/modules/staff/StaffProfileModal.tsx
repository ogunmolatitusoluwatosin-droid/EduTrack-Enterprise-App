import React, { useState } from 'react';
import { Modal } from '../../common/Modal';
import { db } from '../../../db/storage';
import { useAuth } from '../../../context/AuthContext';
import { useToast } from '../../../context/ToastContext';
import { Staff, EmploymentStatus, SchoolClass } from '../../../types';
import { StatusBadge } from '../../common/Badge';
import {
  User,
  Building2,
  Mail,
  Phone,
  MapPin,
  Calendar,
  BookOpen,
  Award,
  Edit,
  ShieldCheck,
  Power,
  GraduationCap,
  Plus,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  Layers,
  Clock,
} from 'lucide-react';

interface StaffProfileModalProps {
  staffId: string | null;
  isOpen: boolean;
  onClose: () => void;
  onEditStaff?: (staff: Staff) => void;
  onRefresh?: () => void;
}

export const StaffProfileModal: React.FC<StaffProfileModalProps> = ({
  staffId,
  isOpen,
  onClose,
  onEditStaff,
  onRefresh,
}) => {
  const { isSchoolAdmin, isSuperAdmin, user } = useAuth();
  const toast = useToast();

  const [activeTab, setActiveTab] = useState<'profile' | 'teaching' | 'admin'>('profile');
  const [isChangingStatus, setIsChangingStatus] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<EmploymentStatus>('active');

  // Teaching Assignment Modal state
  const [isAssigningSubject, setIsAssigningSubject] = useState(false);
  const [selectedClassId, setSelectedClassId] = useState('');
  const [selectedSubjectId, setSelectedSubjectId] = useState('');

  if (!staffId || !isOpen) return null;

  const staff = db.getStaffById(staffId);
  if (!staff) return null;

  const classes = db.getClasses();
  const allSubjects = db.getSubjects();
  const activeSession = db.getActiveSession() || db.getSessions()[0];

  // Teaching loads
  const primaryClasses = classes.filter((c) => c.class_teacher_id === staff.id);
  const classSubjects = db.getClassSubjects().filter((cs) => cs.teacher_id === staff.id);
  const isTeacherRole = primaryClasses.length > 0 || classSubjects.length > 0 || staff.job_title.toLowerCase().includes('teacher') || staff.job_title.toLowerCase().includes('instructor');

  const users = db.getUsers();
  const linkedUser = users.find((u) => u.email.toLowerCase() === staff.email.toLowerCase());
  const linkedRole = linkedUser?.role || (linkedUser?.role_id ? db.getRoles().find((r) => r.id === linkedUser.role_id)?.name : undefined);

  // Calculate age helper
  const calculateAge = (dobString: string) => {
    try {
      const birth = new Date(dobString);
      const now = new Date('2026-08-26');
      let age = now.getFullYear() - birth.getFullYear();
      const m = now.getMonth() - birth.getMonth();
      if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) {
        age--;
      }
      return age > 0 ? `${age} years old` : '';
    } catch {
      return '';
    }
  };

  // Calculate tenure helper
  const calculateTenure = (employedDateString: string) => {
    try {
      const start = new Date(employedDateString);
      const now = new Date('2026-08-26');
      const diffMonths = (now.getFullYear() - start.getFullYear()) * 12 + (now.getMonth() - start.getMonth());
      const years = Math.floor(diffMonths / 12);
      const months = diffMonths % 12;
      if (years > 0) {
        return `${years} yr${years > 1 ? 's' : ''} ${months > 0 ? `${months} mo` : ''}`;
      }
      return `${Math.max(1, months)} months`;
    } catch {
      return 'N/A';
    }
  };

  const handleStatusChange = (newStatus: EmploymentStatus) => {
    try {
      const actor = user ? { id: user.id, name: user.full_name } : undefined;
      db.toggleStaffStatus(staff.id, newStatus, actor);
      toast.success(
        'Status Updated',
        `Staff status for ${staff.first_name} ${staff.last_name} set to ${newStatus.toUpperCase()}`
      );
      setIsChangingStatus(false);
      onRefresh?.();
    } catch (err: any) {
      toast.error('Failed to update status', err.message);
    }
  };

  const handleAssignSubject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClassId || !selectedSubjectId || !activeSession) {
      toast.error('Error', 'Please select both a class and a subject.');
      return;
    }

    try {
      db.assignSubjectToClass(selectedClassId, selectedSubjectId, staff.id, activeSession.id);
      toast.success('Subject Assigned', `Successfully assigned subject teaching allocation.`);
      setIsAssigningSubject(false);
      setSelectedClassId('');
      setSelectedSubjectId('');
      onRefresh?.();
    } catch (err: any) {
      toast.error('Failed to assign subject', err.message);
    }
  };

  const handleRemoveSubjectAllocation = (csId: string, subjectName: string, className: string) => {
    if (window.confirm(`Unassign ${staff.first_name} ${staff.last_name} from teaching ${subjectName} in ${className}?`)) {
      try {
        const actor = user ? { id: user.id, name: user.full_name } : undefined;
        db.removeSubjectFromClass(csId, actor);
        toast.success('Teaching Assignment Removed', `Unassigned from ${subjectName} (${className}).`);
        onRefresh?.();
      } catch (err: any) {
        toast.error('Failed to unassign', err.message);
      }
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`${staff.first_name} ${staff.middle_name ? `${staff.middle_name} ` : ''}${staff.last_name}`}
      subtitle={`Staff ID: ${staff.staff_code} • Employee No: ${staff.employee_number || staff.staff_code}`}
      maxWidth="3xl"
    >
      <div className="space-y-5">
        {/* Profile Top Summary Banner */}
        <div className="p-4 sm:p-5 rounded-2xl bg-slate-50 border border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            {staff.profile_photo_url ? (
              <img
                src={staff.profile_photo_url}
                alt={staff.first_name}
                referrerPolicy="no-referrer"
                className="w-16 h-16 rounded-2xl object-cover border-2 border-slate-200 shadow-2xs shrink-0"
              />
            ) : (
              <div className="w-16 h-16 rounded-2xl bg-indigo-600 text-white font-extrabold text-2xl flex items-center justify-center shrink-0 shadow-2xs">
                {staff.first_name[0]}
              </div>
            )}
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-base sm:text-lg font-bold text-slate-900">
                  {staff.first_name} {staff.middle_name} {staff.last_name}
                </h3>
                <StatusBadge status={staff.employment_status} />
                {isTeacherRole ? (
                  <span className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 font-bold border border-blue-200 text-[10px] uppercase tracking-wider inline-flex items-center gap-1">
                    <GraduationCap className="w-3 h-3" />
                    Teacher
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-semibold border border-slate-200 text-[10px] uppercase tracking-wider">
                    Staff
                  </span>
                )}
              </div>
              <div className="text-xs text-slate-500 mt-1 flex flex-wrap items-center gap-2">
                <span className="font-semibold text-slate-700">{staff.job_title}</span>
                <span>•</span>
                <span className="text-slate-600">{staff.department}</span>
                <span>•</span>
                <span className="capitalize">{staff.employment_type ? staff.employment_type.replace(/_/g, ' ') : ''}</span>
              </div>
            </div>
          </div>

          {(isSchoolAdmin || isSuperAdmin) && onEditStaff && (
            <button
              onClick={() => {
                onEditStaff(staff);
                onClose();
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 text-xs font-semibold rounded-xl shadow-2xs transition self-start sm:self-auto"
            >
              <Edit className="w-3.5 h-3.5 text-blue-600" />
              <span>Edit Staff Details</span>
            </button>
          )}
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-1 border-b border-slate-200 overflow-x-auto pb-px">
          {[
            { id: 'profile', label: 'Personal & Employment', icon: User },
            { id: 'teaching', label: `Teaching & Classes (${classSubjects.length + primaryClasses.length})`, icon: BookOpen },
            { id: 'admin', label: 'Status & Admin Controls', icon: Power },
          ].map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-t-xl transition whitespace-nowrap ${
                  active
                    ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50/50'
                    : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Tab 1: Personal & Employment Details */}
        {activeTab === 'profile' && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              {/* Personal Information */}
              <div className="p-4 rounded-xl bg-white border border-slate-200 space-y-3">
                <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-blue-500" />
                  <span>Personal Identification</span>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between py-1 border-b border-slate-100">
                    <span className="text-slate-500">Full Name:</span>
                    <span className="font-semibold text-slate-800">
                      {staff.first_name} {staff.middle_name} {staff.last_name}
                    </span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-100">
                    <span className="text-slate-500">Staff ID Code:</span>
                    <span className="font-mono font-bold text-slate-900">{staff.staff_code}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-100">
                    <span className="text-slate-500">Employee Number:</span>
                    <span className="font-mono font-semibold text-slate-800">
                      {staff.employee_number || staff.staff_code}
                    </span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-100">
                    <span className="text-slate-500">Gender:</span>
                    <span className="font-semibold text-slate-800 capitalize">{staff.gender}</span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-slate-500">Date of Birth:</span>
                    <span className="font-semibold text-slate-800">
                      {new Date(staff.date_of_birth).toLocaleDateString()} {calculateAge(staff.date_of_birth) && `(${calculateAge(staff.date_of_birth)})`}
                    </span>
                  </div>
                </div>
              </div>

              {/* Contact Information */}
              <div className="p-4 rounded-xl bg-white border border-slate-200 space-y-3">
                <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-blue-500" />
                  <span>Contact Information</span>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-slate-700 py-1 border-b border-slate-100">
                    <Mail className="w-4 h-4 text-slate-400 shrink-0" />
                    <span className="font-semibold text-blue-600">{staff.email}</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-700 py-1 border-b border-slate-100">
                    <Phone className="w-4 h-4 text-slate-400 shrink-0" />
                    <span className="font-semibold text-slate-800">{staff.phone || 'Phone not provided'}</span>
                  </div>
                  <div className="flex items-start gap-2 text-slate-700 py-1">
                    <MapPin className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                    <span>{staff.address || 'Address not listed in records.'}</span>
                  </div>
                </div>
              </div>

              {/* Professional & Academic Record */}
              <div className="p-4 rounded-xl bg-white border border-slate-200 space-y-3">
                <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <Award className="w-3.5 h-3.5 text-emerald-500" />
                  <span>Employment Details</span>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between py-1 border-b border-slate-100">
                    <span className="text-slate-500">Job Title:</span>
                    <span className="font-semibold text-slate-800">{staff.job_title}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-100">
                    <span className="text-slate-500">Department:</span>
                    <span className="font-semibold text-slate-800">{staff.department}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-100">
                    <span className="text-slate-500">Employment Type:</span>
                    <span className="capitalize font-semibold text-slate-800">
                      {staff.employment_type ? staff.employment_type.replace(/_/g, ' ') : 'Full Time'}
                    </span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-100">
                    <span className="text-slate-500">Date Employed:</span>
                    <span className="font-semibold text-slate-800">
                      {new Date(staff.date_employed).toLocaleDateString()} ({calculateTenure(staff.date_employed)})
                    </span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-slate-500">Highest Qualification:</span>
                    <span className="font-semibold text-slate-800">{staff.qualification || 'N/A'}</span>
                  </div>
                </div>
              </div>

              {/* System & Portal Access */}
              <div className="p-4 rounded-xl bg-white border border-slate-200 space-y-3">
                <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-purple-500" />
                  <span>Portal Access & Roles</span>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between py-1 border-b border-slate-100">
                    <span className="text-slate-500">Portal User Account:</span>
                    <span className="font-semibold text-slate-800">
                      {linkedUser ? (
                        <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                          Active Account
                        </span>
                      ) : (
                        <span className="text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">Not provisioned</span>
                      )}
                    </span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-100">
                    <span className="text-slate-500">Assigned RBAC Role:</span>
                    <span className="font-semibold text-slate-800 uppercase">
                      {linkedRole || 'N/A'}
                    </span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-slate-500">Last System Login:</span>
                    <span className="text-slate-600">
                      {linkedUser?.last_login ? new Date(linkedUser.last_login).toLocaleString() : 'Never logged in'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Teaching Assignments */}
        {activeTab === 'teaching' && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h4 className="font-bold text-slate-900 text-xs sm:text-sm flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-blue-600" />
                  <span>Academic Teaching Allocations</span>
                </h4>
                <p className="text-[11px] text-slate-500">
                  Classes and subjects currently allocated to <strong>{staff.first_name} {staff.last_name}</strong>.
                </p>
              </div>

              {(isSchoolAdmin || isSuperAdmin) && (
                <button
                  type="button"
                  onClick={() => setIsAssigningSubject(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl shadow-xs transition"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Assign Subject / Class</span>
                </button>
              )}
            </div>

            {/* Class Teacher Section */}
            {primaryClasses.length > 0 && (
              <div className="p-4 rounded-xl bg-blue-50/50 border border-blue-200 space-y-2">
                <div className="text-xs font-bold text-blue-900 flex items-center gap-2">
                  <GraduationCap className="w-4 h-4 text-blue-600" />
                  <span>Head / Class Teacher of:</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {primaryClasses.map((c) => (
                    <div
                      key={c.id}
                      className="px-3 py-1.5 bg-white rounded-lg border border-blue-200 text-xs font-bold text-blue-800 shadow-2xs flex items-center gap-2"
                    >
                      <span>{c.name}</span>
                      <span className="text-[10px] font-normal text-slate-500">({c.level})</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Subject Allocation Grid */}
            {classSubjects.length === 0 ? (
              <div className="py-10 text-center text-xs text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                <BookOpen className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                No specific subject teaching allocations recorded for this staff member.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {classSubjects.map((cs) => {
                  const c = db.getClassById(cs.class_id);
                  const s = db.getSubjectById(cs.subject_id);
                  return (
                    <div
                      key={cs.id}
                      className="p-3.5 bg-white rounded-xl border border-slate-200 text-xs flex items-center justify-between shadow-2xs hover:border-slate-300 transition"
                    >
                      <div className="space-y-1">
                        <div className="font-bold text-slate-900 text-sm">{s?.name || 'Subject'}</div>
                        <div className="text-slate-500 flex items-center gap-2">
                          <span className="font-medium text-blue-700 bg-blue-50 px-2 py-0.5 rounded text-[11px]">
                            {c?.name || 'Class'}
                          </span>
                          <span className="text-[10px] text-slate-400">{s?.code}</span>
                        </div>
                      </div>

                      {(isSchoolAdmin || isSuperAdmin) && (
                        <button
                          type="button"
                          onClick={() => handleRemoveSubjectAllocation(cs.id, s?.name || 'Subject', c?.name || 'Class')}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                          title="Unassign Subject"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Add Subject Allocation Modal */}
            {isAssigningSubject && (
              <div className="fixed inset-0 z-60 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
                <div className="bg-white rounded-2xl p-5 max-w-md w-full shadow-2xl border border-slate-200 space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <h3 className="font-bold text-slate-900 text-sm">Assign Subject Teaching Load</h3>
                    <button
                      onClick={() => setIsAssigningSubject(false)}
                      className="text-slate-400 hover:text-slate-600 text-sm font-bold"
                    >
                      ✕
                    </button>
                  </div>

                  <form onSubmit={handleAssignSubject} className="space-y-3 text-xs">
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Target Class *</label>
                      <select
                        required
                        value={selectedClassId}
                        onChange={(e) => setSelectedClassId(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-blue-500 outline-none"
                      >
                        <option value="">Select a class...</option>
                        {classes.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name} ({c.level})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Subject *</label>
                      <select
                        required
                        value={selectedSubjectId}
                        onChange={(e) => setSelectedSubjectId(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-blue-500 outline-none"
                      >
                        <option value="">Select a subject...</option>
                        {allSubjects.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.name} ({s.code})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                      <button
                        type="button"
                        onClick={() => setIsAssigningSubject(false)}
                        className="px-3.5 py-1.5 font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="px-4 py-1.5 font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs transition"
                      >
                        Confirm Assignment
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tab 3: Status & Admin Controls */}
        {activeTab === 'admin' && (
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-4">
              <div>
                <h4 className="font-bold text-slate-900 text-xs sm:text-sm flex items-center gap-2">
                  <Power className="w-4 h-4 text-emerald-600" />
                  <span>Staff Activation & Status Management</span>
                </h4>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Update active service status, grant leaves, or process staff off-boarding.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-3 bg-white rounded-xl border border-slate-200 text-xs space-y-1">
                  <span className="text-slate-400 font-semibold uppercase text-[10px]">Current Status</span>
                  <div className="pt-0.5">
                    <StatusBadge status={staff.employment_status} />
                  </div>
                </div>

                <div className="p-3 bg-white rounded-xl border border-slate-200 text-xs space-y-1">
                  <span className="text-slate-400 font-semibold uppercase text-[10px]">Employment Type</span>
                  <div className="font-bold text-slate-800 capitalize">
                    {staff.employment_type ? staff.employment_type.replace(/_/g, ' ') : ''}
                  </div>
                </div>

                <div className="p-3 bg-white rounded-xl border border-slate-200 text-xs space-y-1">
                  <span className="text-slate-400 font-semibold uppercase text-[10px]">Tenure</span>
                  <div className="font-bold text-slate-800">{calculateTenure(staff.date_employed)}</div>
                </div>
              </div>

              {(isSchoolAdmin || isSuperAdmin) ? (
                <div className="pt-2 border-t border-slate-200/80 space-y-3">
                  <div className="font-semibold text-slate-700 text-xs">Quick Status Actions:</div>
                  <div className="flex flex-wrap items-center gap-2">
                    {staff.employment_status !== 'active' && (
                      <button
                        type="button"
                        onClick={() => handleStatusChange('active')}
                        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl shadow-xs transition"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Activate Staff</span>
                      </button>
                    )}

                    {staff.employment_status !== 'on_leave' && (
                      <button
                        type="button"
                        onClick={() => handleStatusChange('on_leave')}
                        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold rounded-xl shadow-xs transition"
                      >
                        <Clock className="w-3.5 h-3.5" />
                        <span>Set On Leave</span>
                      </button>
                    )}

                    {staff.employment_status !== 'suspended' && (
                      <button
                        type="button"
                        onClick={() => handleStatusChange('suspended')}
                        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold rounded-xl shadow-xs transition"
                      >
                        <AlertTriangle className="w-3.5 h-3.5" />
                        <span>Suspend Staff</span>
                      </button>
                    )}

                    {staff.employment_status !== 'resigned' && (
                      <button
                        type="button"
                        onClick={() => handleStatusChange('resigned')}
                        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-slate-700 hover:bg-slate-800 text-white text-xs font-semibold rounded-xl shadow-xs transition"
                      >
                        <span>Mark as Resigned</span>
                      </button>
                    )}

                    {staff.employment_status !== 'retired' && (
                      <button
                        type="button"
                        onClick={() => handleStatusChange('retired')}
                        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-slate-600 hover:bg-slate-700 text-white text-xs font-semibold rounded-xl shadow-xs transition"
                      >
                        <span>Mark as Retired</span>
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                <div className="p-3 bg-amber-50 text-amber-800 rounded-xl text-xs border border-amber-200">
                  Status changes and staff activation/deactivation require School Administrator privileges.
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};
