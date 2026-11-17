import React, { useMemo } from 'react';
import { db } from '../../../db/storage';
import { Student, AssessmentScore, Assessment } from '../../../types';
import {
  Award,
  BookOpen,
  Calendar,
  CheckCircle2,
  Download,
  TrendingUp,
  X,
  FileText,
  Clock,
  Sparkles,
  User,
} from 'lucide-react';

interface StudentAssessmentModalProps {
  student: Student | null;
  onClose: () => void;
}

export const StudentAssessmentModal: React.FC<StudentAssessmentModalProps> = ({
  student,
  onClose,
}) => {
  if (!student) return null;

  const rawHistory = db.getScoresForStudent(student.id);
  const schoolClass = student.current_class_id ? db.getClassById(student.current_class_id) : undefined;

  const staffMap = useMemo(() => {
    const map = new Map<string, string>();
    db.getStaff().forEach((s) => map.set(s.id, `${s.first_name} ${s.last_name}`));
    db.getUsers().forEach((u) => map.set(u.id, u.full_name));
    return map;
  }, []);

  // Calculate statistics
  const stats = useMemo(() => {
    if (rawHistory.length === 0) {
      return {
        total: 0,
        averagePercentage: 0,
        highestPercentage: 0,
        lowestPercentage: 0,
        passRate: 0,
        subjectsCount: 0,
      };
    }

    let sumPercentage = 0;
    let highest = 0;
    let lowest = 100;
    let passed = 0;
    const subjects = new Set<string>();

    rawHistory.forEach(({ score, assessment }) => {
      const max = assessment.maximum_score || 100;
      const pct = max > 0 ? (score.score / max) * 100 : 0;
      sumPercentage += pct;
      if (pct > highest) highest = pct;
      if (pct < lowest) lowest = pct;
      if (pct >= 50) passed++;
      if (assessment.subject_id) subjects.add(assessment.subject_id);
    });

    const averagePercentage = Math.round(sumPercentage / rawHistory.length);
    const passRate = Math.round((passed / rawHistory.length) * 100);

    return {
      total: rawHistory.length,
      averagePercentage,
      highestPercentage: Math.round(highest),
      lowestPercentage: Math.round(lowest),
      passRate,
      subjectsCount: subjects.size,
    };
  }, [rawHistory]);

  // Group performance by subject
  const subjectBreakdown = useMemo(() => {
    const map = new Map<string, { name: string; code: string; count: number; sumPct: number }>();

    rawHistory.forEach(({ score, assessment, subject }) => {
      const subName = subject?.name || 'General';
      const subCode = subject?.code || 'GEN';
      const key = assessment.subject_id || subName;
      const max = assessment.maximum_score || 100;
      const pct = max > 0 ? (score.score / max) * 100 : 0;

      if (!map.has(key)) {
        map.set(key, { name: subName, code: subCode, count: 0, sumPct: 0 });
      }
      const entry = map.get(key)!;
      entry.count++;
      entry.sumPct += pct;
    });

    return Array.from(map.values()).map((s) => ({
      ...s,
      average: Math.round(s.sumPct / s.count),
    })).sort((a, b) => b.average - a.average);
  }, [rawHistory]);

  const getGradePill = (percentage: number) => {
    if (percentage >= 80) {
      return <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-300">A ({percentage}%)</span>;
    }
    if (percentage >= 70) {
      return <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-blue-100 text-blue-800 border border-blue-300">B ({percentage}%)</span>;
    }
    if (percentage >= 60) {
      return <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-amber-100 text-amber-800 border border-amber-300">C ({percentage}%)</span>;
    }
    if (percentage >= 50) {
      return <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-orange-100 text-orange-800 border border-orange-300">D ({percentage}%)</span>;
    }
    return <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-rose-100 text-rose-800 border border-rose-300">F ({percentage}%)</span>;
  };

  const handleExportCSV = () => {
    const headers = ['Assessment Title', 'Subject', 'Type', 'Date', 'Score', 'Max Score', 'Percentage', 'Grade', 'Remarks', 'Recorded By'];
    const rows = rawHistory.map(({ score, assessment, subject }) => {
      const max = assessment.maximum_score || 100;
      const pct = max > 0 ? Math.round((score.score / max) * 100) : 0;
      const grade = pct >= 80 ? 'A' : pct >= 70 ? 'B' : pct >= 60 ? 'C' : pct >= 50 ? 'D' : 'F';
      const recorder = staffMap.get(score.recorded_by) || 'Teacher';
      return [
        `"${assessment.title}"`,
        `"${subject?.name || 'Subject'}"`,
        assessment.assessment_type.toUpperCase(),
        assessment.assessment_date,
        score.score,
        max,
        `${pct}%`,
        grade,
        `"${score.feedback || ''}"`,
        `"${recorder}"`,
      ];
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Assessment_Record_${student.first_name}_${student.last_name}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white max-w-3xl w-full rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-150 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-blue-700 to-indigo-800 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            {student.profile_photo_url ? (
              <img
                src={student.profile_photo_url}
                alt={student.first_name}
                referrerPolicy="no-referrer"
                className="w-11 h-11 rounded-xl object-cover border-2 border-white/30 shrink-0 shadow-xs"
              />
            ) : (
              <div className="w-11 h-11 rounded-xl bg-white/20 text-white font-bold text-base flex items-center justify-center border border-white/20 shrink-0">
                {student.first_name[0]}
                {student.last_name[0]}
              </div>
            )}
            <div>
              <h3 className="text-base font-bold">
                {student.first_name} {student.middle_name ? `${student.middle_name} ` : ''}{student.last_name}
              </h3>
              <p className="text-xs text-blue-100 font-mono">
                {student.student_code} • {schoolClass?.name || 'Class'} • Adm: {student.admission_number}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleExportCSV}
              className="px-2.5 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-semibold transition flex items-center gap-1.5"
              title="Export Report Card to CSV"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export CSV</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-6 overflow-y-auto flex-1">
          {/* Key Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3.5 bg-blue-50/70 rounded-xl border border-blue-100">
              <div className="text-[11px] font-bold text-blue-800">Overall Average</div>
              <div className="text-xl font-extrabold text-blue-900 mt-0.5">
                {stats.averagePercentage}%
              </div>
              <div className="text-[10px] text-blue-600 font-medium">
                {stats.total} total assessments
              </div>
            </div>

            <div className="p-3.5 bg-emerald-50/70 rounded-xl border border-emerald-100">
              <div className="text-[11px] font-bold text-emerald-800">Highest Score</div>
              <div className="text-xl font-extrabold text-emerald-900 mt-0.5">
                {stats.highestPercentage}%
              </div>
              <div className="text-[10px] text-emerald-600 font-medium">Top performance</div>
            </div>

            <div className="p-3.5 bg-amber-50/70 rounded-xl border border-amber-100">
              <div className="text-[11px] font-bold text-amber-800">Lowest Score</div>
              <div className="text-xl font-extrabold text-amber-900 mt-0.5">
                {stats.lowestPercentage}%
              </div>
              <div className="text-[10px] text-amber-600 font-medium">Needs review</div>
            </div>

            <div className="p-3.5 bg-purple-50/70 rounded-xl border border-purple-100">
              <div className="text-[11px] font-bold text-purple-800">Pass Rate (≥50%)</div>
              <div className="text-xl font-extrabold text-purple-900 mt-0.5">
                {stats.passRate}%
              </div>
              <div className="text-[10px] text-purple-600 font-medium">
                Across {stats.subjectsCount} subjects
              </div>
            </div>
          </div>

          {/* Subject Average Distribution */}
          {subjectBreakdown.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <BookOpen className="w-3.5 h-3.5 text-blue-600" />
                <span>Subject Performance Summary</span>
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {subjectBreakdown.map((sub) => (
                  <div
                    key={sub.name}
                    className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between gap-3"
                  >
                    <div>
                      <div className="text-xs font-bold text-slate-800">{sub.name}</div>
                      <div className="text-[10px] text-slate-400 font-mono">
                        {sub.count} assessment{sub.count > 1 ? 's' : ''} recorded
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-16 bg-slate-200 rounded-full h-2 overflow-hidden">
                        <div
                          className={`h-full rounded-full ${
                            sub.average >= 70 ? 'bg-emerald-500' : sub.average >= 50 ? 'bg-amber-500' : 'bg-rose-500'
                          }`}
                          style={{ width: `${Math.min(100, sub.average)}%` }}
                        />
                      </div>
                      <span className="text-xs font-extrabold text-slate-900 w-10 text-right">
                        {sub.average}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Detailed Score Timeline Table */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-indigo-600" />
              <span>Assessment History Records ({rawHistory.length})</span>
            </h4>

            <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-2xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200 text-[10px] uppercase tracking-wider">
                    <tr>
                      <th className="px-3.5 py-2.5">Assessment Details</th>
                      <th className="px-3.5 py-2.5">Subject</th>
                      <th className="px-3.5 py-2.5 text-center">Score / Max</th>
                      <th className="px-3.5 py-2.5 text-center">Grade</th>
                      <th className="px-3.5 py-2.5">Teacher Feedback</th>
                      <th className="px-3.5 py-2.5 text-right">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {rawHistory.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                          No assessment scores have been recorded for this student yet.
                        </td>
                      </tr>
                    ) : (
                      rawHistory.map(({ score, assessment, subject }) => {
                        const max = assessment.maximum_score || 100;
                        const pct = max > 0 ? Math.round((score.score / max) * 100) : 0;
                        const recorder = staffMap.get(score.recorded_by) || 'Teacher';

                        return (
                          <tr key={score.id} className="hover:bg-slate-50/70 transition">
                            <td className="px-3.5 py-2.5">
                              <div className="font-bold text-slate-900">{assessment.title}</div>
                              <span className="text-[10px] uppercase font-bold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200">
                                {assessment.assessment_type}
                              </span>
                            </td>
                            <td className="px-3.5 py-2.5 font-semibold text-slate-700">
                              {subject?.name || 'General'}
                            </td>
                            <td className="px-3.5 py-2.5 text-center">
                              <span className="font-extrabold text-slate-900 text-sm">
                                {score.score}
                              </span>
                              <span className="text-slate-400 text-[11px]"> / {max}</span>
                            </td>
                            <td className="px-3.5 py-2.5 text-center">{getGradePill(pct)}</td>
                            <td className="px-3.5 py-2.5">
                              {score.feedback ? (
                                <span className="text-slate-700 italic">"{score.feedback}"</span>
                              ) : (
                                <span className="text-slate-300">—</span>
                              )}
                              <div className="text-[10px] text-slate-400">
                                Marked by {recorder}
                              </div>
                            </td>
                            <td className="px-3.5 py-2.5 text-right font-mono text-slate-500 whitespace-nowrap">
                              {assessment.assessment_date}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-end shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-bold rounded-xl transition"
          >
            Close Profile
          </button>
        </div>
      </div>
    </div>
  );
};
