import React, { useState, useMemo } from 'react';
import { db } from '../../../db/storage';
import { useAuth } from '../../../context/AuthContext';
import { useToast } from '../../../context/ToastContext';
import { Assessment, AssessmentType, SchoolClass, Subject } from '../../../types';
import {
  FileSpreadsheet,
  Search,
  Filter,
  Trash2,
  Edit3,
  Download,
  Calendar,
  BookOpen,
  Award,
  Users,
  ChevronRight,
  TrendingUp,
  BarChart2,
  CheckCircle2,
} from 'lucide-react';

interface AssessmentHistoryTabProps {
  availableClasses: SchoolClass[];
  onOpenAssessmentScores: (assessment: Assessment) => void;
  onOpenCreateModal: () => void;
  refreshTrigger: number;
  onRefresh: () => void;
}

export const AssessmentHistoryTab: React.FC<AssessmentHistoryTabProps> = ({
  availableClasses,
  onOpenAssessmentScores,
  onOpenCreateModal,
  refreshTrigger,
  onRefresh,
}) => {
  const { user, staff, isTeacher, isSchoolAdmin, isSuperAdmin } = useAuth();
  const toast = useToast();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedClassFilter, setSelectedClassFilter] = useState<string>('ALL');
  const [selectedSubjectFilter, setSelectedSubjectFilter] = useState<string>('ALL');
  const [selectedTypeFilter, setSelectedTypeFilter] = useState<string>('ALL');
  const [selectedSessionFilter, setSelectedSessionFilter] = useState<string>('ALL');
  const [selectedTermFilter, setSelectedTermFilter] = useState<string>('ALL');
  const [assessmentToDelete, setAssessmentToDelete] = useState<Assessment | null>(null);

  const classes = db.getClasses();
  const subjects = db.getSubjects();
  const academicSessions = db.getAcademicSessions();
  const terms = db.getTerms();

  // Filter terms by selected academic session if one is picked
  const availableTerms = useMemo(() => {
    if (selectedSessionFilter === 'ALL') return terms;
    return terms.filter((t) => t.academic_session_id === selectedSessionFilter);
  }, [terms, selectedSessionFilter]);

  // Create staff name lookup map
  const staffMap = useMemo(() => {
    const map = new Map<string, string>();
    db.getStaff().forEach((s) => map.set(s.id, `${s.first_name} ${s.last_name}`));
    db.getUsers().forEach((u) => map.set(u.id, u.full_name));
    return map;
  }, []);

  // Filtered raw assessment records
  const allAssessments = useMemo(() => {
    let list = db.getAssessments();
    if (isTeacher && staff && !isSchoolAdmin && !isSuperAdmin) {
      const assignedClassIds = db.getClassesForTeacher(staff.id).map((c) => c.id);
      list = list.filter((a) => a.created_by === staff.id || assignedClassIds.includes(a.class_id));
    }
    return list;
  }, [refreshTrigger, isTeacher, staff, isSchoolAdmin, isSuperAdmin]);

  const filteredAssessments = useMemo(() => {
    return allAssessments.filter((a) => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        if (!a.title.toLowerCase().includes(q)) return false;
      }
      if (selectedClassFilter !== 'ALL' && a.class_id !== selectedClassFilter) return false;
      if (selectedSubjectFilter !== 'ALL' && a.subject_id !== selectedSubjectFilter) return false;
      if (selectedTypeFilter !== 'ALL' && a.assessment_type !== selectedTypeFilter) return false;
      if (selectedSessionFilter !== 'ALL' && a.academic_session_id && a.academic_session_id !== selectedSessionFilter) return false;
      if (selectedTermFilter !== 'ALL' && a.term_id && a.term_id !== selectedTermFilter) return false;
      return true;
    });
  }, [allAssessments, searchQuery, selectedClassFilter, selectedSubjectFilter, selectedTypeFilter, selectedSessionFilter, selectedTermFilter]);

  const hasActiveFilters =
    searchQuery.trim().length > 0 ||
    selectedClassFilter !== 'ALL' ||
    selectedSubjectFilter !== 'ALL' ||
    selectedTypeFilter !== 'ALL' ||
    selectedSessionFilter !== 'ALL' ||
    selectedTermFilter !== 'ALL';

  const handleResetFilters = () => {
    setSearchQuery('');
    setSelectedClassFilter('ALL');
    setSelectedSubjectFilter('ALL');
    setSelectedTypeFilter('ALL');
    setSelectedSessionFilter('ALL');
    setSelectedTermFilter('ALL');
  };

  // Overall statistics
  const summaryStats = useMemo(() => {
    const totalAssessments = filteredAssessments.length;
    let totalScoresLogged = 0;
    let sumPercentages = 0;
    let totalStatsCount = 0;

    filteredAssessments.forEach((a) => {
      const stats = db.getAssessmentStats(a.id);
      totalScoresLogged += stats.recordedCount;
      if (stats.recordedCount > 0) {
        sumPercentages += stats.averagePercentage;
        totalStatsCount++;
      }
    });

    const averagePct = totalStatsCount > 0 ? Math.round(sumPercentages / totalStatsCount) : 0;

    return {
      totalAssessments,
      totalScoresLogged,
      averagePct,
    };
  }, [filteredAssessments]);

  // Export assessment results to CSV
  const handleExportAssessmentCSV = (assessment: Assessment) => {
    const cls = db.getClassById(assessment.class_id);
    const sub = db.getSubjectById(assessment.subject_id);
    const scores = db.getScoresForAssessment(assessment.id);
    const students = db.getStudentsByClass(assessment.class_id);

    const headers = [
      'Student Name',
      'Admission Number',
      'Student Code',
      'Score',
      'Max Score',
      'Percentage',
      'Grade',
      'Remarks',
      'Date Marked',
    ];

    const rows = students.map((st) => {
      const scoreRec = scores.find((s) => s.student_id === st.id);
      const val = scoreRec ? scoreRec.score : 'N/A';
      const pct =
        scoreRec && assessment.maximum_score > 0
          ? `${Math.round((scoreRec.score / assessment.maximum_score) * 100)}%`
          : 'N/A';
      const numPct = scoreRec && assessment.maximum_score > 0 ? (scoreRec.score / assessment.maximum_score) * 100 : 0;
      const grade = scoreRec ? (numPct >= 80 ? 'A' : numPct >= 70 ? 'B' : numPct >= 60 ? 'C' : numPct >= 50 ? 'D' : 'F') : 'N/A';

      return [
        `"${st.first_name} ${st.last_name}"`,
        `"${st.admission_number}"`,
        `"${st.student_code}"`,
        val,
        assessment.maximum_score,
        pct,
        grade,
        `"${scoreRec?.feedback || ''}"`,
        scoreRec ? scoreRec.updated_at.split('T')[0] : '',
      ];
    });

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [
        `"Assessment: ${assessment.title}"`,
        `"Class: ${cls?.name || 'N/A'}","Subject: ${sub?.name || 'N/A'}","Type: ${assessment.assessment_type.toUpperCase()}","Date: ${assessment.assessment_date}"`,
        '',
        headers.join(','),
        ...rows.map((r) => r.join(',')),
      ].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute(
      'download',
      `Assessment_${assessment.title.replace(/[^a-zA-Z0-9]/g, '_')}_Results.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const confirmDelete = () => {
    if (!assessmentToDelete) return;
    try {
      const actor = user
        ? { id: staff?.id || user.id, name: user.full_name }
        : { id: 'admin', name: 'Authorized Staff' };

      db.deleteAssessment(assessmentToDelete.id, actor);
      toast.success(
        'Assessment Deleted',
        `"${assessmentToDelete.title}" and associated score records were successfully removed.`
      );
      setAssessmentToDelete(null);
      onRefresh();
    } catch (err: any) {
      toast.error('Deletion Failed', err.message || 'Could not delete assessment.');
    }
  };

  const getTypeBadge = (type: AssessmentType) => {
    switch (type) {
      case 'examination':
        return 'bg-purple-100 text-purple-800 border-purple-300';
      case 'test':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'quiz':
        return 'bg-emerald-100 text-emerald-800 border-emerald-300';
      case 'assignment':
        return 'bg-amber-100 text-amber-800 border-amber-300';
      case 'project':
        return 'bg-indigo-100 text-indigo-800 border-indigo-300';
      default:
        return 'bg-slate-100 text-slate-800 border-slate-300';
    }
  };

  return (
    <div className="space-y-5">
      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs flex items-center gap-3">
          <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl">
            <FileSpreadsheet className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-slate-500 font-medium">Total Assessments</div>
            <div className="text-xl font-extrabold text-slate-900">
              {summaryStats.totalAssessments}
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs flex items-center gap-3">
          <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-slate-500 font-medium">Total Scores Logged</div>
            <div className="text-xl font-extrabold text-emerald-900">
              {summaryStats.totalScoresLogged}
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs flex items-center gap-3">
          <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-slate-500 font-medium">Class Mean Performance</div>
            <div className="text-xl font-extrabold text-indigo-900">
              {summaryStats.averagePct}%
            </div>
          </div>
        </div>
      </div>

      {/* History Table Container */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        {/* Filters Toolbar */}
        <div className="p-4 border-b border-slate-100 flex flex-col gap-3 bg-slate-50/50">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="relative max-w-xs w-full">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search assessment title..."
                className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:border-blue-500 outline-none font-medium"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* Class Filter */}
              <select
                value={selectedClassFilter}
                onChange={(e) => setSelectedClassFilter(e.target.value)}
                className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 outline-none"
              >
                <option value="ALL">All Classes ({availableClasses.length})</option>
                {availableClasses.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>

              {/* Subject Filter */}
              <select
                value={selectedSubjectFilter}
                onChange={(e) => setSelectedSubjectFilter(e.target.value)}
                className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 outline-none"
              >
                <option value="ALL">All Subjects</option>
                {subjects.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.code})
                  </option>
                ))}
              </select>

              {/* Type Filter */}
              <select
                value={selectedTypeFilter}
                onChange={(e) => setSelectedTypeFilter(e.target.value)}
                className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 outline-none capitalize"
              >
                <option value="ALL">All Types</option>
                <option value="assignment">Assignment</option>
                <option value="quiz">Quiz</option>
                <option value="test">Test</option>
                <option value="project">Project</option>
                <option value="examination">Examination</option>
              </select>

              {/* Academic Session Filter */}
              <select
                value={selectedSessionFilter}
                onChange={(e) => {
                  setSelectedSessionFilter(e.target.value);
                  setSelectedTermFilter('ALL');
                }}
                className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 outline-none"
              >
                <option value="ALL">All Sessions</option>
                {academicSessions.map((ses) => (
                  <option key={ses.id} value={ses.id}>
                    {ses.name} {ses.is_active ? '(Current)' : ''}
                  </option>
                ))}
              </select>

              {/* Term Filter */}
              <select
                value={selectedTermFilter}
                onChange={(e) => setSelectedTermFilter(e.target.value)}
                className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 outline-none"
              >
                <option value="ALL">All Terms</option>
                {availableTerms.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>

              {hasActiveFilters && (
                <button
                  onClick={handleResetFilters}
                  className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition"
                >
                  Clear Filters
                </button>
              )}
            </div>
          </div>

          <div className="text-[11px] text-slate-500 flex items-center justify-between">
            <span>
              Showing <strong className="text-slate-800">{filteredAssessments.length}</strong> of{' '}
              <strong className="text-slate-800">{allAssessments.length}</strong> assessments
              {hasActiveFilters && ' (Filtered)'}
            </span>
          </div>
        </div>

        {/* History Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200 text-[10px] uppercase tracking-wider">
              <tr>
                <th className="px-4 py-3">Assessment Title & Type</th>
                <th className="px-4 py-3">Class & Subject</th>
                <th className="px-4 py-3 text-center">Max Score</th>
                <th className="px-4 py-3 text-center">Roster Progress</th>
                <th className="px-4 py-3 text-center">Class Stats (Avg / High / Low)</th>
                <th className="px-4 py-3">Recorded By & Date</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredAssessments.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-slate-400">
                    No assessment history records found matching your filters.
                  </td>
                </tr>
              ) : (
                filteredAssessments.map((a) => {
                  const cls = db.getClassById(a.class_id);
                  const sub = db.getSubjectById(a.subject_id);
                  const stats = db.getAssessmentStats(a.id);
                  const creatorName = staffMap.get(a.created_by) || 'Teacher';

                  return (
                    <tr key={a.id} className="hover:bg-slate-50/70 transition">
                      {/* Title & Type */}
                      <td className="px-4 py-3">
                        <div className="font-bold text-slate-900 text-xs sm:text-sm">
                          {a.title}
                        </div>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] uppercase font-bold border ${getTypeBadge(
                              a.assessment_type
                            )}`}
                          >
                            {a.assessment_type}
                          </span>
                        </div>
                      </td>

                      {/* Class & Subject */}
                      <td className="px-4 py-3">
                        <div className="font-bold text-slate-800">{cls?.name || 'Class'}</div>
                        <div className="text-[11px] text-slate-500 font-medium">
                          {sub?.name || 'Subject'} ({sub?.code || 'SUB'})
                        </div>
                      </td>

                      {/* Max Score */}
                      <td className="px-4 py-3 text-center">
                        <span className="font-extrabold text-slate-900 bg-slate-100 px-2.5 py-1 rounded-lg">
                          {a.maximum_score} pts
                        </span>
                      </td>

                      {/* Roster Progress */}
                      <td className="px-4 py-3 text-center">
                        <div className="inline-flex flex-col items-center">
                          <span className="font-bold text-slate-800">
                            {stats.recordedCount} / {stats.totalStudents}
                          </span>
                          <span className="text-[10px] text-slate-400 font-medium">
                            {stats.totalStudents > 0
                              ? `${Math.round((stats.recordedCount / stats.totalStudents) * 100)}% entered`
                              : '0% entered'}
                          </span>
                        </div>
                      </td>

                      {/* Stats */}
                      <td className="px-4 py-3 text-center">
                        {stats.recordedCount > 0 ? (
                          <div className="inline-flex flex-col items-center gap-0.5">
                            <span className="font-extrabold text-indigo-700 text-xs">
                              Avg: {stats.averageScore} ({stats.averagePercentage}%)
                            </span>
                            <span className="text-[10px] text-slate-400 font-mono">
                              High: {stats.highestScore} • Low: {stats.lowestScore}
                            </span>
                          </div>
                        ) : (
                          <span className="text-slate-300 italic text-[11px]">No scores entered</span>
                        )}
                      </td>

                      {/* Creator & Date */}
                      <td className="px-4 py-3">
                        <div className="font-semibold text-slate-800 text-[11px] truncate max-w-[140px]">
                          {creatorName}
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono">
                          {a.assessment_date}
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => onOpenAssessmentScores(a)}
                            className="px-2.5 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-xs font-bold transition inline-flex items-center gap-1"
                            title="Open in Gradebook"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                            <span>Scores</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleExportAssessmentCSV(a)}
                            className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg transition"
                            title="Export Results to CSV"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </button>

                          <button
                            type="button"
                            onClick={() => setAssessmentToDelete(a)}
                            className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg transition"
                            title="Delete Assessment"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
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

      {/* Delete Confirmation Modal */}
      {assessmentToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white max-w-md w-full rounded-2xl shadow-2xl border border-slate-200 p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="p-3 bg-rose-50 rounded-xl">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Delete Assessment</h3>
                <p className="text-xs text-slate-500">Confirm permanent removal</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Are you sure you want to delete <strong className="text-slate-900">"{assessmentToDelete.title}"</strong>? All associated student scores recorded for this assessment will also be removed.
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setAssessmentToDelete(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl transition"
              >
                Delete Assessment
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
