import React, { useState } from 'react';
import { Modal } from '../../common/Modal';
import { db } from '../../../db/storage';
import { useAuth } from '../../../context/AuthContext';
import { useToast } from '../../../context/ToastContext';
import { Student, Guardian, StudentStatus } from '../../../types';
import { StatusBadge } from '../../common/Badge';
import {
  User,
  Users,
  GraduationCap,
  CalendarCheck2,
  FileSpreadsheet,
  Phone,
  Mail,
  MapPin,
  Calendar,
  CheckCircle2,
  XCircle,
  Clock,
  AlertCircle,
  Edit,
  Building2,
  Plus,
  Trash2,
  Star,
  ShieldAlert,
  BookOpen,
} from 'lucide-react';

interface StudentProfileModalProps {
  studentId: string | null;
  isOpen: boolean;
  onClose: () => void;
  onEditStudent?: (student: Student) => void;
  onRefresh?: () => void;
}

export const StudentProfileModal: React.FC<StudentProfileModalProps> = ({
  studentId,
  isOpen,
  onClose,
  onEditStudent,
  onRefresh,
}) => {
  const { isSchoolAdmin, isSuperAdmin, user, isStudentAuthorized, isTeacher } = useAuth();
  const toast = useToast();
  const [activeTab, setActiveTab] = useState<'personal' | 'guardian' | 'academic' | 'attendance' | 'assessments'>('personal');

  // Quick action states
  const [isChangingStatus, setIsChangingStatus] = useState(false);
  const [isMovingClass, setIsMovingClass] = useState(false);
  const [newStatus, setNewStatus] = useState<StudentStatus>('active');
  const [newClassId, setNewClassId] = useState('');

  // Guardian Management States
  const [isAddingGuardian, setIsAddingGuardian] = useState(false);
  const [guardianToEdit, setGuardianToEdit] = useState<Guardian | null>(null);
  const [guardianFirstName, setGuardianFirstName] = useState('');
  const [guardianLastName, setGuardianLastName] = useState('');
  const [guardianRelationship, setGuardianRelationship] = useState<'father' | 'mother' | 'guardian' | 'uncle' | 'aunt' | 'other'>('father');
  const [guardianPhone, setGuardianPhone] = useState('');
  const [guardianEmail, setGuardianEmail] = useState('');
  const [guardianAddress, setGuardianAddress] = useState('');
  const [guardianOccupation, setGuardianOccupation] = useState('');
  const [isPrimaryGuardian, setIsPrimaryGuardian] = useState(false);

  if (!studentId || !isOpen) return null;

  const student = db.getStudentById(studentId);
  if (!student) return null;

  // Enforce Teacher Class authorization check
  if (!isStudentAuthorized(student.id)) {
    return (
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title="Unauthorized Student Record"
        subtitle="Access Restriction Enforced"
        maxWidth="md"
      >
        <div className="p-6 text-center space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center mx-auto">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900">Access Restricted</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              As an assigned teacher, your access is strictly confined to students enrolled in your assigned classes.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 text-xs font-semibold text-white bg-slate-800 hover:bg-slate-900 rounded-xl"
          >
            Close Window
          </button>
        </div>
      </Modal>
    );
  }

  const cls = db.getClassById(student.current_class_id);
  const classTeacher = cls?.class_teacher_id ? db.getStaffById(cls.class_teacher_id) : undefined;
  const guardiansWithRel = db.getGuardiansForStudent(student.id);
  const attendanceRecords = db.getAttendanceForStudent(student.id);
  const assessmentHistory = db.getScoresForStudent(student.id);
  const classes = db.getClasses();
  const sessions = db.getSessions();
  const assignedSession = sessions.find((s) => s.id === student.academic_session_id) || db.getActiveSession();
  const subjects = cls ? db.getSubjectsByClass(cls.id) : [];

  // Attendance metrics
  const totalDays = attendanceRecords.length;
  const presentDays = attendanceRecords.filter((a) => a.status === 'present').length;
  const lateDays = attendanceRecords.filter((a) => a.status === 'late').length;
  const absentDays = attendanceRecords.filter((a) => a.status === 'absent').length;
  const excusedDays = attendanceRecords.filter((a) => a.status === 'excused').length;
  const attendanceRate = totalDays > 0 ? Math.round(((presentDays + lateDays) / totalDays) * 100) : 100;

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
      return age > 0 ? `${age} years old` : 'Under 1 year';
    } catch {
      return '';
    }
  };

  const handleStatusUpdate = () => {
    try {
      const actor = user ? { id: user.id, name: user.full_name } : undefined;
      db.changeStudentStatus(student.id, newStatus, actor);
      toast.success('Status Updated', `${student.first_name}'s status changed to ${newStatus.toUpperCase()}`);
      setIsChangingStatus(false);
      onRefresh?.();
    } catch (err: any) {
      toast.error('Failed', err.message);
    }
  };

  const handleClassReassign = () => {
    try {
      if (!newClassId) return;
      const actor = user ? { id: user.id, name: user.full_name } : undefined;
      db.assignStudentClass(student.id, newClassId, actor);
      const targetClass = db.getClassById(newClassId);
      toast.success('Class Updated', `${student.first_name} moved to ${targetClass?.name}`);
      setIsMovingClass(false);
      onRefresh?.();
    } catch (err: any) {
      toast.error('Failed', err.message);
    }
  };

  // Guardian Management Handlers
  const openAddGuardianModal = () => {
    setGuardianToEdit(null);
    setGuardianFirstName('');
    setGuardianLastName('');
    setGuardianRelationship('father');
    setGuardianPhone('');
    setGuardianEmail('');
    setGuardianAddress(student.address || '');
    setGuardianOccupation('');
    setIsPrimaryGuardian(guardiansWithRel.length === 0);
    setIsAddingGuardian(true);
  };

  const openEditGuardianModal = (g: Guardian, currentRel: string, isPrimary: boolean) => {
    setGuardianToEdit(g);
    setGuardianFirstName(g.first_name);
    setGuardianLastName(g.last_name);
    setGuardianRelationship((currentRel as any) || 'father');
    setGuardianPhone(g.phone);
    setGuardianEmail(g.email);
    setGuardianAddress(g.address);
    setGuardianOccupation(g.occupation || '');
    setIsPrimaryGuardian(isPrimary);
    setIsAddingGuardian(true);
  };

  const handleSaveGuardian = (e: React.FormEvent) => {
    e.preventDefault();
    if (!guardianFirstName.trim() || !guardianLastName.trim()) {
      toast.error('Validation Error', 'Guardian first and last name are required.');
      return;
    }
    if (!guardianPhone.trim()) {
      toast.error('Validation Error', 'Guardian phone number is required.');
      return;
    }

    try {
      const actor = user ? { id: user.id, name: user.full_name } : undefined;

      if (guardianToEdit) {
        db.updateGuardian(
          guardianToEdit.id,
          {
            first_name: guardianFirstName.trim(),
            last_name: guardianLastName.trim(),
            phone: guardianPhone.trim(),
            email: guardianEmail.trim(),
            address: guardianAddress.trim(),
            occupation: guardianOccupation.trim() || undefined,
          },
          actor
        );
        if (isPrimaryGuardian) {
          db.setPrimaryGuardian(student.id, guardianToEdit.id);
        }
        toast.success('Guardian Updated', `Updated details for ${guardianFirstName} ${guardianLastName}.`);
      } else {
        db.addGuardianToStudent(
          student.id,
          {
            first_name: guardianFirstName.trim(),
            last_name: guardianLastName.trim(),
            phone: guardianPhone.trim(),
            email: guardianEmail.trim(),
            address: guardianAddress.trim(),
            occupation: guardianOccupation.trim() || undefined,
          },
          guardianRelationship,
          isPrimaryGuardian,
          actor
        );
        toast.success('Guardian Linked', `${guardianFirstName} ${guardianLastName} added as guardian.`);
      }

      setIsAddingGuardian(false);
      onRefresh?.();
    } catch (err: any) {
      toast.error('Failed to save guardian', err.message);
    }
  };

  const handleSetPrimary = (guardianId: string, name: string) => {
    try {
      db.setPrimaryGuardian(student.id, guardianId);
      toast.success('Primary Contact Set', `${name} is now the primary guardian.`);
      onRefresh?.();
    } catch (err: any) {
      toast.error('Failed', err.message);
    }
  };

  const handleUnlinkGuardian = (guardianId: string, name: string) => {
    if (window.confirm(`Are you sure you want to unlink ${name} from this student's records?`)) {
      try {
        const actor = user ? { id: user.id, name: user.full_name } : undefined;
        db.removeGuardianFromStudent(student.id, guardianId, actor);
        toast.success('Guardian Unlinked', `${name} has been removed.`);
        onRefresh?.();
      } catch (err: any) {
        toast.error('Failed', err.message);
      }
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`${student.first_name} ${student.last_name}`}
      subtitle={`Student ID: ${student.student_code} • Admission No: ${student.admission_number}`}
      maxWidth="3xl"
    >
      <div className="space-y-5">
        {/* Profile Top Bar */}
        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            {student.profile_photo_url ? (
              <img
                src={student.profile_photo_url}
                alt={student.first_name}
                referrerPolicy="no-referrer"
                className="w-14 h-14 rounded-2xl object-cover border border-slate-200 shadow-xs"
              />
            ) : (
              <div className="w-14 h-14 rounded-2xl bg-blue-600 text-white font-extrabold text-xl flex items-center justify-center shadow-xs">
                {student.first_name[0]}
              </div>
            )}
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-bold text-slate-900">
                  {student.first_name} {student.middle_name} {student.last_name}
                </h3>
                <StatusBadge status={student.student_status} />
              </div>
              <div className="text-xs text-slate-500 mt-1 flex flex-wrap items-center gap-2">
                <span className="font-semibold text-slate-700">{cls?.name || 'Class Unassigned'}</span>
                <span>•</span>
                <span className="capitalize">{student.gender}</span>
                <span>•</span>
                <span>{calculateAge(student.date_of_birth)}</span>
                <span>•</span>
                <span>Enrolled: {new Date(student.admission_date).toLocaleDateString()}</span>
              </div>
            </div>
          </div>

          {(isSchoolAdmin || isSuperAdmin) && onEditStudent && (
            <button
              onClick={() => {
                onEditStudent(student);
                onClose();
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 text-xs font-semibold rounded-xl shadow-2xs transition"
            >
              <Edit className="w-3.5 h-3.5 text-blue-600" />
              <span>Edit Student Info</span>
            </button>
          )}
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-1 border-b border-slate-200 overflow-x-auto pb-px">
          {[
            { id: 'personal', label: 'Personal Info', icon: User },
            { id: 'guardian', label: `Guardians (${guardiansWithRel.length})`, icon: Users },
            { id: 'academic', label: 'Academic & Class', icon: GraduationCap },
            { id: 'attendance', label: `Attendance (${totalDays})`, icon: CalendarCheck2 },
            { id: 'assessments', label: `Assessments (${assessmentHistory.length})`, icon: FileSpreadsheet },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-3.5 py-2.5 text-xs font-semibold rounded-t-xl transition border-b-2 whitespace-nowrap ${
                  isActive
                    ? 'text-blue-600 border-blue-600 bg-blue-50/50'
                    : 'text-slate-500 border-transparent hover:text-slate-800 hover:bg-slate-50'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Tab 1: Personal Info */}
        {activeTab === 'personal' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 space-y-2.5">
              <div className="text-[11px] font-bold uppercase text-slate-400">Bio Data</div>
              <div className="flex justify-between py-1 border-b border-slate-200/60">
                <span className="text-slate-500">First Name:</span>
                <span className="font-semibold text-slate-800">{student.first_name}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-200/60">
                <span className="text-slate-500">Middle Name:</span>
                <span className="font-semibold text-slate-800">{student.middle_name || '—'}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-200/60">
                <span className="text-slate-500">Last Name:</span>
                <span className="font-semibold text-slate-800">{student.last_name}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-200/60">
                <span className="text-slate-500">Gender:</span>
                <span className="font-semibold text-slate-800 capitalize">{student.gender}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-200/60">
                <span className="text-slate-500">Date of Birth:</span>
                <span className="font-semibold text-slate-800">
                  {new Date(student.date_of_birth).toLocaleDateString()} ({calculateAge(student.date_of_birth)})
                </span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-500">System Student ID:</span>
                <span className="font-mono font-semibold text-slate-700">{student.student_code}</span>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 space-y-2.5">
              <div className="text-[11px] font-bold uppercase text-slate-400">Location & Origin</div>
              <div className="flex justify-between py-1 border-b border-slate-200/60">
                <span className="text-slate-500">Nationality:</span>
                <span className="font-semibold text-slate-800">{student.nationality}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-200/60">
                <span className="text-slate-500">State / Region:</span>
                <span className="font-semibold text-slate-800">{student.state_or_region}</span>
              </div>
              <div className="py-1">
                <span className="text-slate-500 block mb-1">Residential Address:</span>
                <div className="flex items-start gap-1.5 font-medium text-slate-800 bg-white p-2.5 rounded-lg border border-slate-200/70">
                  <MapPin className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                  <span>{student.address || 'No residential address on file.'}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Guardian Information & Management */}
        {activeTab === 'guardian' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="text-xs text-slate-500">
                Guardians and authorized emergency contacts for <strong>{student.first_name}</strong>.
              </div>
              {(isSchoolAdmin || isSuperAdmin) && (
                <button
                  onClick={openAddGuardianModal}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl shadow-xs transition"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Guardian</span>
                </button>
              )}
            </div>

            {guardiansWithRel.length === 0 ? (
              <div className="py-10 text-center text-xs text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                <Users className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                No guardians linked to this student record yet.
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3">
                {guardiansWithRel.map((item, idx) => (
                  <div
                    key={idx}
                    className={`p-4 rounded-xl border text-xs space-y-2.5 transition ${
                      item.is_primary_contact ? 'bg-blue-50/30 border-blue-200' : 'bg-slate-50 border-slate-200/80'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-slate-900">
                          {item.guardian.first_name} {item.guardian.last_name}
                        </span>
                        <span className="capitalize px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 font-bold border border-purple-200 text-[11px]">
                          {item.relationship}
                        </span>
                        {item.is_primary_contact ? (
                          <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 font-semibold border border-emerald-200 text-[10px] inline-flex items-center gap-1">
                            <Star className="w-3 h-3 fill-emerald-600 text-emerald-600" />
                            Primary Contact
                          </span>
                        ) : null}
                      </div>

                      {(isSchoolAdmin || isSuperAdmin) && (
                        <div className="flex items-center gap-1.5 self-end sm:self-auto">
                          {!item.is_primary_contact && (
                            <button
                              type="button"
                              onClick={() => handleSetPrimary(item.guardian.id, `${item.guardian.first_name} ${item.guardian.last_name}`)}
                              className="px-2.5 py-1 text-[11px] font-medium bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-lg transition"
                            >
                              Set as Primary
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => openEditGuardianModal(item.guardian, item.relationship, item.is_primary_contact)}
                            className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-white rounded-lg border border-transparent hover:border-slate-200 transition"
                            title="Edit Guardian Details"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleUnlinkGuardian(item.guardian.id, `${item.guardian.first_name} ${item.guardian.last_name}`)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-white rounded-lg border border-transparent hover:border-slate-200 transition"
                            title="Unlink Guardian"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 text-slate-600">
                      <div className="flex items-center gap-2">
                        <Phone className="w-3.5 h-3.5 text-slate-400" />
                        <span className="font-semibold text-slate-800">{item.guardian.phone || 'Phone not provided'}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Mail className="w-3.5 h-3.5 text-slate-400" />
                        <span>{item.guardian.email || 'Email not provided'}</span>
                      </div>
                      {item.guardian.occupation && (
                        <div className="col-span-2 text-slate-500">
                          Occupation: <strong>{item.guardian.occupation}</strong>
                        </div>
                      )}
                      <div className="col-span-2 flex items-start gap-2 text-slate-500">
                        <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                        <span>{item.guardian.address || 'Address not on file.'}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Add / Edit Guardian Sub-Modal */}
            {isAddingGuardian && (
              <div className="fixed inset-0 z-60 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
                <div className="bg-white rounded-2xl p-5 max-w-lg w-full shadow-2xl border border-slate-200 space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <h3 className="font-bold text-slate-900 text-sm">
                      {guardianToEdit ? 'Edit Guardian Details' : 'Add New Guardian'}
                    </h3>
                    <button
                      onClick={() => setIsAddingGuardian(false)}
                      className="text-slate-400 hover:text-slate-600 text-sm font-bold"
                    >
                      ✕
                    </button>
                  </div>

                  <form onSubmit={handleSaveGuardian} className="space-y-3 text-xs">
                    <div className="grid grid-cols-2 gap-2.5">
                      <div>
                        <label className="block font-semibold text-slate-700 mb-1">First Name *</label>
                        <input
                          type="text"
                          required
                          value={guardianFirstName}
                          onChange={(e) => setGuardianFirstName(e.target.value)}
                          placeholder="e.g. Mary"
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-blue-500 outline-none"
                        />
                      </div>
                      <div>
                        <label className="block font-semibold text-slate-700 mb-1">Last Name *</label>
                        <input
                          type="text"
                          required
                          value={guardianLastName}
                          onChange={(e) => setGuardianLastName(e.target.value)}
                          placeholder="e.g. Balogun"
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-blue-500 outline-none"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2.5">
                      <div>
                        <label className="block font-semibold text-slate-700 mb-1">Relationship *</label>
                        <select
                          value={guardianRelationship}
                          onChange={(e) => setGuardianRelationship(e.target.value as any)}
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-blue-500 outline-none capitalize"
                        >
                          <option value="father">Father</option>
                          <option value="mother">Mother</option>
                          <option value="guardian">Legal Guardian</option>
                          <option value="uncle">Uncle</option>
                          <option value="aunt">Aunt</option>
                          <option value="other">Other</option>
                        </select>
                      </div>
                      <div>
                        <label className="block font-semibold text-slate-700 mb-1">Occupation</label>
                        <input
                          type="text"
                          value={guardianOccupation}
                          onChange={(e) => setGuardianOccupation(e.target.value)}
                          placeholder="e.g. Engineer"
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-blue-500 outline-none"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2.5">
                      <div>
                        <label className="block font-semibold text-slate-700 mb-1">Phone Number *</label>
                        <input
                          type="tel"
                          required
                          value={guardianPhone}
                          onChange={(e) => setGuardianPhone(e.target.value)}
                          placeholder="+234 803 000 0000"
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-blue-500 outline-none"
                        />
                      </div>
                      <div>
                        <label className="block font-semibold text-slate-700 mb-1">Email Address</label>
                        <input
                          type="email"
                          value={guardianEmail}
                          onChange={(e) => setGuardianEmail(e.target.value)}
                          placeholder="parent@example.com"
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-blue-500 outline-none"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Residential Address</label>
                      <input
                        type="text"
                        value={guardianAddress}
                        onChange={(e) => setGuardianAddress(e.target.value)}
                        placeholder="Residential address..."
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-blue-500 outline-none"
                      />
                    </div>

                    <label className="flex items-center gap-2 pt-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={isPrimaryGuardian}
                        onChange={(e) => setIsPrimaryGuardian(e.target.checked)}
                        className="rounded text-blue-600 focus:ring-blue-500"
                      />
                      <span className="font-semibold text-slate-700">Designate as Primary Emergency Contact</span>
                    </label>

                    <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                      <button
                        type="button"
                        onClick={() => setIsAddingGuardian(false)}
                        className="px-3.5 py-1.5 font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="px-4 py-1.5 font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs transition"
                      >
                        Save Guardian
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tab 3: Academic & Class */}
        {activeTab === 'academic' && (
          <div className="space-y-4 text-xs">
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2.5">
              <div className="text-[11px] font-bold uppercase text-slate-400">School Enrollment</div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="flex justify-between py-1 border-b border-slate-200/60">
                  <span className="text-slate-500">Admission Number:</span>
                  <span className="font-mono font-bold text-slate-900">{student.admission_number}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-200/60">
                  <span className="text-slate-500">Student ID / Code:</span>
                  <span className="font-mono font-bold text-slate-900">{student.student_code}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-200/60">
                  <span className="text-slate-500">Current Class:</span>
                  <span className="font-bold text-blue-600">{cls?.name || 'Unassigned'}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-200/60">
                  <span className="text-slate-500">Academic Session:</span>
                  <span className="font-semibold text-slate-800">{assignedSession?.name || 'Unassigned'}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-200/60">
                  <span className="text-slate-500">Class Teacher:</span>
                  <span className="font-semibold text-slate-800">
                    {classTeacher ? `${classTeacher.first_name} ${classTeacher.last_name}` : 'Not Assigned'}
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-200/60">
                  <span className="text-slate-500">Admission Date:</span>
                  <span className="font-semibold text-slate-800">{new Date(student.admission_date).toLocaleDateString()}</span>
                </div>
              </div>
            </div>

            {/* Subjects In Class */}
            {subjects.length > 0 && (
              <div className="p-4 rounded-xl bg-white border border-slate-200 space-y-2">
                <div className="flex items-center gap-2 font-bold text-slate-800 text-xs">
                  <BookOpen className="w-4 h-4 text-blue-600" />
                  <span>Enrolled Class Subjects ({subjects.length})</span>
                </div>
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {subjects.map((sub) => (
                    <span
                      key={sub.id}
                      className="px-2.5 py-1 bg-slate-100 text-slate-700 rounded-lg text-[11px] font-medium border border-slate-200/60"
                    >
                      {sub.name} <span className="text-slate-400 font-mono">({sub.code})</span>
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Administrative Controls */}
            {(isSchoolAdmin || isSuperAdmin) && (
              <div className="p-4 rounded-xl bg-white border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="font-bold text-slate-800 text-xs">Administrative & Status Controls</div>
                  <span className="text-[11px] text-slate-400">Records are preserved upon status change</span>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  {!isChangingStatus ? (
                    <button
                      onClick={() => {
                        setNewStatus(student.student_status);
                        setIsChangingStatus(true);
                      }}
                      className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg transition"
                    >
                      Change Status ({student.student_status})
                    </button>
                  ) : (
                    <div className="flex items-center gap-2 bg-slate-50 p-2 rounded-xl border border-slate-200">
                      <select
                        value={newStatus}
                        onChange={(e) => setNewStatus(e.target.value as StudentStatus)}
                        className="px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs bg-white capitalize"
                      >
                        <option value="active">Active</option>
                        <option value="graduated">Graduated</option>
                        <option value="transferred">Transferred</option>
                        <option value="suspended">Suspended</option>
                        <option value="withdrawn">Withdrawn (Archive)</option>
                      </select>
                      <button
                        onClick={handleStatusUpdate}
                        className="px-3 py-1.5 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700"
                      >
                        Save
                      </button>
                      <button
                        onClick={() => setIsChangingStatus(false)}
                        className="px-2 py-1.5 text-slate-500 hover:text-slate-700"
                      >
                        Cancel
                      </button>
                    </div>
                  )}

                  {!isMovingClass ? (
                    <button
                      onClick={() => {
                        setNewClassId(student.current_class_id);
                        setIsMovingClass(true);
                      }}
                      className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg transition"
                    >
                      Move / Reassign Class
                    </button>
                  ) : (
                    <div className="flex items-center gap-2 bg-slate-50 p-2 rounded-xl border border-slate-200">
                      <select
                        value={newClassId}
                        onChange={(e) => setNewClassId(e.target.value)}
                        className="px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs bg-white"
                      >
                        {classes.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name} ({c.level})
                          </option>
                        ))}
                      </select>
                      <button
                        onClick={handleClassReassign}
                        className="px-3 py-1.5 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700"
                      >
                        Save Move
                      </button>
                      <button
                        onClick={() => setIsMovingClass(false)}
                        className="px-2 py-1.5 text-slate-500 hover:text-slate-700"
                      >
                        Cancel
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tab 4: Attendance History */}
        {activeTab === 'attendance' && (
          <div className="space-y-4">
            {/* KPI Summary Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
              <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-xl">
                <div className="text-emerald-700 font-semibold">Present</div>
                <div className="text-xl font-extrabold text-emerald-900">{presentDays}</div>
              </div>
              <div className="p-3 bg-amber-50 border border-amber-100 rounded-xl">
                <div className="text-amber-700 font-semibold">Late</div>
                <div className="text-xl font-extrabold text-amber-900">{lateDays}</div>
              </div>
              <div className="p-3 bg-rose-50 border border-rose-100 rounded-xl">
                <div className="text-rose-700 font-semibold">Absent</div>
                <div className="text-xl font-extrabold text-rose-900">{absentDays}</div>
              </div>
              <div className="p-3 bg-purple-50 border border-purple-100 rounded-xl">
                <div className="text-purple-700 font-semibold">Attendance Rate</div>
                <div className="text-xl font-extrabold text-purple-900">{attendanceRate}%</div>
              </div>
            </div>

            {/* List */}
            <div className="max-h-64 overflow-y-auto space-y-1.5 border border-slate-100 rounded-xl p-2 bg-slate-50/50">
              {attendanceRecords.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-400">No attendance sessions recorded yet for this student.</div>
              ) : (
                attendanceRecords.map((rec) => (
                  <div
                    key={rec.id}
                    className="p-2.5 bg-white rounded-lg border border-slate-200/80 flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      <span className="font-semibold text-slate-800">
                        {new Date(rec.attendance_date).toLocaleDateString(undefined, {
                          weekday: 'short',
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                        })}
                      </span>
                      {rec.notes && <span className="text-slate-400 italic">• &ldquo;{rec.notes}&rdquo;</span>}
                    </div>
                    <StatusBadge status={rec.status} />
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Tab 5: Assessment History */}
        {activeTab === 'assessments' && (
          <div className="space-y-3">
            {assessmentHistory.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                No assessment scores entered for this student yet.
              </div>
            ) : (
              assessmentHistory.map((item) => {
                const percentage = Math.round((item.score.score / item.assessment.maximum_score) * 100);
                return (
                  <div
                    key={item.score.id}
                    className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 text-sm">{item.assessment.title}</span>
                        <span className="capitalize px-2 py-0.5 text-[10px] font-semibold bg-purple-50 text-purple-700 rounded border border-purple-200">
                          {item.assessment.assessment_type}
                        </span>
                      </div>
                      <div className="text-slate-500 mt-1 flex items-center gap-2">
                        <span>Subject: <strong className="text-slate-700">{item.subject?.name}</strong></span>
                        <span>•</span>
                        <span>Date: {new Date(item.assessment.assessment_date).toLocaleDateString()}</span>
                      </div>
                      {item.score.feedback && (
                        <div className="mt-1 text-slate-600 italic bg-white p-2 rounded border border-slate-200/60">
                          &ldquo;{item.score.feedback}&rdquo;
                        </div>
                      )}
                    </div>

                    <div className="text-left sm:text-right">
                      <div className="text-base font-extrabold text-blue-600">
                        {item.score.score} <span className="text-xs text-slate-500 font-normal">/ {item.assessment.maximum_score}</span>
                      </div>
                      <div className={`text-[11px] font-bold ${percentage >= 70 ? 'text-emerald-600' : percentage >= 50 ? 'text-amber-600' : 'text-rose-600'}`}>
                        {percentage}% Score
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>
    </Modal>
  );
};
