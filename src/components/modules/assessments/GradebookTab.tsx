import React, { useState, useEffect, useMemo } from 'react';
import { db } from '../../../db/storage';
import { useAuth } from '../../../context/AuthContext';
import { useToast } from '../../../context/ToastContext';
import { Assessment, SchoolClass, Subject, Student, AssessmentScore } from '../../../types';
import {
  FileSpreadsheet,
  Plus,
  Save,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  Award,
  Users,
  Search,
  BookOpen,
  Calendar,
  Sparkles,
  HelpCircle,
  RotateCcw,
  Check,
  Percent,
} from 'lucide-react';

interface GradebookTabProps {
  availableClasses: SchoolClass[];
  selectedClassId: string;
  onSelectClassId: (id: string) => void;
  selectedSubjectId: string;
  onSelectSubjectId: (id: string) => void;
  selectedAssessmentId: string;
  onSelectAssessmentId: (id: string) => void;
  onOpenCreateModal: () => void;
  onOpenStudentModal: (student: Student) => void;
}

export const GradebookTab: React.FC<GradebookTabProps> = ({
  availableClasses,
  selectedClassId,
  onSelectClassId,
  selectedSubjectId,
  onSelectSubjectId,
  selectedAssessmentId,
  onSelectAssessmentId,
  onOpenCreateModal,
  onOpenStudentModal,
}) => {
  const { user, staff, isTeacher, isSchoolAdmin, isSuperAdmin } = useAuth();
  const toast = useToast();

  // Search filter inside student roster
  const [studentSearch, setStudentSearch] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Editable scores map: studentId -> { score: string, feedback: string, error?: string }
  const [scoresState, setScoresState] = useState<
    Record<string, { score: string; feedback: string }>
  >({});
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Available subjects for the currently selected class
  const availableSubjects = useMemo(() => {
    if (!selectedClassId) return [];
    if (isTeacher && staff && !isSchoolAdmin && !isSuperAdmin) {
      const teacherSubjects = db.getSubjectsForTeacherInClass(staff.id, selectedClassId);
      if (teacherSubjects.length > 0) return teacherSubjects;
    }
    return db.getSubjectsByClass(selectedClassId);
  }, [selectedClassId, isTeacher, staff, isSchoolAdmin, isSuperAdmin]);

  // Sync selected subject if previous selection is invalid for new class
  useEffect(() => {
    if (availableSubjects.length > 0) {
      if (!availableSubjects.some((s) => s.id === selectedSubjectId)) {
        onSelectSubjectId(availableSubjects[0].id);
      }
    } else {
      onSelectSubjectId('');
    }
  }, [availableSubjects, selectedSubjectId, onSelectSubjectId]);

  // All assessments for selected class & subject
  const assessmentsForSelection = useMemo(() => {
    if (!selectedClassId || !selectedSubjectId) return [];
    return db.getAssessments(selectedClassId, selectedSubjectId);
  }, [selectedClassId, selectedSubjectId]);

  // Sync selected assessment
  useEffect(() => {
    if (assessmentsForSelection.length > 0) {
      if (!assessmentsForSelection.some((a) => a.id === selectedAssessmentId)) {
        onSelectAssessmentId(assessmentsForSelection[0].id);
      }
    } else {
      onSelectAssessmentId('');
    }
  }, [assessmentsForSelection, selectedAssessmentId, onSelectAssessmentId]);

  const currentAssessment = useMemo(() => {
    return selectedAssessmentId ? db.getAssessmentById(selectedAssessmentId) : null;
  }, [selectedAssessmentId]);

  // Eligible students in class (active students)
  const eligibleStudents = useMemo(() => {
    if (!selectedClassId) return [];
    return db
      .getStudentsByClass(selectedClassId)
      .filter((s) => s.student_status === 'active')
      .sort((a, b) => a.first_name.localeCompare(b.first_name));
  }, [selectedClassId]);

  // Load existing scores whenever currentAssessment changes
  useEffect(() => {
    if (!currentAssessment) {
      setScoresState({});
      setHasUnsavedChanges(false);
      return;
    }

    const existingScores = db.getScoresForAssessment(currentAssessment.id);
    const initialMap: Record<string, { score: string; feedback: string }> = {};

    eligibleStudents.forEach((student) => {
      const match = existingScores.find((s) => s.student_id === student.id);
      initialMap[student.id] = {
        score: match ? String(match.score) : '',
        feedback: match?.feedback || '',
      };
    });

    setScoresState(initialMap);
    setHasUnsavedChanges(false);
  }, [currentAssessment, eligibleStudents]);

  // Real-time score validation
  const validationErrors = useMemo(() => {
    if (!currentAssessment) return {};
    const errors: Record<string, string> = {};
    const maxScore = currentAssessment.maximum_score;

    (Object.entries(scoresState) as Array<[string, { score: string; feedback: string }]>).forEach(
      ([studentId, data]) => {
        if (data.score !== '') {
          const num = Number(data.score);
          if (isNaN(num)) {
            errors[studentId] = 'Must be a valid number';
          } else if (num < 0) {
            errors[studentId] = 'Score cannot be negative';
          } else if (num > maxScore) {
            errors[studentId] = `Score cannot exceed max score (${maxScore})`;
          }
        }
      }
    );

    return errors;
  }, [scoresState, currentAssessment]);

  const hasErrors = Object.keys(validationErrors).length > 0;

  // Real-time calculation of statistics
  const liveStats = useMemo(() => {
    if (!currentAssessment) {
      return {
        totalEligible: eligibleStudents.length,
        scoredCount: 0,
        highestScore: 0,
        lowestScore: 0,
        averageScore: 0,
        averagePercentage: 0,
        passRate: 0,
      };
    }

    const validScores: number[] = [];
    let passCount = 0;
    const maxScore = currentAssessment.maximum_score || 100;

    (Object.entries(scoresState) as Array<[string, { score: string; feedback: string }]>).forEach(
      ([studentId, data]) => {
        if (data.score !== '' && !validationErrors[studentId]) {
          const num = Number(data.score);
          if (!isNaN(num) && num >= 0 && num <= maxScore) {
            validScores.push(num);
            if (num / maxScore >= 0.5) passCount++;
          }
        }
      }
    );

    if (validScores.length === 0) {
      return {
        totalEligible: eligibleStudents.length,
        scoredCount: 0,
        highestScore: 0,
        lowestScore: 0,
        averageScore: 0,
        averagePercentage: 0,
        passRate: 0,
      };
    }

    const highestScore = Math.max(...validScores);
    const lowestScore = Math.min(...validScores);
    const sum = validScores.reduce((a, b) => a + b, 0);
    const averageScore = Math.round((sum / validScores.length) * 10) / 10;
    const averagePercentage = maxScore > 0 ? Math.round((averageScore / maxScore) * 100) : 0;
    const passRate = Math.round((passCount / validScores.length) * 100);

    return {
      totalEligible: eligibleStudents.length,
      scoredCount: validScores.length,
      highestScore,
      lowestScore,
      averageScore,
      averagePercentage,
      passRate,
    };
  }, [scoresState, validationErrors, eligibleStudents, currentAssessment]);

  // Handle individual score update
  const handleScoreChange = (studentId: string, value: string) => {
    setScoresState((prev) => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        score: value,
      },
    }));
    setHasUnsavedChanges(true);
  };

  // Handle feedback text change
  const handleFeedbackChange = (studentId: string, feedback: string) => {
    setScoresState((prev) => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        feedback,
      },
    }));
    setHasUnsavedChanges(true);
  };

  // Quick feedback chip clicked
  const handleQuickFeedback = (studentId: string, chipText: string) => {
    const current = scoresState[studentId]?.feedback || '';
    const newFeedback = current ? `${current}, ${chipText}` : chipText;
    handleFeedbackChange(studentId, newFeedback);
  };

  // Save all entered scores
  const handleSaveScores = () => {
    if (!currentAssessment) return;

    if (hasErrors) {
      toast.error('Validation Error', 'Please correct invalid scores before saving.');
      return;
    }

    setIsSaving(true);
    try {
      const actor = user
        ? { id: staff?.id || user.id, name: user.full_name }
        : { id: 'admin', name: 'Authorized Staff' };

      const batchToSave: Array<{
        student_id: string;
        score: number;
        feedback?: string;
      }> = [];

      (Object.entries(scoresState) as Array<[string, { score: string; feedback: string }]>).forEach(
        ([studentId, data]) => {
          if (data.score !== '') {
            batchToSave.push({
              student_id: studentId,
              score: Number(data.score),
              feedback: data.feedback?.trim() || undefined,
            });
          }
        }
      );

      if (batchToSave.length === 0) {
        toast.warning('No Scores', 'No student scores were entered.');
        setIsSaving(false);
        return;
      }

      const result = db.saveAssessmentScoresBatch(currentAssessment.id, batchToSave, actor);

      toast.success(
        'Scores Saved Successfully',
        `Recorded ${result.saved} new score(s) and updated ${result.updated} existing score(s) for "${currentAssessment.title}".`
      );
      setHasUnsavedChanges(false);
    } catch (err: any) {
      toast.error('Save Failed', err.message || 'Could not save assessment scores.');
    } finally {
      setIsSaving(false);
    }
  };

  // Filter students by name or code
  const filteredStudents = useMemo(() => {
    if (!studentSearch.trim()) return eligibleStudents;
    const q = studentSearch.toLowerCase();
    return eligibleStudents.filter(
      (s) =>
        s.first_name.toLowerCase().includes(q) ||
        s.last_name.toLowerCase().includes(q) ||
        s.student_code.toLowerCase().includes(q) ||
        s.admission_number.toLowerCase().includes(q)
    );
  }, [eligibleStudents, studentSearch]);

  const getScoreGrade = (scoreVal: number, maxVal: number) => {
    if (maxVal <= 0) return null;
    const pct = (scoreVal / maxVal) * 100;
    if (pct >= 80) return { label: 'A', bg: 'bg-emerald-100 text-emerald-800 border-emerald-300' };
    if (pct >= 70) return { label: 'B', bg: 'bg-blue-100 text-blue-800 border-blue-300' };
    if (pct >= 60) return { label: 'C', bg: 'bg-amber-100 text-amber-800 border-amber-300' };
    if (pct >= 50) return { label: 'D', bg: 'bg-orange-100 text-orange-800 border-orange-300' };
    return { label: 'F', bg: 'bg-rose-100 text-rose-800 border-rose-300' };
  };

  return (
    <div className="space-y-5">
      {/* Top Filter Selection Card (Step 1: Class, Step 2: Subject, Step 3: Assessment) */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3.5">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900">Score Entry Gradebook</h2>
              <p className="text-xs text-slate-500">
                Select your assigned class and subject to score assessments
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onOpenCreateModal}
            className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-2 shadow-xs"
          >
            <Plus className="w-4 h-4" />
            <span>Create New Assessment</span>
          </button>
        </div>

        {/* 3 Step Selectors */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* 1. Class */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1.5 flex items-center gap-1.5">
              <span className="w-4 h-4 rounded-full bg-blue-100 text-blue-700 text-[10px] flex items-center justify-center font-bold">
                1
              </span>
              <span>Select Class</span>
            </label>
            <select
              value={selectedClassId}
              onChange={(e) => onSelectClassId(e.target.value)}
              className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:bg-white focus:border-blue-500 outline-none"
            >
              {availableClasses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.level})
                </option>
              ))}
            </select>
          </div>

          {/* 2. Subject */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1.5 flex items-center gap-1.5">
              <span className="w-4 h-4 rounded-full bg-blue-100 text-blue-700 text-[10px] flex items-center justify-center font-bold">
                2
              </span>
              <span>Select Subject</span>
            </label>
            {availableSubjects.length === 0 ? (
              <div className="px-3 py-2 text-xs bg-amber-50 text-amber-800 border border-amber-200 rounded-xl">
                No subjects assigned.
              </div>
            ) : (
              <select
                value={selectedSubjectId}
                onChange={(e) => onSelectSubjectId(e.target.value)}
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:bg-white focus:border-blue-500 outline-none"
              >
                {availableSubjects.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.code})
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* 3. Assessment */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1.5 flex items-center gap-1.5">
              <span className="w-4 h-4 rounded-full bg-blue-100 text-blue-700 text-[10px] flex items-center justify-center font-bold">
                3
              </span>
              <span>Select Assessment</span>
            </label>
            {assessmentsForSelection.length === 0 ? (
              <div className="flex items-center gap-2">
                <div className="px-3 py-2 text-xs bg-slate-100 text-slate-600 border border-slate-200 rounded-xl flex-1 truncate">
                  No assessments yet
                </div>
                <button
                  type="button"
                  onClick={onOpenCreateModal}
                  className="px-2.5 py-2 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-xl text-xs font-bold transition shrink-0"
                >
                  + Add
                </button>
              </div>
            ) : (
              <select
                value={selectedAssessmentId}
                onChange={(e) => onSelectAssessmentId(e.target.value)}
                className="w-full px-3 py-2.5 bg-blue-50/60 border border-blue-200 rounded-xl text-xs font-bold text-blue-900 focus:bg-white focus:border-blue-500 outline-none"
              >
                {assessmentsForSelection.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.title} ({a.assessment_type.toUpperCase()} • Max: {a.maximum_score} pts •{' '}
                    {a.assessment_date})
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>

        {/* Selected Assessment Metadata Strip */}
        {currentAssessment && (
          <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex flex-wrap items-center gap-3">
              <span className="font-extrabold text-slate-900 text-sm">
                {currentAssessment.title}
              </span>
              <span className="px-2 py-0.5 rounded-md font-bold uppercase tracking-wider text-[10px] bg-indigo-50 text-indigo-700 border border-indigo-200">
                {currentAssessment.assessment_type}
              </span>
              <span className="text-slate-500 font-medium">
                Max Score:{' '}
                <strong className="text-slate-900">{currentAssessment.maximum_score} pts</strong>
              </span>
              <span className="text-slate-500 font-medium">
                Date: <strong className="text-slate-900">{currentAssessment.assessment_date}</strong>
              </span>
            </div>

            {hasUnsavedChanges && (
              <div className="flex items-center gap-1.5 text-amber-700 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200 text-[11px] font-bold animate-pulse">
                <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                <span>You have unsaved score changes</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Live Summary Statistics Strip */}
      {currentAssessment && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs">
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Eligible Students
            </div>
            <div className="text-xl font-extrabold text-slate-800 mt-0.5">
              {liveStats.totalEligible}
            </div>
            <div className="text-[10px] text-slate-500 font-medium">Active roster</div>
          </div>

          <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs">
            <div className="text-[10px] font-bold uppercase tracking-wider text-blue-600">
              Scores Recorded
            </div>
            <div className="text-xl font-extrabold text-blue-900 mt-0.5">
              {liveStats.scoredCount} / {liveStats.totalEligible}
            </div>
            <div className="text-[10px] text-blue-600 font-medium">
              {liveStats.totalEligible > 0
                ? Math.round((liveStats.scoredCount / liveStats.totalEligible) * 100)
                : 0}
              % completed
            </div>
          </div>

          <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs">
            <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-600">
              Highest Score
            </div>
            <div className="text-xl font-extrabold text-emerald-900 mt-0.5">
              {liveStats.scoredCount > 0 ? liveStats.highestScore : '—'}
            </div>
            <div className="text-[10px] text-emerald-600 font-medium">
              out of {currentAssessment.maximum_score}
            </div>
          </div>

          <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs">
            <div className="text-[10px] font-bold uppercase tracking-wider text-rose-600">
              Lowest Score
            </div>
            <div className="text-xl font-extrabold text-rose-900 mt-0.5">
              {liveStats.scoredCount > 0 ? liveStats.lowestScore : '—'}
            </div>
            <div className="text-[10px] text-rose-600 font-medium">minimum mark</div>
          </div>

          <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs">
            <div className="text-[10px] font-bold uppercase tracking-wider text-indigo-600">
              Class Average
            </div>
            <div className="text-xl font-extrabold text-indigo-900 mt-0.5">
              {liveStats.scoredCount > 0 ? liveStats.averageScore : '—'}
            </div>
            <div className="text-[10px] text-indigo-600 font-medium">
              Mean: {liveStats.averagePercentage}%
            </div>
          </div>

          <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs">
            <div className="text-[10px] font-bold uppercase tracking-wider text-purple-600">
              Passing Rate
            </div>
            <div className="text-xl font-extrabold text-purple-900 mt-0.5">
              {liveStats.scoredCount > 0 ? `${liveStats.passRate}%` : '—'}
            </div>
            <div className="text-[10px] text-purple-600 font-medium">Score ≥ 50%</div>
          </div>
        </div>
      )}

      {/* Main Student Score Input Grid */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        {/* Table Toolbar */}
        <div className="p-4 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3 bg-slate-50/50">
          <div className="relative max-w-xs w-full">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={studentSearch}
              onChange={(e) => setStudentSearch(e.target.value)}
              placeholder="Search student name or ID..."
              className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:border-blue-500 outline-none font-medium"
            />
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleSaveScores}
              disabled={isSaving || !currentAssessment || hasErrors}
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-2 shadow-sm disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{isSaving ? 'Saving Scores...' : 'Save All Scores'}</span>
            </button>
          </div>
        </div>

        {/* Roster & Scores Table */}
        {!currentAssessment ? (
          <div className="p-12 text-center space-y-3">
            <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl mx-auto flex items-center justify-center">
              <FileSpreadsheet className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-slate-800">No Assessment Selected</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Please create an assessment or select an existing one above to begin entering student marks.
            </p>
            <button
              type="button"
              onClick={onOpenCreateModal}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition inline-flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>Create Assessment Now</span>
            </button>
          </div>
        ) : filteredStudents.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-xs">
            No active students found in this class.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200 text-[10px] uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-3 w-12 text-center">#</th>
                  <th className="px-4 py-3">Student Details</th>
                  <th className="px-4 py-3 w-36">Score (Max: {currentAssessment.maximum_score})</th>
                  <th className="px-4 py-3 w-28 text-center">Percentage & Grade</th>
                  <th className="px-4 py-3 min-w-[240px]">Teacher Feedback / Remarks</th>
                  <th className="px-4 py-3 w-28 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredStudents.map((student, idx) => {
                  const data = scoresState[student.id] || { score: '', feedback: '' };
                  const error = validationErrors[student.id];
                  const numScore = data.score !== '' ? Number(data.score) : null;
                  const isValidScore = numScore !== null && !isNaN(numScore) && !error;
                  const percentage =
                    isValidScore && currentAssessment.maximum_score > 0
                      ? Math.round((numScore! / currentAssessment.maximum_score) * 100)
                      : null;
                  const grade = isValidScore
                    ? getScoreGrade(numScore!, currentAssessment.maximum_score)
                    : null;

                  return (
                    <tr
                      key={student.id}
                      className={`hover:bg-slate-50/60 transition ${
                        error ? 'bg-rose-50/30' : ''
                      }`}
                    >
                      {/* Row Index */}
                      <td className="px-4 py-3 text-center text-slate-400 font-mono text-[11px]">
                        {idx + 1}
                      </td>

                      {/* Student Info */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          {student.profile_photo_url ? (
                            <img
                              src={student.profile_photo_url}
                              alt={student.first_name}
                              referrerPolicy="no-referrer"
                              className="w-8 h-8 rounded-full object-cover shrink-0 border border-slate-200"
                            />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-600 font-bold text-xs flex items-center justify-center shrink-0 border border-slate-200">
                              {student.first_name[0]}
                              {student.last_name[0]}
                            </div>
                          )}
                          <div>
                            <button
                              type="button"
                              onClick={() => onOpenStudentModal(student)}
                              className="font-bold text-slate-900 hover:text-blue-600 transition text-left"
                            >
                              {student.first_name} {student.middle_name ? `${student.middle_name} ` : ''}{student.last_name}
                            </button>
                            <div className="text-[10px] text-slate-400 font-mono">
                              {student.student_code} • Adm: {student.admission_number}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Score Input */}
                      <td className="px-4 py-3">
                        <div className="space-y-1">
                          <div className="relative">
                            <input
                              type="number"
                              step="any"
                              min={0}
                              max={currentAssessment.maximum_score}
                              value={data.score}
                              onChange={(e) => handleScoreChange(student.id, e.target.value)}
                              placeholder={`0 - ${currentAssessment.maximum_score}`}
                              className={`w-full px-3 py-2 rounded-xl text-xs font-bold transition outline-none ${
                                error
                                  ? 'bg-rose-50 border-2 border-rose-400 text-rose-900'
                                  : data.score !== ''
                                  ? 'bg-blue-50/50 border border-blue-300 text-blue-900 focus:bg-white focus:border-blue-500'
                                  : 'bg-slate-50 border border-slate-200 text-slate-800 focus:bg-white focus:border-blue-500'
                              }`}
                            />
                            {data.score !== '' && !error && (
                              <Check className="w-3.5 h-3.5 text-emerald-600 absolute right-2.5 top-1/2 -translate-y-1/2" />
                            )}
                          </div>
                          {error && (
                            <div className="text-[10px] text-rose-600 font-bold flex items-center gap-1">
                              <AlertCircle className="w-3 h-3 shrink-0" />
                              <span>{error}</span>
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Percentage & Grade */}
                      <td className="px-4 py-3 text-center">
                        {isValidScore && grade ? (
                          <div className="inline-flex flex-col items-center">
                            <span
                              className={`px-2 py-0.5 rounded-md text-[10px] font-extrabold border ${grade.bg}`}
                            >
                              Grade {grade.label} ({percentage}%)
                            </span>
                          </div>
                        ) : (
                          <span className="text-slate-300 text-[11px]">—</span>
                        )}
                      </td>

                      {/* Teacher Feedback */}
                      <td className="px-4 py-3">
                        <div className="space-y-1.5">
                          <input
                            type="text"
                            value={data.feedback}
                            onChange={(e) => handleFeedbackChange(student.id, e.target.value)}
                            placeholder="Add remarks or feedback..."
                            className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:bg-white focus:border-blue-500 outline-none"
                          />
                          {/* Quick Feedback Chips */}
                          <div className="flex flex-wrap gap-1">
                            {['Excellent', 'Good effort', 'Needs review', 'Absent'].map((chip) => (
                              <button
                                key={chip}
                                type="button"
                                onClick={() => handleQuickFeedback(student.id, chip)}
                                className="px-1.5 py-0.5 text-[9px] font-semibold bg-slate-100 hover:bg-slate-200 text-slate-600 rounded transition"
                              >
                                + {chip}
                              </button>
                            ))}
                          </div>
                        </div>
                      </td>

                      {/* View History Action */}
                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          onClick={() => onOpenStudentModal(student)}
                          className="px-2.5 py-1.5 bg-slate-100 hover:bg-blue-50 hover:text-blue-600 text-slate-600 rounded-lg text-xs font-semibold transition inline-flex items-center gap-1"
                        >
                          <span>History</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Footer Save Bar */}
        {currentAssessment && filteredStudents.length > 0 && (
          <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
            <div className="text-xs text-slate-500">
              Showing <strong className="text-slate-800">{filteredStudents.length}</strong> eligible student(s). Scores are recorded and attributed to your staff credentials.
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleSaveScores}
                disabled={isSaving || hasErrors}
                className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-2 shadow-sm disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                <span>{isSaving ? 'Saving Scores...' : 'Save All Scores'}</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
