import React, { useState } from 'react';
import { db } from '../../../db/storage';
import { useAuth } from '../../../context/AuthContext';
import { useToast } from '../../../context/ToastContext';
import { SchoolClass, Staff, AcademicSession } from '../../../types';
import { Modal } from '../../common/Modal';
import { StatusBadge } from '../../common/Badge';
import {
  Building2,
  Plus,
  Edit2,
  Trash2,
  Users,
  GraduationCap,
  BookOpen,
  UserCheck,
  Calendar,
  Layers,
  Search,
  Filter,
  AlertCircle,
  ArrowRight,
  ExternalLink,
} from 'lucide-react';

interface ClassesTabProps {
  initialSessionId?: string;
  onNavigateTab?: (tab: string, extra?: any) => void;
  onSelectStudent?: (studentId: string) => void;
}

export const ClassesTab: React.FC<ClassesTabProps> = ({
  initialSessionId,
  onNavigateTab,
  onSelectStudent,
}) => {
  const { isSchoolAdmin, isSuperAdmin, isTeacher, isStaff, user } = useAuth();
  const toast = useToast();
  const canManage = isSchoolAdmin || isSuperAdmin;

  const [refreshKey, setRefreshKey] = useState(0);
  const reload = () => setRefreshKey((k) => k + 1);

  const classes = db.getClasses();
  const allStaff = db.getStaff();
  const allStudents = db.getStudents();
  const allSubjects = db.getSubjects();
  const classSubjects = db.getClassSubjects();
  const sessions = db.getAcademicSessions();
  const activeSession = db.getActiveSession();

  // Filters
  const [selectedSessionFilter, setSelectedSessionFilter] = useState<string>(
    initialSessionId || activeSession?.id || (sessions[0]?.id ?? 'all')
  );
  const [levelFilter, setLevelFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Modals state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingClass, setEditingClass] = useState<SchoolClass | null>(null);
  const [className, setClassName] = useState('');
  const [classLevel, setClassLevel] = useState('Primary 1');
  const [classSection, setClassSection] = useState('A');
  const [academicSessionId, setAcademicSessionId] = useState('');
  const [classTeacherId, setClassTeacherId] = useState('');
  const [capacity, setCapacity] = useState(35);

  // View Roster / Details Modal
  const [viewingClass, setViewingClass] = useState<SchoolClass | null>(null);

  // Delete modal state
  const [classToDelete, setClassToDelete] = useState<SchoolClass | null>(null);

  // Filtered classes
  const filteredClasses = classes.filter((cls) => {
    if (selectedSessionFilter !== 'all' && cls.academic_session_id && cls.academic_session_id !== selectedSessionFilter) {
      return false;
    }
    if (levelFilter !== 'all' && cls.level !== levelFilter) {
      return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = cls.name.toLowerCase().includes(q);
      const matchLevel = cls.level.toLowerCase().includes(q);
      const matchSection = cls.section.toLowerCase().includes(q);
      const teacher = allStaff.find((s) => s.id === cls.class_teacher_id);
      const matchTeacher = teacher
        ? `${teacher.first_name} ${teacher.last_name}`.toLowerCase().includes(q)
        : false;
      if (!matchName && !matchLevel && !matchSection && !matchTeacher) {
        return false;
      }
    }
    return true;
  });

  const distinctLevels = Array.from(new Set(classes.map((c) => c.level))).filter(Boolean);

  const openCreateModal = () => {
    setEditingClass(null);
    setClassName('Primary 1A');
    setClassLevel('Primary 1');
    setClassSection('A');
    setAcademicSessionId(selectedSessionFilter !== 'all' ? selectedSessionFilter : (activeSession?.id || sessions[0]?.id || ''));
    setClassTeacherId('');
    setCapacity(35);
    setIsModalOpen(true);
  };

  const openEditModal = (cls: SchoolClass) => {
    setEditingClass(cls);
    setClassName(cls.name);
    setClassLevel(cls.level);
    setClassSection(cls.section);
    setAcademicSessionId(cls.academic_session_id || activeSession?.id || '');
    setClassTeacherId(cls.class_teacher_id || '');
    setCapacity(cls.capacity || 35);
    setIsModalOpen(true);
  };

  const handleSaveClass = (e: React.FormEvent) => {
    e.preventDefault();
    if (!className.trim()) {
      toast.error('Validation Error', 'Class name is required.');
      return;
    }
    if (!classLevel.trim()) {
      toast.error('Validation Error', 'Class level is required.');
      return;
    }
    if (!classSection.trim()) {
      toast.error('Validation Error', 'Section or arm is required.');
      return;
    }

    try {
      const actor = user ? { id: user.id, name: user.full_name } : undefined;
      const targetSession = academicSessionId || activeSession?.id || 'session_001';

      if (editingClass) {
        db.updateClass(
          editingClass.id,
          {
            name: className.trim(),
            level: classLevel.trim(),
            section: classSection.trim(),
            academic_session_id: targetSession,
            class_teacher_id: classTeacherId || undefined,
            capacity: Number(capacity) || 35,
          },
          actor
        );

        // If teacher changed, update teacher class assignments
        if (classTeacherId) {
          db.assignTeacherToClass(classTeacherId, editingClass.id, targetSession, true, actor);
        }

        toast.success('Class Updated', `Class "${className}" has been updated.`);
      } else {
        const newClass = db.createClass(
          {
            name: className.trim(),
            level: classLevel.trim(),
            section: classSection.trim(),
            academic_session_id: targetSession,
            class_teacher_id: classTeacherId || undefined,
            capacity: Number(capacity) || 35,
          },
          actor
        );

        if (classTeacherId) {
          db.assignTeacherToClass(classTeacherId, newClass.id, targetSession, true, actor);
        }

        toast.success('Class Created', `Class "${className}" has been registered.`);
      }

      setIsModalOpen(false);
      reload();
    } catch (err: any) {
      toast.error('Operation Failed', err.message);
    }
  };

  const handleDeleteClass = () => {
    if (!classToDelete) return;
    try {
      const actor = user ? { id: user.id, name: user.full_name } : undefined;
      db.deleteClass(classToDelete.id, actor);
      toast.success('Class Deleted', `Class "${classToDelete.name}" was removed.`);
      setClassToDelete(null);
      reload();
    } catch (err: any) {
      toast.error('Cannot Delete Class', err.message);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Controls Bar */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-base font-semibold text-slate-900">Class Management</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Organize grade levels, sections/arms, assigned class teachers, and student rosters.
            </p>
          </div>

          {canManage && (
            <button
              type="button"
              onClick={openCreateModal}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl shadow-xs transition whitespace-nowrap self-start sm:self-auto"
            >
              <Plus className="w-4 h-4" />
              <span>Create Class</span>
            </button>
          )}
        </div>

        {/* Filter Controls */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-slate-100">
          {/* Search */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search classes or teachers..."
              className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Academic Session Filter */}
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-slate-400 shrink-0" />
            <select
              value={selectedSessionFilter}
              onChange={(e) => setSelectedSessionFilter(e.target.value)}
              aria-label="Filter classes by academic session"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 text-xs font-semibold rounded-xl text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Academic Sessions</option>
              {sessions.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} {s.is_active ? '(Active)' : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Level Filter */}
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-400 shrink-0" />
            <select
              value={levelFilter}
              onChange={(e) => setLevelFilter(e.target.value)}
              aria-label="Filter classes by level"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 text-xs font-semibold rounded-xl text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Class Levels</option>
              {distinctLevels.map((lvl) => (
                <option key={lvl} value={lvl}>
                  {lvl}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Class Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredClasses.length === 0 ? (
          <div className="col-span-full py-12 bg-white rounded-2xl border border-slate-200 text-center text-slate-400 text-xs">
            No classes match the selected filter criteria.
          </div>
        ) : (
          filteredClasses.map((cls) => {
            const classSession = sessions.find((s) => s.id === cls.academic_session_id);
            const teacher = allStaff.find((s) => s.id === cls.class_teacher_id);
            const studentCount = allStudents.filter((s) => s.current_class_id === cls.id).length;
            const subjectsOffered = classSubjects.filter((cs) => cs.class_id === cls.id).length;
            const cap = cls.capacity || 35;
            const occupancyPct = Math.min(100, Math.round((studentCount / cap) * 100));

            return (
              <div
                key={cls.id}
                className="bg-white rounded-2xl border border-slate-200 shadow-2xs hover:shadow-md transition p-5 flex flex-col justify-between"
              >
                <div>
                  {/* Top card header */}
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-base font-bold text-slate-900">{cls.name}</h4>
                        <span className="px-2 py-0.5 text-[10px] font-bold bg-blue-50 text-blue-700 rounded-md">
                          Arm {cls.section}
                        </span>
                      </div>
                      <div className="text-xs text-slate-500 font-medium mt-0.5">
                        Level: {cls.level}
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      {canManage && (
                        <>
                          <button
                            type="button"
                            onClick={() => openEditModal(cls)}
                            className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                            title="Edit Class"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setClassToDelete(cls)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                            title="Delete Class"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Academic Session Badge */}
                  <div className="mb-4">
                    <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-600 bg-slate-100 px-2.5 py-1 rounded-lg">
                      <Calendar className="w-3 h-3 text-slate-400" />
                      Session: {classSession?.name || 'Unassigned'}
                    </span>
                  </div>

                  {/* Class Teacher Info */}
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 mb-4">
                    <div className="text-[10px] uppercase font-semibold text-slate-400 mb-1 flex items-center gap-1">
                      <UserCheck className="w-3 h-3 text-blue-500" />
                      <span>Class Teacher / Tutor</span>
                    </div>
                    {teacher ? (
                      <div className="flex items-center gap-2.5">
                        {teacher.profile_photo_url ? (
                          <img
                            src={teacher.profile_photo_url}
                            alt=""
                            referrerPolicy="no-referrer"
                            className="w-7 h-7 rounded-full object-cover border border-slate-200"
                          />
                        ) : (
                          <div className="w-7 h-7 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-[10px] font-bold border border-blue-200 shrink-0">
                            {(teacher.first_name?.[0] || '') + (teacher.last_name?.[0] || '')}
                          </div>
                        )}
                        <div className="truncate">
                          <div className="text-xs font-bold text-slate-900 truncate">
                            {teacher.first_name} {teacher.last_name}
                          </div>
                          <div className="text-[10px] text-slate-500 truncate">
                            {teacher.staff_code} • {teacher.department}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="text-xs text-amber-700 font-medium flex items-center gap-1.5">
                        <AlertCircle className="w-3.5 h-3.5" />
                        <span>No class teacher assigned</span>
                      </div>
                    )}
                  </div>

                  {/* Enrollment Metrics & Capacity Progress */}
                  <div className="space-y-2 mb-4">
                    <div className="flex items-center justify-between text-xs font-medium text-slate-700">
                      <span className="flex items-center gap-1 text-slate-500">
                        <Users className="w-3.5 h-3.5 text-slate-400" />
                        Enrolled Students:
                      </span>
                      <span className="font-bold text-slate-900">
                        {studentCount} / {cap}
                      </span>
                    </div>

                    <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          occupancyPct >= 100
                            ? 'bg-rose-500'
                            : occupancyPct > 80
                            ? 'bg-amber-500'
                            : 'bg-blue-600'
                        }`}
                        style={{ width: `${occupancyPct}%` }}
                      />
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
                      <span className="flex items-center gap-1">
                        <BookOpen className="w-3 h-3 text-slate-400" />
                        {subjectsOffered} Subject{subjectsOffered === 1 ? '' : 's'} Offered
                      </span>
                      <span className="font-mono">{occupancyPct}% Full</span>
                    </div>
                  </div>
                </div>

                {/* Card Actions */}
                <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => setViewingClass(cls)}
                    className="flex-1 py-1.5 px-3 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold rounded-xl transition flex items-center justify-center gap-1"
                  >
                    <span>View Roster ({studentCount})</span>
                  </button>

                  {onNavigateTab && (
                    <button
                      type="button"
                      onClick={() => onNavigateTab('class_subjects', { classId: cls.id })}
                      className="py-1.5 px-3 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-semibold rounded-xl transition flex items-center gap-1"
                      title="Manage Subjects for this Class"
                    >
                      <BookOpen className="w-3.5 h-3.5" />
                      <span>Curriculum</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Create / Edit Class Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingClass ? 'Edit School Class' : 'Create New Class'}
      >
        <form onSubmit={handleSaveClass} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Class Full Name <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={className}
              onChange={(e) => setClassName(e.target.value)}
              placeholder="e.g. Primary 1A, JSS 2 Gold, SS 3 Science"
              className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Level / Grade <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={classLevel}
                onChange={(e) => setClassLevel(e.target.value)}
                placeholder="e.g. Primary 1, JSS 1, SS 2"
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Section / Arm <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={classSection}
                onChange={(e) => setClassSection(e.target.value)}
                placeholder="e.g. A, B, Gold, Science, Arts"
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Academic Session <span className="text-rose-500">*</span>
              </label>
              <select
                value={academicSessionId}
                onChange={(e) => setAcademicSessionId(e.target.value)}
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

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Student Capacity
              </label>
              <input
                type="number"
                min={1}
                max={200}
                value={capacity}
                onChange={(e) => setCapacity(Number(e.target.value))}
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Class Teacher / Form Master (Optional)
            </label>
            <select
              value={classTeacherId}
              onChange={(e) => setClassTeacherId(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">-- No Class Teacher Assigned --</option>
              {allStaff.map((st) => (
                <option key={st.id} value={st.id}>
                  {st.first_name} {st.last_name} ({st.staff_code} - {st.job_title})
                </option>
              ))}
            </select>
            <p className="text-[11px] text-slate-400 mt-1">
              Assigning a teacher will link them to this class for the active session.
            </p>
          </div>

          <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs transition"
            >
              {editingClass ? 'Update Class' : 'Create Class'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Class Roster & Details Modal */}
      <Modal
        isOpen={!!viewingClass}
        onClose={() => setViewingClass(null)}
        title={viewingClass ? `Class Roster: ${viewingClass.name}` : 'Class Details'}
        size="lg"
      >
        {viewingClass && (
          <div className="space-y-4">
            <div className="flex items-center justify-between bg-slate-50 p-3.5 rounded-xl border border-slate-100">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-600 text-white rounded-lg">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <div className="font-bold text-slate-900 text-sm">{viewingClass.name}</div>
                  <div className="text-xs text-slate-500">
                    Level: {viewingClass.level} • Arm: {viewingClass.section} • Capacity: {viewingClass.capacity || 35}
                  </div>
                </div>
              </div>

              {onNavigateTab && (
                <button
                  type="button"
                  onClick={() => {
                    const cid = viewingClass.id;
                    setViewingClass(null);
                    onNavigateTab('class_subjects', { classId: cid });
                  }}
                  className="px-3 py-1.5 bg-blue-50 text-blue-700 text-xs font-semibold rounded-lg hover:bg-blue-100 transition flex items-center gap-1"
                >
                  <BookOpen className="w-3.5 h-3.5" />
                  <span>Curriculum</span>
                </button>
              )}
            </div>

            {/* Students enrolled */}
            <div>
              <h5 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Enrolled Students ({allStudents.filter((s) => s.current_class_id === viewingClass.id).length})
              </h5>

              <div className="max-h-72 overflow-y-auto border border-slate-200 rounded-xl divide-y divide-slate-100">
                {allStudents.filter((s) => s.current_class_id === viewingClass.id).length === 0 ? (
                  <div className="py-6 text-center text-xs text-slate-400">
                    No students currently enrolled in this class.
                  </div>
                ) : (
                  allStudents
                    .filter((s) => s.current_class_id === viewingClass.id)
                    .map((st, idx) => (
                      <div
                        key={st.id}
                        className="p-3 flex items-center justify-between hover:bg-slate-50 transition"
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-xs font-mono text-slate-400 w-5">{idx + 1}.</span>
                          {st.profile_photo_url ? (
                            <img
                              src={st.profile_photo_url}
                              alt=""
                              referrerPolicy="no-referrer"
                              className="w-7 h-7 rounded-full object-cover border border-slate-200"
                            />
                          ) : (
                            <div className="w-7 h-7 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-[10px] font-bold border border-emerald-200 shrink-0">
                              {(st.first_name?.[0] || '') + (st.last_name?.[0] || '')}
                            </div>
                          )}
                          <div>
                            <div className="text-xs font-bold text-slate-900">
                              {st.first_name} {st.middle_name ? st.middle_name + ' ' : ''}{st.last_name}
                            </div>
                            <div className="text-[10px] text-slate-500">
                              Adm: {st.admission_number} • ID: {st.student_code} • {st.gender.toUpperCase()}
                            </div>
                          </div>
                        </div>

                        {onSelectStudent && (
                          <button
                            type="button"
                            onClick={() => {
                              onSelectStudent(st.id);
                              setViewingClass(null);
                            }}
                            className="text-xs text-blue-600 hover:text-blue-800 font-semibold inline-flex items-center gap-1"
                          >
                            <span>Profile</span>
                            <ArrowRight className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    ))
                )}
              </div>
            </div>

            <div className="flex justify-end pt-3">
              <button
                type="button"
                onClick={() => setViewingClass(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={!!classToDelete}
        onClose={() => setClassToDelete(null)}
        title="Confirm Class Deletion"
      >
        <div className="space-y-4">
          <div className="flex items-start gap-3 p-3.5 bg-rose-50 border border-rose-100 rounded-xl text-rose-800 text-xs">
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold block">Permanent Action</span>
              Are you sure you want to delete class{' '}
              <strong className="font-bold">"{classToDelete?.name}"</strong>?
              {allStudents.filter((s) => s.current_class_id === classToDelete?.id).length > 0 && (
                <p className="mt-1 font-bold text-rose-700">
                  This class has{' '}
                  {allStudents.filter((s) => s.current_class_id === classToDelete?.id).length}{' '}
                  enrolled student(s). You must reassign students to another class before deleting.
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-3">
            <button
              type="button"
              onClick={() => setClassToDelete(null)}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleDeleteClass}
              className="px-4 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-xs transition"
            >
              Delete Class
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
