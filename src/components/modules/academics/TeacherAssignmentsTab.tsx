import React, { useState } from 'react';
import { db } from '../../../db/storage';
import { useAuth } from '../../../context/AuthContext';
import { useToast } from '../../../context/ToastContext';
import { TeacherClassAssignment, Staff, SchoolClass, AcademicSession } from '../../../types';
import { Modal } from '../../common/Modal';
import { StatusBadge } from '../../common/Badge';
import {
  UserCheck,
  Plus,
  Trash2,
  Building2,
  Users,
  Calendar,
  Search,
  Filter,
  AlertCircle,
  CheckCircle2,
  ShieldCheck,
  Sparkles,
  BookOpen,
} from 'lucide-react';

interface TeacherAssignmentsTabProps {
  initialSessionId?: string;
  initialTeacherId?: string;
  initialClassId?: string;
}

export const TeacherAssignmentsTab: React.FC<TeacherAssignmentsTabProps> = ({
  initialSessionId,
  initialTeacherId,
  initialClassId,
}) => {
  const { isSchoolAdmin, isSuperAdmin, user } = useAuth();
  const toast = useToast();
  const canManage = isSchoolAdmin || isSuperAdmin;

  const [refreshKey, setRefreshKey] = useState(0);
  const reload = () => setRefreshKey((k) => k + 1);

  const sessions = db.getAcademicSessions();
  const activeSession = db.getActiveSession();
  const allStaff = db.getStaff();
  const classes = db.getClasses();
  const assignments = db.getTeacherAssignments();

  // Filters
  const [selectedSessionFilter, setSelectedSessionFilter] = useState<string>(
    initialSessionId || activeSession?.id || (sessions[0]?.id ?? 'all')
  );
  const [selectedTeacherFilter, setSelectedTeacherFilter] = useState<string>(
    initialTeacherId || 'all'
  );
  const [selectedClassFilter, setSelectedClassFilter] = useState<string>(
    initialClassId || 'all'
  );
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Single / Multi Assignment Modal
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [selectedTeacherId, setSelectedTeacherId] = useState<string>('');
  const [selectedClassIds, setSelectedClassIds] = useState<string[]>([]);
  const [targetSessionId, setTargetSessionId] = useState<string>(
    activeSession?.id || (sessions[0]?.id ?? '')
  );
  const [setAsClassTeacher, setSetAsClassTeacher] = useState<boolean>(false);

  // Delete modal state
  const [assignmentToDelete, setAssignmentToDelete] = useState<TeacherClassAssignment | null>(null);

  // Teaching staff (e.g. teaching department or full roster)
  const teachingStaff = allStaff.filter(
    (s) => s.employment_status === 'active'
  );

  // Filter assignments
  const filteredAssignments = assignments.filter((tca) => {
    if (selectedSessionFilter !== 'all' && tca.academic_session_id && tca.academic_session_id !== selectedSessionFilter) {
      return false;
    }
    if (selectedTeacherFilter !== 'all' && tca.teacher_id !== selectedTeacherFilter) {
      return false;
    }
    if (selectedClassFilter !== 'all' && tca.class_id !== selectedClassFilter) {
      return false;
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const teacher = allStaff.find((s) => s.id === tca.teacher_id);
      const cls = classes.find((c) => c.id === tca.class_id);
      const matchTeacher = teacher
        ? `${teacher.first_name} ${teacher.last_name} ${teacher.staff_code}`.toLowerCase().includes(q)
        : false;
      const matchClass = cls ? cls.name.toLowerCase().includes(q) : false;
      if (!matchTeacher && !matchClass) return false;
    }

    return true;
  });

  const openAssignModal = () => {
    setSelectedTeacherId(teachingStaff[0]?.id || '');
    setSelectedClassIds([]);
    setTargetSessionId(selectedSessionFilter !== 'all' ? selectedSessionFilter : (activeSession?.id || sessions[0]?.id || ''));
    setSetAsClassTeacher(false);
    setIsAssignModalOpen(true);
  };

  const handleToggleClassSelection = (classId: string) => {
    setSelectedClassIds((prev) =>
      prev.includes(classId) ? prev.filter((id) => id !== classId) : [...prev, classId]
    );
  };

  const handleCreateAssignment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTeacherId) {
      toast.error('Validation Error', 'Please select a teacher.');
      return;
    }
    if (selectedClassIds.length === 0) {
      toast.error('Validation Error', 'Please select at least one class to assign.');
      return;
    }
    if (!targetSessionId) {
      toast.error('Validation Error', 'Please choose an academic session.');
      return;
    }

    try {
      const actor = user ? { id: user.id, name: user.full_name } : undefined;
      let assignedCount = 0;
      let skippedDuplicates = 0;

      selectedClassIds.forEach((classId) => {
        // Prevent invalid duplicate assignments
        const alreadyAssigned = assignments.some(
          (tca) =>
            tca.teacher_id === selectedTeacherId &&
            tca.class_id === classId &&
            tca.academic_session_id === targetSessionId
        );

        if (alreadyAssigned) {
          skippedDuplicates++;
          if (setAsClassTeacher) {
            db.updateClass(classId, { class_teacher_id: selectedTeacherId }, actor);
          }
        } else {
          db.assignTeacherToClass(
            selectedTeacherId,
            classId,
            targetSessionId,
            setAsClassTeacher,
            actor
          );
          assignedCount++;
        }
      });

      const teacher = allStaff.find((s) => s.id === selectedTeacherId);
      if (assignedCount > 0) {
        toast.success(
          'Assignments Created',
          `Assigned ${teacher?.first_name || 'Teacher'} to ${assignedCount} class(es).${
            skippedDuplicates > 0 ? ` (${skippedDuplicates} already assigned)` : ''
          }`
        );
      } else if (skippedDuplicates > 0) {
        toast.info(
          'Already Assigned',
          'Teacher was already assigned to the selected class(es).'
        );
      }

      setIsAssignModalOpen(false);
      reload();
    } catch (err: any) {
      toast.error('Assignment Failed', err.message);
    }
  };

  const handleDeleteAssignment = () => {
    if (!assignmentToDelete) return;
    try {
      const actor = user ? { id: user.id, name: user.full_name } : undefined;
      db.deleteTeacherAssignment(assignmentToDelete.id, actor);
      toast.success('Assignment Removed', 'Teacher was unassigned from this class.');
      setAssignmentToDelete(null);
      reload();
    } catch (err: any) {
      toast.error('Operation Failed', err.message);
    }
  };

  // Helper to check duplicate warning in modal
  const getAssignedClassCountForTeacher = (teacherId: string, sessionId: string) => {
    return assignments.filter(
      (tca) => tca.teacher_id === teacherId && tca.academic_session_id === sessionId
    ).length;
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs">
        <div>
          <h3 className="text-base font-semibold text-slate-900">Teacher-Class Allocations</h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Assign teachers to multiple classes, designate form tutors, and prevent duplicate session workloads.
          </p>
        </div>

        {canManage && (
          <button
            type="button"
            onClick={openAssignModal}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl shadow-xs transition whitespace-nowrap self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>Assign Teacher</span>
          </button>
        )}
      </div>

      {/* Overview Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex items-center gap-3">
          <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <div className="text-2xl font-bold text-slate-900">
              {new Set(filteredAssignments.map((a) => a.teacher_id)).size}
            </div>
            <div className="text-xs font-medium text-slate-500">Active Teachers Assigned</div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex items-center gap-3">
          <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <div className="text-2xl font-bold text-slate-900">{filteredAssignments.length}</div>
            <div className="text-xs font-medium text-slate-500">Class Allocations</div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex items-center gap-3">
          <div className="p-2.5 bg-purple-50 text-purple-600 rounded-xl">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <div className="text-2xl font-bold text-slate-900">
              {classes.filter((c) => !!c.class_teacher_id).length} / {classes.length}
            </div>
            <div className="text-xs font-medium text-slate-500">Head Class Tutors Set</div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex items-center gap-3">
          <div className="p-2.5 bg-amber-50 text-amber-600 rounded-xl">
            <Calendar className="w-5 h-5" />
          </div>
          <div>
            <div className="text-sm font-bold text-slate-900 truncate">
              {activeSession ? activeSession.name : 'All Sessions'}
            </div>
            <div className="text-xs font-medium text-slate-500">Academic Session</div>
          </div>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs grid grid-cols-1 sm:grid-cols-4 gap-3">
        {/* Search */}
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search teacher or class..."
            className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Academic Session Filter */}
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-slate-400 shrink-0" />
          <select
            value={selectedSessionFilter}
            onChange={(e) => setSelectedSessionFilter(e.target.value)}
            aria-label="Filter assignments by session"
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 text-xs font-semibold rounded-xl text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Sessions</option>
            {sessions.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} {s.is_active ? '(Active)' : ''}
              </option>
            ))}
          </select>
        </div>

        {/* Teacher Filter */}
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-slate-400 shrink-0" />
          <select
            value={selectedTeacherFilter}
            onChange={(e) => setSelectedTeacherFilter(e.target.value)}
            aria-label="Filter assignments by teacher"
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 text-xs font-semibold rounded-xl text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Teachers</option>
            {teachingStaff.map((st) => (
              <option key={st.id} value={st.id}>
                {st.first_name} {st.last_name} ({st.staff_code})
              </option>
            ))}
          </select>
        </div>

        {/* Class Filter */}
        <div className="flex items-center gap-2">
          <Building2 className="w-4 h-4 text-slate-400 shrink-0" />
          <select
            value={selectedClassFilter}
            onChange={(e) => setSelectedClassFilter(e.target.value)}
            aria-label="Filter assignments by class"
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 text-xs font-semibold rounded-xl text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Classes</option>
            {classes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} ({c.level})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Assignments Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <h4 className="text-xs font-semibold text-slate-900 uppercase tracking-wider">
            Assignment Records ({filteredAssignments.length})
          </h4>
          <span className="text-xs text-slate-400">
            Enforces zero invalid duplicates per session
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/75 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                <th className="py-3 px-4">Teacher</th>
                <th className="py-3 px-4">Assigned Class</th>
                <th className="py-3 px-4">Role / Assignment Type</th>
                <th className="py-3 px-4">Academic Session</th>
                <th className="py-3 px-4">Teacher's Total Load</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {filteredAssignments.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    No teacher-class assignments found matching the selected filters.
                  </td>
                </tr>
              ) : (
                filteredAssignments.map((tca) => {
                  const teacher = allStaff.find((s) => s.id === tca.teacher_id);
                  const cls = classes.find((c) => c.id === tca.class_id);
                  const session = sessions.find((s) => s.id === tca.academic_session_id);
                  const isPrimaryClassTeacher = cls?.class_teacher_id === tca.teacher_id;
                  const totalLoad = assignments.filter((a) => a.teacher_id === tca.teacher_id).length;

                  return (
                    <tr key={tca.id} className="hover:bg-slate-50/75 transition">
                      {/* Teacher Details */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          {teacher?.profile_photo_url ? (
                            <img
                              src={teacher.profile_photo_url}
                              alt=""
                              referrerPolicy="no-referrer"
                              className="w-8 h-8 rounded-full object-cover border border-slate-200"
                            />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-xs font-bold border border-indigo-200 shrink-0">
                              {(teacher?.first_name?.[0] || '') + (teacher?.last_name?.[0] || '') || '?'}
                            </div>
                          )}
                          <div>
                            <div className="font-bold text-slate-900">
                              {teacher ? `${teacher.first_name} ${teacher.last_name}` : 'Unknown Teacher'}
                            </div>
                            <div className="text-[11px] text-slate-400">
                              {teacher?.staff_code || 'ID'} • {teacher?.department || 'Faculty'}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Class Details */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <div className="p-1.5 bg-blue-50 text-blue-600 rounded-lg">
                            <Building2 className="w-3.5 h-3.5" />
                          </div>
                          <div>
                            <div className="font-bold text-slate-900">{cls?.name || 'Class'}</div>
                            <div className="text-[10px] text-slate-400">
                              Level: {cls?.level} • Arm: {cls?.section}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Role Badge */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {isPrimaryClassTeacher ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-100">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Head Class Teacher
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium bg-slate-100 text-slate-700">
                            <UserCheck className="w-3.5 h-3.5 text-slate-400" />
                            Subject / Allocated Teacher
                          </span>
                        )}
                      </td>

                      {/* Academic Session */}
                      <td className="py-3.5 px-4 whitespace-nowrap text-slate-700 font-medium">
                        <span className="inline-flex items-center gap-1 bg-slate-100 px-2 py-0.5 rounded text-[11px]">
                          <Calendar className="w-3 h-3 text-slate-400" />
                          {session?.name || 'No Session'}
                        </span>
                      </td>

                      {/* Teacher Load */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className="font-mono text-xs font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded">
                          {totalLoad} class{totalLoad === 1 ? '' : 'es'}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        {canManage && (
                          <button
                            type="button"
                            onClick={() => setAssignmentToDelete(tca)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                            title="Remove Teacher Assignment"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Assign Teacher to Class Modal */}
      <Modal
        isOpen={isAssignModalOpen}
        onClose={() => setIsAssignModalOpen(false)}
        title="Assign Teacher to Class(es)"
        size="lg"
      >
        <form onSubmit={handleCreateAssignment} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Select Teacher */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Select Teacher <span className="text-rose-500">*</span>
              </label>
              <select
                value={selectedTeacherId}
                onChange={(e) => setSelectedTeacherId(e.target.value)}
                required
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
              >
                {teachingStaff.map((st) => {
                  const currentCount = getAssignedClassCountForTeacher(st.id, targetSessionId);
                  return (
                    <option key={st.id} value={st.id}>
                      {st.first_name} {st.last_name} ({st.staff_code}) - {currentCount} class(es)
                    </option>
                  );
                })}
              </select>
            </div>

            {/* Academic Session */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Academic Session <span className="text-rose-500">*</span>
              </label>
              <select
                value={targetSessionId}
                onChange={(e) => setTargetSessionId(e.target.value)}
                required
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
              >
                {sessions.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} {s.is_active ? '(Active)' : ''}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Select One or More Classes */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-semibold text-slate-700">
                Select Classes <span className="text-rose-500">*</span>
              </label>
              <span className="text-[11px] text-slate-400">
                {selectedClassIds.length} class(es) selected
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-52 overflow-y-auto border border-slate-200 rounded-xl p-2.5">
              {classes.map((cls) => {
                const isSelected = selectedClassIds.includes(cls.id);
                const isAlreadyAssigned = assignments.some(
                  (a) =>
                    a.teacher_id === selectedTeacherId &&
                    a.class_id === cls.id &&
                    a.academic_session_id === targetSessionId
                );
                const currentTeacher = allStaff.find((s) => s.id === cls.class_teacher_id);

                return (
                  <div
                    key={cls.id}
                    onClick={() => handleToggleClassSelection(cls.id)}
                    className={`p-2.5 rounded-xl border text-xs cursor-pointer flex items-center justify-between transition ${
                      isSelected
                        ? 'border-blue-500 bg-blue-50/50 text-blue-900'
                        : isAlreadyAssigned
                        ? 'border-slate-200 bg-slate-50/50 text-slate-500 opacity-75'
                        : 'border-slate-200 hover:border-slate-300 text-slate-700'
                    }`}
                  >
                    <div>
                      <div className="font-bold flex items-center gap-1.5">
                        <Building2 className="w-3.5 h-3.5 text-blue-500" />
                        <span>{cls.name}</span>
                        {isAlreadyAssigned && (
                          <span className="text-[10px] bg-slate-200 px-1.5 py-0.2 rounded text-slate-600 font-normal">
                            Already assigned
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5">
                        Tutor: {currentTeacher ? `${currentTeacher.first_name} ${currentTeacher.last_name}` : 'Unassigned'}
                      </div>
                    </div>

                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => {}}
                      className="w-4 h-4 text-blue-600 rounded border-slate-300 pointer-events-none"
                    />
                  </div>
                );
              })}
            </div>
          </div>

          {/* Designate as Head Class Teacher toggle */}
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={setAsClassTeacher}
                onChange={(e) => setSetAsClassTeacher(e.target.checked)}
                className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
              />
              <span className="text-xs font-semibold text-slate-800">
                Designate as Primary Head Class Teacher / Form Tutor
              </span>
            </label>
            <p className="text-[11px] text-slate-400 ml-6 mt-0.5">
              If checked, this will set this teacher as the main responsible class teacher for selected classes.
            </p>
          </div>

          <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsAssignModalOpen(false)}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={selectedClassIds.length === 0}
              className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 rounded-xl shadow-xs transition"
            >
              Confirm Assignment{selectedClassIds.length > 1 ? ` (${selectedClassIds.length})` : ''}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={!!assignmentToDelete}
        onClose={() => setAssignmentToDelete(null)}
        title="Remove Teacher Assignment"
      >
        <div className="space-y-4">
          <div className="flex items-start gap-3 p-3.5 bg-rose-50 border border-rose-100 rounded-xl text-rose-800 text-xs">
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold block">Confirm Unassignment</span>
              Are you sure you want to remove this teacher assignment? The teacher will no longer be
              associated with this class for this session.
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-3">
            <button
              type="button"
              onClick={() => setAssignmentToDelete(null)}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleDeleteAssignment}
              className="px-4 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-xs transition"
            >
              Remove Assignment
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
