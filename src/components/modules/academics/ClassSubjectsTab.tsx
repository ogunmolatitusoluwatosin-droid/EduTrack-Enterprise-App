import React, { useState } from 'react';
import { db } from '../../../db/storage';
import { useAuth } from '../../../context/AuthContext';
import { useToast } from '../../../context/ToastContext';
import { ClassSubject, SchoolClass, Subject, Staff, AcademicSession } from '../../../types';
import { Modal } from '../../common/Modal';
import {
  BookOpen,
  Plus,
  Trash2,
  Building2,
  Users,
  Calendar,
  Search,
  Filter,
  AlertCircle,
  CheckCircle2,
  Edit2,
  Layers,
  GraduationCap,
} from 'lucide-react';

interface ClassSubjectsTabProps {
  initialSessionId?: string;
  initialClassId?: string;
  initialSubjectId?: string;
}

export const ClassSubjectsTab: React.FC<ClassSubjectsTabProps> = ({
  initialSessionId,
  initialClassId,
  initialSubjectId,
}) => {
  const { isSchoolAdmin, isSuperAdmin, user } = useAuth();
  const toast = useToast();
  const canManage = isSchoolAdmin || isSuperAdmin;

  const [refreshKey, setRefreshKey] = useState(0);
  const reload = () => setRefreshKey((k) => k + 1);

  const sessions = db.getAcademicSessions();
  const activeSession = db.getActiveSession();
  const classes = db.getClasses();
  const subjects = db.getSubjects();
  const allStaff = db.getStaff();
  const classSubjects = db.getClassSubjects();

  // Filters
  const [selectedSessionFilter, setSelectedSessionFilter] = useState<string>(
    initialSessionId || activeSession?.id || (sessions[0]?.id ?? 'all')
  );
  const [selectedClassFilter, setSelectedClassFilter] = useState<string>(
    initialClassId || (classes[0]?.id ?? 'all')
  );
  const [selectedSubjectFilter, setSelectedSubjectFilter] = useState<string>(
    initialSubjectId || 'all'
  );
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Modals state
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [targetClassId, setTargetClassId] = useState<string>(classes[0]?.id || '');
  const [selectedSubjectIds, setSelectedSubjectIds] = useState<string[]>([]);
  const [assignedTeacherId, setAssignedTeacherId] = useState<string>('');
  const [targetSessionId, setTargetSessionId] = useState<string>(
    activeSession?.id || (sessions[0]?.id ?? '')
  );

  // Edit Single Teacher for Class Subject
  const [editingClassSubject, setEditingClassSubject] = useState<ClassSubject | null>(null);
  const [editTeacherId, setEditTeacherId] = useState<string>('');

  // Delete modal state
  const [classSubjectToDelete, setClassSubjectToDelete] = useState<ClassSubject | null>(null);

  const teachingStaff = allStaff.filter((s) => s.employment_status === 'active');

  const filteredClassSubjects = classSubjects.filter((cs) => {
    if (selectedClassFilter !== 'all' && cs.class_id !== selectedClassFilter) {
      return false;
    }
    if (selectedSubjectFilter !== 'all' && cs.subject_id !== selectedSubjectFilter) {
      return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const s = subjects.find((sub) => sub.id === cs.subject_id);
      const c = classes.find((cls) => cls.id === cs.class_id);
      const t = allStaff.find((st) => st.id === cs.teacher_id);
      const matchSubject = s ? (s.name + ' ' + s.code).toLowerCase().includes(q) : false;
      const matchClass = c ? c.name.toLowerCase().includes(q) : false;
      const matchTeacher = t ? (t.first_name + ' ' + t.last_name).toLowerCase().includes(q) : false;
      if (!matchSubject && !matchClass && !matchTeacher) return false;
    }
    return true;
  });

  const openAssignModal = () => {
    setTargetClassId(selectedClassFilter !== 'all' ? selectedClassFilter : (classes[0]?.id || ''));
    setSelectedSubjectIds([]);
    setAssignedTeacherId('');
    setTargetSessionId(selectedSessionFilter !== 'all' ? selectedSessionFilter : (activeSession?.id || sessions[0]?.id || ''));
    setIsAssignModalOpen(true);
  };

  const handleToggleSubject = (subjectId: string) => {
    setSelectedSubjectIds((prev) =>
      prev.includes(subjectId) ? prev.filter((id) => id !== subjectId) : [...prev, subjectId]
    );
  };

  const handleSaveClassSubjects = (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetClassId) {
      toast.error('Validation Error', 'Please select a class.');
      return;
    }
    if (selectedSubjectIds.length === 0) {
      toast.error('Validation Error', 'Please select at least one subject to add.');
      return;
    }

    try {
      const actor = user ? { id: user.id, name: user.full_name } : undefined;
      let added = 0;
      let skipped = 0;

      selectedSubjectIds.forEach((subId) => {
        const alreadyExists = classSubjects.some(
          (cs) => cs.class_id === targetClassId && cs.subject_id === subId
        );
        if (alreadyExists) {
          skipped++;
        } else {
          db.assignSubjectToClass(
            targetClassId,
            subId,
            assignedTeacherId || undefined,
            targetSessionId || activeSession?.id || 'session_001',
            actor
          );
          added++;
        }
      });

      const cls = classes.find((c) => c.id === targetClassId);
      if (added > 0) {
        toast.success(
          'Curriculum Updated',
          `Added ${added} subject(s) to class "${cls?.name || 'Class'}".${
            skipped > 0 ? ` (${skipped} already present)` : ''
          }`
        );
      } else {
        toast.info('Already Exists', 'All selected subjects are already in this class curriculum.');
      }

      setIsAssignModalOpen(false);
      reload();
    } catch (err: any) {
      toast.error('Operation Failed', err.message);
    }
  };

  const handleUpdateTeacher = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingClassSubject) return;

    try {
      const actor = user ? { id: user.id, name: user.full_name } : undefined;
      db.updateClassSubjectTeacher(editingClassSubject.id, editTeacherId || undefined, actor);
      toast.success('Teacher Updated', 'Subject instructor updated successfully.');
      setEditingClassSubject(null);
      reload();
    } catch (err: any) {
      toast.error('Update Failed', err.message);
    }
  };

  const handleDeleteClassSubject = () => {
    if (!classSubjectToDelete) return;
    try {
      const actor = user ? { id: user.id, name: user.full_name } : undefined;
      db.removeSubjectFromClass(classSubjectToDelete.id, actor);
      toast.success('Subject Removed', 'Subject removed from class curriculum.');
      setClassSubjectToDelete(null);
      reload();
    } catch (err: any) {
      toast.error('Removal Failed', err.message);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs">
        <div>
          <h3 className="text-base font-semibold text-slate-900">Class-Subject Curriculum Matrix</h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Configure curriculum subjects offered per class and assign individual subject teachers.
          </p>
        </div>

        {canManage && (
          <button
            type="button"
            onClick={openAssignModal}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl shadow-xs transition whitespace-nowrap self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>Add Subjects to Class</span>
          </button>
        )}
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
            placeholder="Search curriculum..."
            className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Class Filter */}
        <div className="flex items-center gap-2">
          <Building2 className="w-4 h-4 text-slate-400 shrink-0" />
          <select
            value={selectedClassFilter}
            onChange={(e) => setSelectedClassFilter(e.target.value)}
            aria-label="Filter curriculum by class"
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

        {/* Subject Filter */}
        <div className="flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-slate-400 shrink-0" />
          <select
            value={selectedSubjectFilter}
            onChange={(e) => setSelectedSubjectFilter(e.target.value)}
            aria-label="Filter curriculum by subject"
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 text-xs font-semibold rounded-xl text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Subjects</option>
            {subjects.map((sub) => (
              <option key={sub.id} value={sub.id}>
                {sub.name} ({sub.code})
              </option>
            ))}
          </select>
        </div>

        {/* Quick summary */}
        <div className="flex items-center justify-end px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-600 font-medium">
          Showing <span className="font-bold text-slate-900 mx-1">{filteredClassSubjects.length}</span> allocations
        </div>
      </div>

      {/* Curriculum Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <h4 className="text-xs font-semibold text-slate-900 uppercase tracking-wider">
            Class Curriculum Allocations ({filteredClassSubjects.length})
          </h4>
          <span className="text-xs text-slate-400">
            Assessment scores tie directly to these class subjects
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/75 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                <th className="py-3 px-4">Class</th>
                <th className="py-3 px-4">Subject Code & Name</th>
                <th className="py-3 px-4">Subject Instructor / Teacher</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {filteredClassSubjects.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-400">
                    No curriculum allocations found matching the selected filters.
                  </td>
                </tr>
              ) : (
                filteredClassSubjects.map((cs) => {
                  const cls = classes.find((c) => c.id === cs.class_id);
                  const subject = subjects.find((s) => s.id === cs.subject_id);
                  const teacher = allStaff.find((s) => s.id === cs.teacher_id);

                  return (
                    <tr key={cs.id} className="hover:bg-slate-50/75 transition">
                      {/* Class */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-xs">
                            <Building2 className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="font-bold text-slate-900">{cls?.name || 'Class'}</div>
                            <div className="text-[10px] text-slate-400">
                              Level: {cls?.level} • Arm: {cls?.section}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Subject */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold px-2 py-0.5 bg-slate-100 rounded text-slate-700">
                            {subject?.code || 'SUB'}
                          </span>
                          <span className="font-bold text-slate-900">{subject?.name || 'Subject'}</span>
                        </div>
                      </td>

                      {/* Teacher */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {teacher ? (
                          <div className="flex items-center gap-2">
                            {teacher.profile_photo_url ? (
                              <img
                                src={teacher.profile_photo_url}
                                alt=""
                                referrerPolicy="no-referrer"
                                className="w-6 h-6 rounded-full object-cover border border-slate-200"
                              />
                            ) : (
                              <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-[10px] font-bold border border-blue-200 shrink-0">
                                {(teacher.first_name?.[0] || '') + (teacher.last_name?.[0] || '')}
                              </div>
                            )}
                            <div>
                              <div className="font-semibold text-slate-800">
                                {teacher.first_name} {teacher.last_name}
                              </div>
                              <div className="text-[10px] text-slate-400 font-mono">
                                {teacher.staff_code}
                              </div>
                            </div>
                          </div>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-amber-600 font-medium">
                            <AlertCircle className="w-3.5 h-3.5" />
                            <span>Unassigned Instructor</span>
                          </span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700">
                          <CheckCircle2 className="w-3 h-3" />
                          Active in Syllabus
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1">
                          {canManage && (
                            <>
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingClassSubject(cs);
                                  setEditTeacherId(cs.teacher_id || '');
                                }}
                                className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                                title="Change Subject Instructor"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => setClassSubjectToDelete(cs)}
                                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                                title="Remove from Curriculum"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Subjects to Class Modal */}
      <Modal
        isOpen={isAssignModalOpen}
        onClose={() => setIsAssignModalOpen(false)}
        title="Add Subjects to Class Curriculum"
        size="lg"
      >
        <form onSubmit={handleSaveClassSubjects} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Target Class */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Target Class <span className="text-rose-500">*</span>
              </label>
              <select
                value={targetClassId}
                onChange={(e) => setTargetClassId(e.target.value)}
                required
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
              >
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.level})
                  </option>
                ))}
              </select>
            </div>

            {/* Optional Default Instructor */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Designated Subject Instructor (Optional)
              </label>
              <select
                value={assignedTeacherId}
                onChange={(e) => setAssignedTeacherId(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">-- No Instructor (Assign Later) --</option>
                {teachingStaff.map((st) => (
                  <option key={st.id} value={st.id}>
                    {st.first_name} {st.last_name} ({st.staff_code} - {st.department})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Select Subjects */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-semibold text-slate-700">
                Select Curriculum Subjects to Add <span className="text-rose-500">*</span>
              </label>
              <span className="text-[11px] text-slate-400">
                {selectedSubjectIds.length} subject(s) selected
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-56 overflow-y-auto border border-slate-200 rounded-xl p-2.5">
              {subjects.map((sub) => {
                const isSelected = selectedSubjectIds.includes(sub.id);
                const isAlreadyInClass = classSubjects.some(
                  (cs) => cs.class_id === targetClassId && cs.subject_id === sub.id
                );

                return (
                  <div
                    key={sub.id}
                    onClick={() => handleToggleSubject(sub.id)}
                    className={`p-2.5 rounded-xl border text-xs cursor-pointer flex items-center justify-between transition ${
                      isSelected
                        ? 'border-blue-500 bg-blue-50/50 text-blue-900'
                        : isAlreadyInClass
                        ? 'border-slate-200 bg-slate-50/50 text-slate-500 opacity-75'
                        : 'border-slate-200 hover:border-slate-300 text-slate-700'
                    }`}
                  >
                    <div>
                      <div className="font-bold flex items-center gap-1.5">
                        <span className="font-mono text-[10px] bg-slate-200 px-1 py-0.2 rounded text-slate-700">
                          {sub.code}
                        </span>
                        <span>{sub.name}</span>
                      </div>
                      {isAlreadyInClass && (
                        <div className="text-[10px] text-emerald-600 mt-0.5 font-medium">
                          Already in class curriculum
                        </div>
                      )}
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
              disabled={selectedSubjectIds.length === 0}
              className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 rounded-xl shadow-xs transition"
            >
              Add Selected Subjects ({selectedSubjectIds.length})
            </button>
          </div>
        </form>
      </Modal>

      {/* Edit Subject Instructor Modal */}
      <Modal
        isOpen={!!editingClassSubject}
        onClose={() => setEditingClassSubject(null)}
        title="Change Subject Instructor"
      >
        <form onSubmit={handleUpdateTeacher} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Select Subject Instructor
            </label>
            <select
              value={editTeacherId}
              onChange={(e) => setEditTeacherId(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
            >
              <option value="">-- No Instructor Assigned --</option>
              {teachingStaff.map((st) => (
                <option key={st.id} value={st.id}>
                  {st.first_name} {st.last_name} ({st.staff_code} - {st.department})
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center justify-end gap-2 pt-3">
            <button
              type="button"
              onClick={() => setEditingClassSubject(null)}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs transition"
            >
              Save Instructor
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={!!classSubjectToDelete}
        onClose={() => setClassSubjectToDelete(null)}
        title="Remove Subject from Class"
      >
        <div className="space-y-4">
          <div className="flex items-start gap-3 p-3.5 bg-rose-50 border border-rose-100 rounded-xl text-rose-800 text-xs">
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold block">Confirm Curriculum Removal</span>
              Are you sure you want to remove this subject from the class curriculum?
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-3">
            <button
              type="button"
              onClick={() => setClassSubjectToDelete(null)}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleDeleteClassSubject}
              className="px-4 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-xs transition"
            >
              Remove Subject
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
