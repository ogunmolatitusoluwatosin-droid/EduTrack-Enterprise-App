import React, { useState } from 'react';
import { db } from '../../../db/storage';
import { useAuth } from '../../../context/AuthContext';
import { useToast } from '../../../context/ToastContext';
import { Subject, SchoolClass, Staff } from '../../../types';
import { Modal } from '../../common/Modal';
import {
  BookOpen,
  Plus,
  Edit2,
  Trash2,
  Building2,
  Users,
  Search,
  AlertCircle,
  Sparkles,
  Layers,
  GraduationCap,
} from 'lucide-react';

interface SubjectsTabProps {
  onNavigateTab?: (tab: string, extra?: any) => void;
}

export const SubjectsTab: React.FC<SubjectsTabProps> = ({ onNavigateTab }) => {
  const { isSchoolAdmin, isSuperAdmin, user } = useAuth();
  const toast = useToast();
  const canManage = isSchoolAdmin || isSuperAdmin;

  const [refreshKey, setRefreshKey] = useState(0);
  const reload = () => setRefreshKey((k) => k + 1);

  const subjects = db.getSubjects();
  const classes = db.getClasses();
  const classSubjects = db.getClassSubjects();
  const allStaff = db.getStaff();

  const [searchQuery, setSearchQuery] = useState('');

  // Modals state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null);
  const [subjectName, setSubjectName] = useState('');
  const [subjectCode, setSubjectCode] = useState('');
  const [description, setDescription] = useState('');

  // View Subject Classes / Teachers Modal
  const [viewingSubject, setViewingSubject] = useState<Subject | null>(null);

  // Delete modal state
  const [subjectToDelete, setSubjectToDelete] = useState<Subject | null>(null);

  const filteredSubjects = subjects.filter((s) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      s.name.toLowerCase().includes(q) ||
      s.code.toLowerCase().includes(q) ||
      (s.description && s.description.toLowerCase().includes(q))
    );
  });

  const openCreateModal = () => {
    setEditingSubject(null);
    setSubjectName('Basic Science & Tech');
    setSubjectCode('BST-101');
    setDescription('Fundamental science, computer fundamentals, and everyday technology concepts.');
    setIsModalOpen(true);
  };

  const openEditModal = (s: Subject) => {
    setEditingSubject(s);
    setSubjectName(s.name);
    setSubjectCode(s.code);
    setDescription(s.description || '');
    setIsModalOpen(true);
  };

  const handleSaveSubject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!subjectName.trim()) {
      toast.error('Validation Error', 'Subject name is required.');
      return;
    }
    if (!subjectCode.trim()) {
      toast.error('Validation Error', 'Subject code is required.');
      return;
    }

    try {
      const actor = user ? { id: user.id, name: user.full_name } : undefined;

      if (editingSubject) {
        db.updateSubject(
          editingSubject.id,
          {
            name: subjectName.trim(),
            code: subjectCode.trim().toUpperCase(),
            description: description.trim() || undefined,
          },
          actor
        );
        toast.success('Subject Updated', `Subject "${subjectName}" updated successfully.`);
      } else {
        db.createSubject(
          {
            name: subjectName.trim(),
            code: subjectCode.trim().toUpperCase(),
            description: description.trim() || undefined,
          },
          actor
        );
        toast.success('Subject Created', `Subject "${subjectName}" (${subjectCode.toUpperCase()}) added to catalogue.`);
      }

      setIsModalOpen(false);
      reload();
    } catch (err: any) {
      toast.error('Operation Failed', err.message);
    }
  };

  const handleDeleteSubject = () => {
    if (!subjectToDelete) return;
    try {
      const actor = user ? { id: user.id, name: user.full_name } : undefined;
      db.deleteSubject(subjectToDelete.id, actor);
      toast.success('Subject Deleted', `Subject "${subjectToDelete.name}" was removed.`);
      setSubjectToDelete(null);
      reload();
    } catch (err: any) {
      toast.error('Cannot Delete Subject', err.message);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Search */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs">
        <div>
          <h3 className="text-base font-semibold text-slate-900">Academic Subjects Catalog</h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Configure school curriculum subjects, subject course codes, and department syllabi.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search subjects or code..."
              className="pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 w-52 sm:w-64"
            />
          </div>

          {canManage && (
            <button
              type="button"
              onClick={openCreateModal}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl shadow-xs transition whitespace-nowrap"
            >
              <Plus className="w-4 h-4" />
              <span>Add Subject</span>
            </button>
          )}
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex items-center gap-3">
          <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl">
            <BookOpen className="w-5 h-5" />
          </div>
          <div>
            <div className="text-2xl font-bold text-slate-900">{subjects.length}</div>
            <div className="text-xs font-medium text-slate-500">Active Curriculum Subjects</div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex items-center gap-3">
          <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <div className="text-2xl font-bold text-slate-900">{classSubjects.length}</div>
            <div className="text-xs font-medium text-slate-500">Class Allocations</div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex items-center gap-3">
          <div className="p-2.5 bg-purple-50 text-purple-600 rounded-xl">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <div className="text-2xl font-bold text-slate-900">
              {new Set(classSubjects.map((cs) => cs.teacher_id).filter(Boolean)).size} Teachers
            </div>
            <div className="text-xs font-medium text-slate-500">Assigned as Subject Tutors</div>
          </div>
        </div>
      </div>

      {/* Subjects Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredSubjects.length === 0 ? (
          <div className="col-span-full py-12 bg-white rounded-2xl border border-slate-200 text-center text-slate-400 text-xs">
            No subjects match your query.
          </div>
        ) : (
          filteredSubjects.map((subject) => {
            const subjectAllocations = classSubjects.filter((cs) => cs.subject_id === subject.id);
            const distinctTeachers = Array.from(
              new Set(subjectAllocations.map((cs) => cs.teacher_id).filter(Boolean))
            );

            return (
              <div
                key={subject.id}
                className="bg-white rounded-2xl border border-slate-200 shadow-2xs hover:shadow-md transition p-5 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div>
                      <span className="px-2.5 py-0.5 text-[11px] font-mono font-bold bg-slate-100 text-slate-700 rounded-md border border-slate-200/80">
                        {subject.code}
                      </span>
                      <h4 className="text-base font-bold text-slate-900 mt-2">{subject.name}</h4>
                    </div>

                    {canManage && (
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => openEditModal(subject)}
                          className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                          title="Edit Subject"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setSubjectToDelete(subject)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                          title="Delete Subject"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>

                  <p className="text-xs text-slate-500 line-clamp-2 mt-1 mb-4 leading-relaxed">
                    {subject.description || 'Core academic subject standard curriculum.'}
                  </p>

                  <div className="grid grid-cols-2 gap-2 p-3 bg-slate-50 rounded-xl border border-slate-100 mb-2 text-xs">
                    <div>
                      <div className="text-[10px] text-slate-400 font-semibold uppercase">Offered in</div>
                      <div className="font-bold text-slate-800 flex items-center gap-1 mt-0.5">
                        <Building2 className="w-3.5 h-3.5 text-blue-500" />
                        <span>{subjectAllocations.length} Classes</span>
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-400 font-semibold uppercase">Tutors</div>
                      <div className="font-bold text-slate-800 flex items-center gap-1 mt-0.5">
                        <Users className="w-3.5 h-3.5 text-emerald-500" />
                        <span>{distinctTeachers.length} Staff</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => setViewingSubject(subject)}
                    className="flex-1 py-1.5 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition flex items-center justify-center gap-1"
                  >
                    <span>View Classes ({subjectAllocations.length})</span>
                  </button>

                  {onNavigateTab && (
                    <button
                      type="button"
                      onClick={() => onNavigateTab('class_subjects', { subjectId: subject.id })}
                      className="py-1.5 px-3 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-semibold rounded-xl transition flex items-center gap-1"
                      title="Assign to Classes"
                    >
                      <Layers className="w-3.5 h-3.5" />
                      <span>Assign</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Create / Edit Subject Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingSubject ? 'Edit Subject' : 'Add Subject to Catalog'}
      >
        <form onSubmit={handleSaveSubject} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Subject Name <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={subjectName}
              onChange={(e) => setSubjectName(e.target.value)}
              placeholder="e.g. Mathematics, English Language, Physics"
              className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Subject Code <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={subjectCode}
              onChange={(e) => setSubjectCode(e.target.value)}
              placeholder="e.g. MTH-101, ENG-PRI, SCI-01"
              className="w-full px-3 py-2 text-xs font-mono uppercase border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-[11px] text-slate-400 mt-1">
              Unique identifier used in report cards, assessment codes, and transcripts.
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Description / Curriculum Syllabus Notes
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description of subject focus and scope..."
              className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
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
              {editingSubject ? 'Update Subject' : 'Add Subject'}
            </button>
          </div>
        </form>
      </Modal>

      {/* View Subject Class Offerings Modal */}
      <Modal
        isOpen={!!viewingSubject}
        onClose={() => setViewingSubject(null)}
        title={viewingSubject ? `Class Offerings: ${viewingSubject.name} (${viewingSubject.code})` : 'Subject Details'}
        size="lg"
      >
        {viewingSubject && (
          <div className="space-y-4">
            <p className="text-xs text-slate-600">
              Classes currently offering this subject in the curriculum, along with assigned subject teachers:
            </p>

            <div className="max-h-72 overflow-y-auto border border-slate-200 rounded-xl divide-y divide-slate-100">
              {classSubjects.filter((cs) => cs.subject_id === viewingSubject.id).length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-400">
                  This subject has not yet been assigned to any class curriculum.
                </div>
              ) : (
                classSubjects
                  .filter((cs) => cs.subject_id === viewingSubject.id)
                  .map((cs) => {
                    const cls = classes.find((c) => c.id === cs.class_id);
                    const teacher = allStaff.find((s) => s.id === cs.teacher_id);

                    return (
                      <div
                        key={cs.id}
                        className="p-3.5 flex items-center justify-between hover:bg-slate-50 transition text-xs"
                      >
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                            <Building2 className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="font-bold text-slate-900">{cls?.name || 'Class'}</div>
                            <div className="text-[11px] text-slate-400">
                              Level: {cls?.level} • Arm: {cls?.section}
                            </div>
                          </div>
                        </div>

                        <div className="text-right">
                          <div className="text-[10px] text-slate-400 uppercase font-semibold">
                            Assigned Teacher
                          </div>
                          {teacher ? (
                            <div className="font-semibold text-slate-800">
                              {teacher.first_name} {teacher.last_name} ({teacher.staff_code})
                            </div>
                          ) : (
                            <div className="text-amber-600 font-medium">Unassigned</div>
                          )}
                        </div>
                      </div>
                    );
                  })
              )}
            </div>

            <div className="flex justify-end pt-3">
              <button
                type="button"
                onClick={() => setViewingSubject(null)}
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
        isOpen={!!subjectToDelete}
        onClose={() => setSubjectToDelete(null)}
        title="Confirm Subject Deletion"
      >
        <div className="space-y-4">
          <div className="flex items-start gap-3 p-3.5 bg-rose-50 border border-rose-100 rounded-xl text-rose-800 text-xs">
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold block">Permanent Action</span>
              Are you sure you want to delete subject{' '}
              <strong className="font-bold">
                "{subjectToDelete?.name} ({subjectToDelete?.code})"
              </strong>
              ? This will remove its associations from classes and assessments.
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-3">
            <button
              type="button"
              onClick={() => setSubjectToDelete(null)}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleDeleteSubject}
              className="px-4 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-xs transition"
            >
              Delete Subject
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
