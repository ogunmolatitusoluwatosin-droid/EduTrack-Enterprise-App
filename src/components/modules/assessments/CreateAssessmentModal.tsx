import React, { useState, useEffect, useMemo } from 'react';
import { db } from '../../../db/storage';
import { useAuth } from '../../../context/AuthContext';
import { useToast } from '../../../context/ToastContext';
import { Assessment, AssessmentType, SchoolClass, Subject } from '../../../types';
import {
  FileSpreadsheet,
  Calendar,
  BookOpen,
  Award,
  Plus,
  Sparkles,
  X,
  Layers,
} from 'lucide-react';

interface CreateAssessmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (assessment: Assessment) => void;
  availableClasses: SchoolClass[];
  initialClassId?: string;
  initialSubjectId?: string;
}

const DEFAULT_MAX_SCORES: Record<AssessmentType, number> = {
  quiz: 10,
  assignment: 20,
  test: 30,
  project: 20,
  examination: 60,
};

export const CreateAssessmentModal: React.FC<CreateAssessmentModalProps> = ({
  isOpen,
  onClose,
  onCreated,
  availableClasses,
  initialClassId,
  initialSubjectId,
}) => {
  const { user, staff, isTeacher, isSchoolAdmin, isSuperAdmin } = useAuth();
  const toast = useToast();

  const [selectedClassId, setSelectedClassId] = useState<string>(
    initialClassId || availableClasses[0]?.id || ''
  );
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>(initialSubjectId || '');
  const [title, setTitle] = useState('');
  const [assessmentType, setAssessmentType] = useState<AssessmentType>('test');
  const [maximumScore, setMaximumScore] = useState<number>(30);
  const [assessmentDate, setAssessmentDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [selectedTermId, setSelectedTermId] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const terms = db.getTerms();
  const currentTerm = terms.find((t) => t.is_current) || terms[0];

  // Subjects available for selected class (and scoped to teacher if applicable)
  const availableSubjects = useMemo(() => {
    if (!selectedClassId) return [];
    if (isTeacher && staff && !isSchoolAdmin && !isSuperAdmin) {
      const teacherSubjects = db.getSubjectsForTeacherInClass(staff.id, selectedClassId);
      if (teacherSubjects.length > 0) return teacherSubjects;
    }
    return db.getSubjectsByClass(selectedClassId);
  }, [selectedClassId, isTeacher, staff, isSchoolAdmin, isSuperAdmin]);

  // Sync default values when modal opens or initial props change
  useEffect(() => {
    if (isOpen) {
      const clsId = initialClassId && availableClasses.some((c) => c.id === initialClassId)
        ? initialClassId
        : availableClasses[0]?.id || '';
      setSelectedClassId(clsId);

      const term = currentTerm?.id || terms[0]?.id || '';
      setSelectedTermId(term);

      setAssessmentDate(new Date().toISOString().split('T')[0]);
      setAssessmentType('test');
      setMaximumScore(30);
      setTitle('');
    }
  }, [isOpen, initialClassId, availableClasses]);

  // Update selected subject whenever class or availableSubjects change
  useEffect(() => {
    if (availableSubjects.length > 0) {
      if (initialSubjectId && availableSubjects.some((s) => s.id === initialSubjectId)) {
        setSelectedSubjectId(initialSubjectId);
      } else if (!availableSubjects.some((s) => s.id === selectedSubjectId)) {
        setSelectedSubjectId(availableSubjects[0].id);
      }
    } else {
      setSelectedSubjectId('');
    }
  }, [availableSubjects, initialSubjectId]);

  // Update default max score when assessment type changes
  const handleTypeChange = (type: AssessmentType) => {
    setAssessmentType(type);
    setMaximumScore(DEFAULT_MAX_SCORES[type] || 20);
  };

  const handleTitlePreset = (preset: string) => {
    setTitle(preset);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedClassId) {
      toast.error('Validation Error', 'Please select a class for the assessment.');
      return;
    }

    if (!selectedSubjectId) {
      toast.error('Validation Error', 'Please select a subject.');
      return;
    }

    if (!title.trim()) {
      toast.error('Validation Error', 'Please provide an assessment title.');
      return;
    }

    if (maximumScore <= 0) {
      toast.error('Validation Error', 'Maximum score must be greater than 0.');
      return;
    }

    if (maximumScore > 1000) {
      toast.error('Validation Error', 'Maximum score cannot exceed 1,000 points.');
      return;
    }

    if (!assessmentDate) {
      toast.error('Validation Error', 'Please select the assessment date.');
      return;
    }

    setIsSubmitting(true);
    try {
      const actor = user
        ? { id: staff?.id || user.id, name: user.full_name }
        : { id: 'admin', name: 'Authorized Staff' };

      const currentSession = db.getSessions().find((s) => s.is_current) || db.getSessions()[0];

      const newAssessment = db.createAssessment(
        {
          title: title.trim(),
          assessment_type: assessmentType,
          class_id: selectedClassId,
          subject_id: selectedSubjectId,
          maximum_score: Number(maximumScore),
          assessment_date: assessmentDate,
          term_id: selectedTermId || undefined,
          academic_session_id: currentSession?.id || undefined,
          created_by: actor.id,
        },
        actor
      );

      toast.success(
        'Assessment Created',
        `"${newAssessment.title}" created successfully. You can now enter student scores.`
      );
      onCreated(newAssessment);
      onClose();
    } catch (err: any) {
      toast.error('Creation Failed', err.message || 'Could not create assessment.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white max-w-xl w-full rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-white/15 rounded-xl">
              <FileSpreadsheet className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-base font-bold">Create New Assessment</h3>
              <p className="text-xs text-blue-100">Set assessment parameters to begin scoring students</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Step 1 & 2: Class & Subject */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Class <span className="text-rose-500">*</span>
              </label>
              <select
                value={selectedClassId}
                onChange={(e) => setSelectedClassId(e.target.value)}
                className="w-full px-3.5 py-2.5 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-blue-500 font-semibold text-slate-800 outline-none"
                required
              >
                {availableClasses.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.level})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Subject <span className="text-rose-500">*</span>
              </label>
              {availableSubjects.length === 0 ? (
                <div className="px-3.5 py-2.5 text-xs bg-amber-50 text-amber-800 border border-amber-200 rounded-xl font-medium">
                  No subjects assigned to this class.
                </div>
              ) : (
                <select
                  value={selectedSubjectId}
                  onChange={(e) => setSelectedSubjectId(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-blue-500 font-semibold text-slate-800 outline-none"
                  required
                >
                  {availableSubjects.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.code})
                    </option>
                  ))}
                </select>
              )}
            </div>
          </div>

          {/* Assessment Type Selector Chips */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Assessment Type <span className="text-rose-500">*</span>
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              {(['assignment', 'quiz', 'test', 'project', 'examination'] as AssessmentType[]).map((type) => {
                const isSelected = assessmentType === type;
                const typeName = type.charAt(0).toUpperCase() + type.slice(1);
                return (
                  <button
                    key={type}
                    type="button"
                    onClick={() => handleTypeChange(type)}
                    className={`py-2 px-2 rounded-xl text-xs font-bold border transition text-center ${
                      isSelected
                        ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                        : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                    }`}
                  >
                    {typeName}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Assessment Title with quick presets */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-bold text-slate-700">
                Assessment Title <span className="text-rose-500">*</span>
              </label>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => handleTitlePreset('Continuous Assessment 1')}
                  className="px-2 py-0.5 text-[10px] bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-md transition"
                >
                  CA 1
                </button>
                <button
                  type="button"
                  onClick={() => handleTitlePreset('Mid-Term Test')}
                  className="px-2 py-0.5 text-[10px] bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-md transition"
                >
                  Mid-Term
                </button>
                <button
                  type="button"
                  onClick={() => handleTitlePreset('Term Final Examination')}
                  className="px-2 py-0.5 text-[10px] bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-md transition"
                >
                  Final Exam
                </button>
              </div>
            </div>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Chapter 4 Quiz, Term 1 Exam, Practical Project"
              className="w-full px-3.5 py-2.5 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-blue-500 font-semibold text-slate-800 outline-none"
              required
            />
          </div>

          {/* Maximum Score, Date & Academic Term */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Maximum Score <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="number"
                  min={1}
                  max={1000}
                  value={maximumScore}
                  onChange={(e) => setMaximumScore(Number(e.target.value))}
                  className="w-full px-3.5 py-2.5 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-blue-500 font-bold text-slate-900 outline-none"
                  required
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] font-semibold text-slate-400">
                  pts
                </span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Assessment Date <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                value={assessmentDate}
                onChange={(e) => setAssessmentDate(e.target.value)}
                className="w-full px-3.5 py-2.5 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-blue-500 font-semibold text-slate-800 outline-none"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">Academic Term</label>
              <select
                value={selectedTermId}
                onChange={(e) => setSelectedTermId(e.target.value)}
                className="w-full px-3.5 py-2.5 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-blue-500 font-semibold text-slate-800 outline-none"
              >
                {terms.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} {t.is_current ? '(Current)' : ''}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs sm:text-sm font-bold rounded-xl transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || availableSubjects.length === 0}
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-bold rounded-xl shadow-sm transition flex items-center gap-2 disabled:opacity-50"
            >
              <Plus className="w-4 h-4" />
              <span>{isSubmitting ? 'Creating...' : 'Create & Enter Scores'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
